# netsuite-mcp

NetSuite MCP server over Streamable HTTP. Exposes 75 tools for managing customers, vendors, inventory, sales orders, Pro-Forma Invoices, invoices, purchase orders, vendor bills, locations, GL accounts, and subsidiaries via the NetSuite REST API.

## Prerequisites

- NetSuite account with Token-Based Authentication (TBA) enabled
- Role permissions: REST Web Services, Log in using Access Tokens, and relevant transaction/record permissions

## Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```
NETSUITE_ACCOUNT_ID=1234567
NETSUITE_CONSUMER_KEY=your_consumer_key
NETSUITE_CONSUMER_SECRET=your_consumer_secret
NETSUITE_TOKEN_ID=your_token_id
NETSUITE_TOKEN_SECRET=your_token_secret
PORT=3000
```

## Run Locally

```bash
bun install
bun run start
```

Server starts at `http://localhost:3000/mcp`.

## Run with Docker

Build the image:

```bash
docker build -t netsuite-mcp .
```

Run the container:

```bash
docker run -d \
  --name netsuite-mcp \
  -p 3000:3000 \
  -e NETSUITE_ACCOUNT_ID=your_account_id \
  -e NETSUITE_CONSUMER_KEY=your_consumer_key \
  -e NETSUITE_CONSUMER_SECRET=your_consumer_secret \
  -e NETSUITE_TOKEN_ID=your_token_id \
  -e NETSUITE_TOKEN_SECRET=your_token_secret \
  netsuite-mcp
```

Or use an env file:

```bash
docker run -d \
  --name netsuite-mcp \
  -p 3000:3000 \
  --env-file .env \
  netsuite-mcp
```

Verify it's running:

```bash
curl http://localhost:3000/health
```

## MCP Endpoint

- **URL**: `http://localhost:3000/mcp`
- **Protocol**: MCP Streamable HTTP (POST/GET/DELETE)
- **Health check**: `http://localhost:3000/health`

## Available Tools (75)

| Module | Tools |
|---|---|
| **Customer** | customer_list, customer_get, customer_search, customer_search_sql, customer_create, customer_update, customer_delete |
| **Vendor** | vendor_list, vendor_get, vendor_search, vendor_create, vendor_update, vendor_delete |
| **Inventory** | inventory_list, inventory_get, inventory_search, inventory_query_stock, inventory_search_lot_numbers, inventory_lot_create, inventory_create, inventory_update, inventory_adjust, inventory_transfer |
| **Sales Order / PI** | sales_order_list, sales_order_get, sales_order_search, sales_order_search_sql, sales_order_create, sales_order_update, sales_order_delete, pi_list_recent, pi_search_sql |
| **Invoice** | invoice_list, invoice_get, invoice_search, invoice_search_sql, invoice_get_overdue, invoice_create, invoice_update, invoice_delete |
| **Purchase Order** | purchase_order_list, purchase_order_get, purchase_order_search, purchase_order_search_sql, purchase_order_create, purchase_order_update, purchase_order_delete, purchase_order_receive |
| **Vendor Bill** | vendor_bill_list, vendor_bill_get, vendor_bill_search, vendor_bill_search_sql, vendor_bill_get_overdue, vendor_bill_create, vendor_bill_create_from_po, vendor_bill_update, vendor_bill_delete |
| **Location** | location_list, location_get, location_search, location_create, location_update, location_delete |
| **Account** | account_list, account_get, account_search, account_create, account_update, account_delete |
| **Subsidiary** | subsidiary_list, subsidiary_get, subsidiary_search, subsidiary_create, subsidiary_update, subsidiary_delete |

## Development

```bash
bun run check    # lint + format (biome)
bun run start    # start server
```

### Fetch OpenAPI Spec

To re-fetch the NetSuite OpenAPI spec (requires valid credentials in `.env`):

```bash
bun scripts/fetch-openapi.ts
```
