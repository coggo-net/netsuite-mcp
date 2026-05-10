# Create Pro-Forma Invoice from Customer PO

## Trigger

When a user uploads or pastes a customer Purchase Order (PDF, Excel, or text), process it to create a Pro-Forma Invoice (PI) in NetSuite.

## Workflow

### Step 1: Extract PO Data

Parse the customer's PO document to extract:

- **Customer identifier** — company name, customer ID, or any reference
- **Line items** — item descriptions, SKUs, quantities, and unit prices (if provided)
- **PO reference number** — to store in the PI memo field
- **Requested delivery date** — if specified

Present the extracted data to the user for verification before proceeding.

### Step 2: Match Customer

Search for the customer in NetSuite:

1. Use `customer_search` with the company name extracted from the PO
2. If no match, try `customer_search_sql` with partial name matching
3. If multiple matches are found, present them to the user to choose
4. If no match is found, ask the user whether to create a new customer or select an existing one manually

### Step 3: Match Items

For each line item on the PO:

1. Use `inventory_search` with the item description or SKU
2. If the PO uses the customer's part numbers (not our SKUs), ask the user to help identify the correct items
3. Confirm the matched items with the user, showing:
   - Our item ID (SKU)
   - Display name
   - The quantity requested

### Step 4: Check Stock Availability

Use `inventory_query_stock` with all matched item IDs to check availability:

- For each item, compare `quantityAvailable` against the requested quantity
- If **all items have sufficient stock**: proceed to Step 5
- If **any item has insufficient stock**: alert the user with a clear summary table:

| Item | Requested | Available | Shortfall |
|------|-----------|-----------|-----------|
| ...  | ...       | ...       | ...       |

Ask the user how to proceed:
- Continue anyway (create PI with full quantities, will fulfill when stock arrives)
- Adjust quantities to available stock
- Cancel

### Step 5: Confirm PI Creation

Present a summary of the PI to be created:

- **Customer**: [matched customer name and ID]
- **PO Reference**: [customer's PO number, stored in memo]
- **Date**: today
- **Line items**: table with item, quantity, rate, amount
- **Total**: calculated sum

Ask the user to confirm before creating.

### Step 6: Create the PI

Once confirmed, use `sales_order_create` with:

```json
{
  "entity": {"id": "<customer_id>"},
  "subsidiary": {"id": "1"},
  "tranDate": "<today YYYY-MM-DD>",
  "memo": "<customer PO reference number>",
  "currency": {"id": "<appropriate currency>"},
  "location": {"id": "<warehouse>"},
  "item": {
    "items": [
      {"item": {"id": "<item_id>"}, "quantity": <qty>, "rate": <price>}
    ]
  }
}
```

After creation, confirm success and provide the PI transaction ID to the user.

## Important Notes

- Always verify extracted data with the user before making any API calls
- Never create the PI without explicit user confirmation
- If the PO currency differs from the customer's default currency, flag this to the user
- Store the customer's PO number in the `memo` field for cross-reference
- If rates/prices are on the PO, use them; otherwise, let NetSuite apply default pricing
