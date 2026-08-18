# Tiny catalog synchronization

The storefront reads PostgreSQL through Prisma. It never calls Tiny during a customer request.

| Field | Master source |
| --- | --- |
| `tinyId`, `sku`, `name`, `description` | Tiny |
| `price`, `compareAtPrice`, `stock`, `active` | Tiny |
| `images`, `variants` | Tiny |
| `departmentId`, `categoryId`, `brandId`, `classificationStatus` | Love Mimos / PostgreSQL |
| `shortDescription` on an existing product | Love Mimos / PostgreSQL |

Products match by `tinyId`. A unique SKU is only a conflict detector: if it belongs to another Tiny ID the item is sent to review and is never merged silently. New products receive no category, department, or brand automatically and start as `PENDING`, so they cannot be published before Love Mimos classifies them. Existing taxonomy fields are absent from every sync update.

`syncTinyProduct` replaces the complete Tiny-owned image and variant sets in one database transaction. This makes retries idempotent, preserves image order, removes stale Tiny images/variants, and does not delete the product. Inactive Tiny products are retained with `active=false`.

`syncTinyCatalog` paginates Tiny, continues after individual errors, records `TinySyncRun`, and uses a database lease to reject concurrent runs. The Vercel cron performs an incremental query every six hours; the protected endpoint also accepts a manual full or ID-scoped run. Both require a server-side bearer secret (`TINY_SYNC_SECRET`, falling back to Vercel `CRON_SECRET`).
