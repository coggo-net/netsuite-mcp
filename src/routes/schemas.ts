import { z } from "zod";

export const nsRef = z
	.object({ id: z.string() })
	.describe("Reference by internal ID");

const lotReceiptRef = z
	.object({
		id: z
			.string()
			.optional()
			.describe("Existing inventoryNumber record id (for re-receiving a lot)"),
		refName: z
			.string()
			.optional()
			.describe(
				"New lot/serial number string — NetSuite auto-creates the inventoryNumber master record",
			),
	})
	.describe(
		"Lot reference for inbound transactions. Provide id for an existing lot, or refName to auto-create a new one. Fallback: if refName auto-create is rejected by NetSuite (INVALID_VALUE / USER_ERROR — known to happen on standalone Vendor Bills under some account configs), pre-create the inventoryNumber via inventory_lot_create and pass {id: '<returned-id>'} instead.",
	);

const inventoryAssignmentItem = z.object({
	quantity: z.number().describe("Quantity assigned to this lot"),
	issueInventoryNumber: nsRef
		.optional()
		.describe(
			"OUTBOUND only (Sales Order / PI / Invoice / outbound Inventory Adjustment). Existing lot record id — use the id returned by inventory_search_lot_numbers.",
		),
	receiptInventoryNumber: lotReceiptRef
		.optional()
		.describe(
			"INBOUND only (Purchase Order receipt / Vendor Bill / Item Receipt / inbound Inventory Adjustment). Use {id} to reference an existing lot, or {refName} to create a new lot.",
		),
	expirationDate: z.string().optional().describe("Lot expiration (YYYY-MM-DD)"),
	binNumber: nsRef.optional().describe("Bin reference"),
	inventoryStatus: nsRef.optional().describe("Inventory status reference"),
});

const inventoryDetail = z
	.object({
		quantity: z
			.number()
			.describe(
				"MUST equal the line quantity. If omitted NetSuite silently drops inventoryAssignment.items.",
			),
		inventoryAssignment: z
			.object({ items: z.array(inventoryAssignmentItem) })
			.describe(
				"Lot/serial assignments. Sum of items[].quantity must equal inventoryDetail.quantity.",
			),
	})
	.describe(
		"Lot/serial assignment subrecord for lot-tracked items. Required at PI time for outbound (issueInventoryNumber); required at receipt time for inbound (receiptInventoryNumber).",
	);

const transactionLineItem = z.object({
	item: nsRef.describe("Item reference"),
	quantity: z.number().describe("Quantity"),
	rate: z.number().optional().describe("Unit price"),
	amount: z.number().optional().describe("Line total (auto-calculated)"),
	description: z.string().optional().describe("Line description override"),
	location: nsRef.optional().describe("Line-level location"),
	taxCode: nsRef.optional().describe("Tax code"),
	department: nsRef.optional().describe("Department"),
	units: z.string().optional().describe("Units"),
	inventoryDetail: inventoryDetail
		.optional()
		.describe(
			"Lot/serial assignment for lot-tracked items. Use inventory_search_lot_numbers first to get lot ids. The API layer will FIFO-auto-assign if omitted for a lot-tracked item.",
		),
});

export const lineItems = z
	.object({ items: z.array(transactionLineItem) })
	.describe("Line items");

const adjustmentLineItem = z.object({
	item: nsRef.describe("Item reference"),
	adjustQtyBy: z.number().describe("Quantity to adjust by"),
	location: nsRef.optional().describe("Location"),
});

const transferLineItem = z.object({
	item: nsRef.describe("Item reference"),
	adjustQtyBy: z.number().describe("Quantity to transfer"),
});

const receiptLineItem = z.object({
	item: nsRef.describe("Item being received"),
	quantity: z.number().describe("Quantity received"),
	location: nsRef.optional().describe("Receiving location"),
	inventoryDetail: inventoryDetail
		.optional()
		.describe(
			"Lot/serial assignment for lot-tracked items. Use receiptInventoryNumber: provide {refName} to auto-create a new lot, or {id} to receive against an existing lot.",
		),
});

export const customerBody = z
	.object({
		companyName: z
			.string()
			.optional()
			.describe("Legal company name (required for company customers)"),
		isPerson: z
			.boolean()
			.optional()
			.describe("true for individual, false for company"),
		firstName: z
			.string()
			.optional()
			.describe("First name (required if isPerson)"),
		lastName: z
			.string()
			.optional()
			.describe("Last name (required if isPerson)"),
		email: z.string().optional().describe("Primary email address"),
		phone: z.string().optional().describe("Primary phone number"),
		entityId: z
			.string()
			.optional()
			.describe("Customer ID/number (auto-generated if omitted)"),
		subsidiary: nsRef.optional().describe("Subsidiary"),
		currency: nsRef.optional().describe("Primary currency"),
		terms: nsRef.optional().describe("Payment terms"),
		category: nsRef.optional().describe("Customer category"),
		salesRep: nsRef.optional().describe("Assigned sales rep (employee)"),
		creditLimit: z.number().optional().describe("Credit limit amount"),
		taxable: z.boolean().optional().describe("Whether customer pays sales tax"),
		isInactive: z
			.boolean()
			.optional()
			.describe("Inactive flag (defaults to false)"),
		comments: z.string().optional().describe("Comments"),
	})
	.describe("Customer record");

export const customerBodyPartial = customerBody.partial();

export const inventoryItemBody = z
	.object({
		itemId: z.string().optional().describe("Item name/number (SKU)"),
		displayName: z.string().optional().describe("Display name shown in UI"),
		description: z.string().optional().describe("General description"),
		purchaseDescription: z
			.string()
			.optional()
			.describe("Description on purchase orders"),
		salesDescription: z
			.string()
			.optional()
			.describe("Description on sales transactions"),
		cost: z.number().optional().describe("Purchase price"),
		subsidiary: nsRef.optional().describe("Subsidiary"),
		incomeAccount: nsRef.optional().describe("Income GL account"),
		cogsAccount: nsRef.optional().describe("COGS GL account"),
		assetAccount: nsRef.optional().describe("Asset GL account"),
		taxSchedule: nsRef.optional().describe("Tax schedule"),
		unitsType: nsRef.optional().describe("Unit of measure type"),
		weight: z.number().optional().describe("Item weight"),
		upcCode: z.string().optional().describe("UPC/barcode"),
		isInactive: z.boolean().optional().describe("Inactive flag"),
		isOnline: z.boolean().optional().describe("Display in web store"),
	})
	.describe("Inventory item record");

export const inventoryItemBodyPartial = inventoryItemBody.partial();

export const inventoryAdjustmentBody = z
	.object({
		subsidiary: nsRef.describe("Subsidiary"),
		account: nsRef.describe("Adjustment GL account"),
		adjLocation: nsRef.optional().describe("Location for adjustment"),
		tranDate: z.string().optional().describe("Date in YYYY-MM-DD format"),
		memo: z.string().optional().describe("Reason for adjustment"),
		inventory: z
			.object({ items: z.array(adjustmentLineItem) })
			.describe("Adjustment lines"),
	})
	.describe("Inventory adjustment");

export const inventoryTransferBody = z
	.object({
		subsidiary: nsRef.describe("Subsidiary"),
		location: nsRef.describe("Source location"),
		transferLocation: nsRef.describe("Destination location"),
		tranDate: z.string().optional().describe("Date in YYYY-MM-DD format"),
		memo: z.string().optional().describe("Transfer notes"),
		inventory: z
			.object({ items: z.array(transferLineItem) })
			.describe("Transfer lines"),
	})
	.describe("Inventory transfer");

export const salesOrderBody = z
	.object({
		entity: nsRef.describe("Customer"),
		subsidiary: nsRef.optional().describe("Subsidiary"),
		tranDate: z.string().optional().describe("Transaction date (YYYY-MM-DD)"),
		memo: z.string().optional().describe("Memo/notes"),
		currency: nsRef.optional().describe("Transaction currency"),
		exchangeRate: z
			.number()
			.optional()
			.describe("Exchange rate to base currency"),
		location: nsRef.optional().describe("Warehouse location"),
		department: nsRef.optional().describe("Department"),
		salesRep: nsRef.optional().describe("Sales representative"),
		customForm: nsRef
			.optional()
			.describe("Custom form (use PI form for Pro-Forma Invoices)"),
		shipDate: z.string().optional().describe("Expected ship date (YYYY-MM-DD)"),
		terms: nsRef.optional().describe("Payment terms"),
		item: lineItems.optional(),
	})
	.describe("Sales order / Pro-Forma Invoice");

export const salesOrderBodyPartial = salesOrderBody.partial();

export const invoiceBody = z
	.object({
		entity: nsRef.describe("Customer"),
		subsidiary: nsRef.optional().describe("Subsidiary"),
		tranDate: z.string().optional().describe("Invoice date (YYYY-MM-DD)"),
		dueDate: z.string().optional().describe("Payment due date (YYYY-MM-DD)"),
		memo: z.string().optional().describe("Invoice memo"),
		currency: nsRef.optional().describe("Currency"),
		exchangeRate: z.number().optional().describe("Exchange rate"),
		department: nsRef.optional().describe("Department"),
		location: nsRef.optional().describe("Location"),
		salesRep: nsRef.optional().describe("Sales rep"),
		terms: nsRef.optional().describe("Payment terms"),
		account: nsRef.optional().describe("A/R account"),
		createdFrom: nsRef.optional().describe("Source sales order / PI ID"),
		item: lineItems.optional(),
	})
	.describe("Invoice");

export const invoiceBodyPartial = invoiceBody.partial();

export const purchaseOrderBody = z
	.object({
		entity: nsRef.describe("Vendor"),
		subsidiary: nsRef.optional().describe("Subsidiary"),
		tranDate: z.string().optional().describe("PO date (YYYY-MM-DD)"),
		dueDate: z
			.string()
			.optional()
			.describe("Expected delivery date (YYYY-MM-DD)"),
		memo: z.string().optional().describe("PO memo/notes"),
		currency: nsRef.optional().describe("Currency"),
		exchangeRate: z.number().optional().describe("Exchange rate"),
		location: nsRef.optional().describe("Receiving location"),
		department: nsRef.optional().describe("Department"),
		employee: nsRef.optional().describe("Purchaser"),
		terms: nsRef.optional().describe("Payment terms"),
		shipDate: z.string().optional().describe("Expected ship date (YYYY-MM-DD)"),
		item: lineItems.optional(),
	})
	.describe("Purchase order");

export const purchaseOrderBodyPartial = purchaseOrderBody.partial();

export const vendorBillBody = z
	.object({
		entity: nsRef.describe("Vendor"),
		subsidiary: nsRef.optional().describe("Subsidiary"),
		tranId: z
			.string()
			.optional()
			.describe("Bill / supplier invoice reference number"),
		tranDate: z.string().optional().describe("Bill date (YYYY-MM-DD)"),
		dueDate: z.string().optional().describe("Payment due date (YYYY-MM-DD)"),
		memo: z.string().optional().describe("Bill memo/notes"),
		currency: nsRef.optional().describe("Currency"),
		exchangeRate: z.number().optional().describe("Exchange rate"),
		department: nsRef.optional().describe("Department"),
		location: nsRef.optional().describe("Location"),
		terms: nsRef.optional().describe("Payment terms"),
		account: nsRef.optional().describe("A/P account"),
		approvalStatus: nsRef.optional().describe("Approval status"),
		createdFrom: nsRef.optional().describe("Source purchase order ID"),
		userTotal: z
			.number()
			.optional()
			.describe("User-entered total for verification"),
		item: lineItems.optional(),
	})
	.describe("Vendor bill (supplier invoice)");

export const vendorBillBodyPartial = vendorBillBody.partial();

export const vendorBillFromPOBody = z
	.object({
		purchaseOrderId: z.string().describe("Source purchase order internal ID"),
		tranId: z
			.string()
			.optional()
			.describe("Bill / supplier invoice reference number"),
		tranDate: z.string().optional().describe("Bill date (YYYY-MM-DD)"),
		dueDate: z.string().optional().describe("Payment due date (YYYY-MM-DD)"),
		memo: z.string().optional().describe("Bill memo/notes"),
		userTotal: z
			.number()
			.optional()
			.describe("User-entered total for verification"),
	})
	.describe("Vendor bill created by transforming a purchase order");

export const itemReceiptBody = z
	.object({
		createdFrom: nsRef.describe("Source purchase order ID"),
		tranDate: z.string().optional().describe("Receipt date (YYYY-MM-DD)"),
		memo: z.string().optional().describe("Receipt notes"),
		item: z
			.object({ items: z.array(receiptLineItem) })
			.optional()
			.describe("Receipt lines"),
	})
	.describe("Item receipt");
