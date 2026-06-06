# Create Vendor Bill from Supplier Invoice + Unstuffing Sheet

## Trigger

When the user uploads or pastes a supplier invoice (PDF / image / text), or a warehouse unstuffing / receiving check list, asking to enter the supplier bill in NetSuite. The user typically supplies either:
- An **invoice PDF** alone (no lot info on the doc),
- An **unstuffing sheet** alone (no invoice number / amount on the doc), or
- **Both** (most reliable).

## Workflow

### Step 1: Extract data from each document

From the **supplier invoice** capture: vendor name, invoice/reference number (`tranId`), invoice date, payment terms, currency, line items (description, qty per CTN, unit rate, total amount). Most fields below come from here.

From the **unstuffing / receiving check list** capture: container/seal ref, customs status, receiving date, warehouse signer, and per-line — **Lot/Batch number** (column 2; the SBLF prefix is implied by the column header on this template — see TBL/Asia Pacific Hub format), **BOT** (carton count, e.g. 6 / 12 / 24), **ML** (volume in ml, e.g. 700 / 750 / 1000 / 4500), **ACL%** (alcohol %), **TYPE OF FILLING** (REF = refillable / NRF = non-refillable), **NUMBER CODED** (CODED vs DECODED), **TOTAL QTY** (CTN), and pallet breakdown in REMARKS.

Item SKUs in this account follow the pattern: `<BRAND> <VARIANT> - <CODED|DECODED> <BOT>/<ML in cl>/<ACL%> <REF|NRF>[/<GBX>]`. Convert ml→cl when matching SKU (e.g. 750ml → "75", 1000ml → "100").

Present the extracted data to the user for verification before any NetSuite call.

### Step 2: Match vendor

If the invoice names the vendor: `vendor_search` by company name. If `q` returns `NONEXISTENT_FIELD`, fall back to `metadata_get` for `vendor` and pick a `filterable` field (`entityId`, `altName`).

If the unstuffing sheet does NOT name a vendor (common when the receiving warehouse only signs for the goods), discover candidates from history. Use SuiteQL to find vendors that previously billed the same item — joining `transaction` × `transactionline`:

```
SELECT t.entity, COUNT(*) AS n, MAX(t.trandate) AS last_seen
FROM transaction t JOIN transactionline tl ON tl.transaction = t.id
WHERE t.type='VendBill' AND tl.item IN (<candidate item ids>)
GROUP BY t.entity ORDER BY MAX(t.trandate) DESC
```

Resolve the top one or two entity ids with `vendor_get` and ask the user to confirm.

### Step 3: Match item

`inventory_search` by brand keyword (e.g. "Bombay Sapphire"). Multiple candidates almost always come back — the differentiator is the BOT/ML/ACL/CODED tuple from Step 1.

If no candidate matches the tuple exactly (e.g. unstuffing sheet says 42% but inventory only has 40% and 47%), STOP and ask the user — paper handwriting commonly conflates similar digits. Do not guess.

Confirm the chosen SKU with the user before continuing.

### Step 4: Match location, subsidiary, currency, A/P account

- `location_search` by warehouse name (e.g. "Duties Unpaid" → typically location id 2 for ex-bond receipts).
- `subsidiary_search` by customer name from the unstuffing sheet (e.g. "REJO" → "Rejo Beverages Pte Ltd").
- Currency comes from the vendor (`vendor_get` → `currency.refName`), or from the invoice.
- `account_search` matches `fullName` — pass a single short keyword like "Payable" then filter the candidates by `acctType.id == "AcctPay"`.

### Step 5: Duplicate check

`vendor_bill_search` with the invoice's `tranId`. If a bill with the same `tranId` already exists, do NOT post a new one — show the existing bill (vendor, location, item, lot, qty, status) and ask the user how to proceed.

If the supplier invoice number is on a paper invoice and the tranId is missing or not yet known, also try `vendor_bill_search` on the container/seal reference (it usually appears in the bill header `memo`).

### Step 6: Derive missing numeric fields from history

If unit rate is not on the invoice, pull the latest historical rate for the same vendor × item:

```
SELECT tl.rate, t.trandate, t.tranid, tl.quantity, tl.foreignamount
FROM transaction t JOIN transactionline tl ON tl.transaction = t.id
WHERE t.type='VendBill' AND t.entity = <vendor> AND tl.item = <item>
ORDER BY t.trandate DESC
```

Show the user the trailing rates and confirm before reusing. If you have to pick a `tranId` (rare — invoices usually carry their own number), look up the highest `tranid` matching the vendor's known pattern and bump by 1, then confirm the next number isn't already taken with a `transaction WHERE tranid = '<next>'` query.

### Step 7: Confirm with the user

Show a summary table (vendor, subsidiary, tranId, dates, currency, location, memo, item line with rate × qty = amount, lot string) and wait for explicit confirmation.

### Step 8a: Create — **non-lot-tracked items**

`vendor_bill_create` directly:

```json
{
  "entity": {"id": "<vendor>"},
  "subsidiary": {"id": "1"},
  "tranId": "<invoice number>",
  "tranDate": "<YYYY-MM-DD>",
  "dueDate": "<YYYY-MM-DD>",
  "memo": "<container/seal ref>",
  "currency": {"id": "<currency id>"},
  "location": {"id": "<warehouse id>"},
  "userTotal": <total>,
  "item": {
    "items": [
      {"item": {"id": "<item>"}, "quantity": <qty>, "rate": <rate>, "location": {"id": "<warehouse>"}, "description": "<SKU description>"}
    ]
  }
}
```

### Step 8b: Create — **lot-tracked items** (PO → Item Receipt → Vendor Bill)

Most accounts block inline lot creation on standalone vendor bills (NetSuite returns `INVALID_VALUE` on `receiptInventoryNumber`) and also block `inventory_lot_create` (`"cannot create a standalone inventory number record"`). The only reliable path is to land the lot on an Item Receipt:

1. `purchase_order_create` — same header as the bill, line item with `rate` and `location`. Capture the returned PO id.
2. `purchase_order_receive` — transform the PO into an Item Receipt. Each receipt line MUST include `orderLine: <1-based PO line index>`; without it NetSuite refuses to mutate the pre-populated item sublist (`USER_ERROR "invalid sublist or line item operation"`). Attach the lot:

   ```json
   {
     "createdFrom": {"id": "<po id>"},
     "tranDate": "<YYYY-MM-DD>",
     "memo": "<container ref>",
     "item": {
       "items": [{
         "orderLine": 1,
         "item": {"id": "<item>"},
         "quantity": <qty>,
         "location": {"id": "<warehouse>"},
         "inventoryDetail": {
           "quantity": <qty>,
           "inventoryAssignment": {
             "items": [{"quantity": <qty>, "receiptInventoryNumber": "<LOT STRING>"}]
           }
         }
       }]
     }
   }
   ```

   **`receiptInventoryNumber` is a plain string** (e.g. `"SBLF2672"`) — NOT `{refName}` or `{id}`. The lot is BORN here.

3. `vendor_bill_create_from_po` — transform the PO into the bill, overriding only the header fields you need:

   ```json
   {
     "purchaseOrderId": "<po id>",
     "tranId": "<invoice number>",
     "tranDate": "<YYYY-MM-DD>",
     "dueDate": "<YYYY-MM-DD>",
     "memo": "<container ref>",
     "userTotal": <total>
   }
   ```

   Lines and lot inherit from the PO. Verify with `vendor_bill_get` + the sub-resource `/item?expandSubResources=true` to confirm the lot landed.

### Step 9: Report back

Provide the bill internal id, tranId, and a NetSuite UI link in the form `https://<accountId>.app.netsuite.com/app/accounting/transactions/vendbill.nl?id=<billId>`. If you took the PO path, also report the PO and Item Receipt ids and their URLs (`purchord.nl` / `itemrcpt.nl`).

## Important Notes

- Always verify extracted data with the user before any create call. Receiving sheets are handwritten; column readings can be ambiguous (e.g. 40 vs 42 vs 47 for ACL%).
- Never recreate a bill whose `tranId` already exists — NetSuite enforces uniqueness and you may also clobber a Paid-In-Full record's history.
- Don't trust SKU candidates that don't match the BOT/ML/ACL/CODED tuple exactly; ask the user instead.
- Store the container / seal reference in the bill `memo` field — that's the convention in this account for cross-referencing receiving paperwork.
- If a standalone vendor bill fails with `INVALID_VALUE` on `receiptInventoryNumber`, do NOT try `inventory_lot_create` next — it almost certainly fails the same way. Go straight to the PO → Receipt → Bill flow.
- Default subsidiary id is `"1"` (Rejo Beverages Pte Ltd) unless the user specifies otherwise.
