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
	.describe(
		"Vendor bill created by transforming a purchase order. purchaseOrderId is the source purchase order internal ID; the other fields are optional header overrides sent to NetSuite's purchaseOrder -> vendorBill transform.",
	);

export const itemReceiptBody = z
	.object({
		createdFrom: nsRef.describe(
			"Source purchase order internal ID. The API uses this as the path id for NetSuite's purchaseOrder -> itemReceipt transform and does not send createdFrom in the transform body.",
		),
		tranDate: z.string().optional().describe("Receipt date (YYYY-MM-DD)"),
		memo: z.string().optional().describe("Receipt notes"),
		item: z
			.object({ items: z.array(receiptLineItem) })
			.optional()
			.describe("Receipt lines"),
	})
	.describe(
		"Item receipt created by transforming a purchase order. Provide createdFrom.id as the source PO id plus optional receipt header fields and receipt lines.",
	);

export const vendorBody = z
	.object({
		companyName: z
			.string()
			.optional()
			.describe("Legal company name (required for company vendors)"),
		isPerson: z
			.boolean()
			.optional()
			.describe("true for individual, false for company"),
		firstName: z.string().optional().describe("First name (if isPerson)"),
		lastName: z.string().optional().describe("Last name (if isPerson)"),
		middleName: z.string().optional().describe("Middle name"),
		salutation: z.string().optional().describe("Mr./Ms./..."),
		title: z.string().optional().describe("Job title"),
		entityId: z
			.string()
			.optional()
			.describe("Supplier ID/number (auto-generated if omitted)"),
		legalName: z
			.string()
			.optional()
			.describe("Legal name for tax/financial use"),
		altName: z.string().optional().describe("Alternate display name"),
		email: z.string().optional().describe("Primary email"),
		altEmail: z.string().optional().describe("Alternate email"),
		phone: z.string().optional().describe("Primary phone"),
		altPhone: z.string().optional().describe("Alternate phone"),
		mobilePhone: z.string().optional().describe("Mobile phone"),
		homePhone: z.string().optional().describe("Home phone"),
		fax: z.string().optional().describe("Fax number"),
		url: z.string().optional().describe("Web URL"),
		printOnCheckAs: z
			.string()
			.optional()
			.describe("Name printed on the Pay to the Order of line of checks"),
		subsidiary: nsRef.optional().describe("Primary subsidiary"),
		currency: nsRef.optional().describe("Primary currency"),
		terms: nsRef.optional().describe("Payment terms"),
		category: nsRef.optional().describe("Vendor category"),
		payablesAccount: nsRef.optional().describe("A/P account (account record)"),
		expenseAccount: nsRef.optional().describe("Default expense GL account"),
		defaultVendorPaymentAccount: nsRef
			.optional()
			.describe("Default payment account"),
		taxItem: nsRef.optional().describe("Tax item / tax code"),
		incoterm: nsRef.optional().describe("Incoterm"),
		workCalendar: nsRef.optional().describe("Work calendar"),
		taxIdNum: z
			.string()
			.optional()
			.describe("Tax ID number (SSN for individual)"),
		vatRegNumber: z.string().optional().describe("VAT registration number"),
		accountNumber: z
			.string()
			.optional()
			.describe("Account number the vendor uses for you"),
		creditLimit: z.number().optional().describe("Credit limit amount"),
		openingBalance: z
			.number()
			.optional()
			.describe("Opening balance of this vendor"),
		openingBalanceDate: z
			.string()
			.optional()
			.describe("Opening balance date (YYYY-MM-DD)"),
		openingBalanceAccount: nsRef
			.optional()
			.describe("GL account for opening balance"),
		is1099Eligible: z
			.boolean()
			.optional()
			.describe("Vendor requires annual 1099"),
		isJobResourceVend: z
			.boolean()
			.optional()
			.describe("Allow this vendor to be a resource on jobs/tasks"),
		emailTransactions: z
			.boolean()
			.optional()
			.describe("Prefer email for transaction delivery"),
		printTransactions: z
			.boolean()
			.optional()
			.describe("Prefer print for transaction delivery"),
		faxTransactions: z
			.boolean()
			.optional()
			.describe("Prefer fax for transaction delivery"),
		isInactive: z.boolean().optional().describe("Inactive flag"),
		comments: z.string().optional().describe("Comments / notes"),
		externalId: z.string().optional().describe("External ID for integrations"),
	})
	.describe("Vendor record");

export const vendorBodyPartial = vendorBody.partial();

export const locationBody = z
	.object({
		name: z.string().optional().describe("Location name (required for create)"),
		subsidiary: nsRef
			.optional()
			.describe(
				"Primary subsidiary (OneWorld accounts — required when creating)",
			),
		parent: nsRef.optional().describe("Parent location for hierarchy"),
		locationType: nsRef.optional().describe("Location type"),
		tranPrefix: z
			.string()
			.optional()
			.describe("Prefix used in auto-numbered transactions"),
		makeInventoryAvailable: z
			.boolean()
			.optional()
			.describe("On-hand stock at this location is available to sell"),
		defaultAllocationPriority: z
			.number()
			.optional()
			.describe("Default allocation priority"),
		latitude: z.number().optional().describe("Latitude (decimal)"),
		longitude: z.number().optional().describe("Longitude (decimal)"),
		isInactive: z.boolean().optional().describe("Inactive flag"),
		externalId: z.string().optional().describe("External ID for integrations"),
	})
	.describe("Location record");

export const locationBodyPartial = locationBody.partial();

export const accountBody = z
	.object({
		acctName: z
			.string()
			.optional()
			.describe("Account name (required for create)"),
		acctNumber: z
			.string()
			.optional()
			.describe("Account number (used for GL identification)"),
		acctType: nsRef
			.optional()
			.describe(
				"Account type — reference to an account type record (e.g. Bank, AcctRec, AcctPay, Expense, Income, COGS, OthCurrAsset, etc.)",
			),
		description: z.string().optional().describe("Account description"),
		parent: nsRef.optional().describe("Parent account (for hierarchy)"),
		subsidiary: nsRef
			.optional()
			.describe("Primary subsidiary (OneWorld accounts)"),
		currency: nsRef.optional().describe("Account currency"),
		department: nsRef.optional().describe("Department restriction"),
		location: nsRef.optional().describe("Location restriction"),
		class: nsRef.optional().describe("Class restriction"),
		billableExpensesAcct: nsRef
			.optional()
			.describe("Linked billable expenses account"),
		category1099Misc: nsRef.optional().describe("1099-MISC category"),
		openingBalance: z.number().optional().describe("Opening balance amount"),
		tranDate: z
			.string()
			.optional()
			.describe("Opening balance date (YYYY-MM-DD)"),
		isInactive: z.boolean().optional().describe("Inactive flag"),
		isSummary: z
			.boolean()
			.optional()
			.describe("Reporting-only summary account"),
		includeChildren: z
			.boolean()
			.optional()
			.describe("Share with all sub-subsidiaries"),
		eliminate: z
			.boolean()
			.optional()
			.describe("Intercompany elimination account"),
		revalue: z
			.boolean()
			.optional()
			.describe("Include in open-balance currency revaluation"),
		inventory: z
			.boolean()
			.optional()
			.describe("Track inventory balance for this Other Current Asset account"),
		reconcileWithMatching: z
			.boolean()
			.optional()
			.describe("Enable for Match Bank Data and Reconcile"),
		sBankName: z.string().optional().describe("Bank name (for bank accounts)"),
		sBankRoutingNumber: z
			.string()
			.optional()
			.describe("9-digit bank routing number"),
		sBankCompanyId: z
			.string()
			.optional()
			.describe("Bank account number (up to 20 digits)"),
		curDocNum: z
			.number()
			.optional()
			.describe("Next check number for this bank account"),
		externalId: z.string().optional().describe("External ID for integrations"),
	})
	.describe("GL account record");

export const accountBodyPartial = accountBody.partial();

export const subsidiaryBody = z
	.object({
		name: z
			.string()
			.optional()
			.describe("Subsidiary display name (required for create)"),
		legalName: z.string().optional().describe("Legal name for tax forms"),
		country: nsRef.optional().describe("Country reference"),
		state: z.string().optional().describe("State / province"),
		currency: nsRef.optional().describe("Base currency"),
		parent: nsRef.optional().describe("Parent subsidiary"),
		email: z.string().optional().describe("Return email"),
		fax: z.string().optional().describe("Fax number"),
		url: z.string().optional().describe("Web URL"),
		federalIdNumber: z
			.string()
			.optional()
			.describe("Tax identification number"),
		taxRegistrationNumber: z
			.string()
			.optional()
			.describe("Tax registration number"),
		isElimination: z
			.boolean()
			.optional()
			.describe("Mark as an elimination subsidiary"),
		showSubsidiaryName: z
			.boolean()
			.optional()
			.describe("Display subsidiary name with role in NetSuite UI"),
		isInactive: z.boolean().optional().describe("Inactive flag"),
		externalId: z.string().optional().describe("External ID for integrations"),
	})
	.describe("Subsidiary record");

export const subsidiaryBodyPartial = subsidiaryBody.partial();
