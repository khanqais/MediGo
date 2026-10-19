# AGENTS.md

Compact developer and agent guide for MediGo / MediQuick.

---

## Commands & Verification

- **Tests (Vitest):** `npx vitest run` (there is no `"test"` script in `package.json`; running `npm test` fails).
  - Single test file: `npx vitest run tests/<file>.test.ts` (e.g. `npx vitest run tests/auth-callback.test.ts`)
- **Typecheck:** `npx tsc --noEmit`
- **Lint:** `npm run lint` (Next.js ESLint)
- **Production Build:** `npm run build`
- **Dev Server:** `npm run dev`
- **Consolidate Migrations:** `node scripts/build-schema.js` (regenerates `supabase/full_schema_for_dashboard.sql` from `supabase/migrations/`)
- **Smoke Test:** `node scripts/smoke/cancel-smoke.mjs` (strictly refuses to run unless `NEXT_PUBLIC_SUPABASE_URL` is localhost / 127.0.0.1)

---

## Environment & Build Quirks

- **Supabase Keys:**
  - `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL (hosted or `http://127.0.0.1:54321`).
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Browser / public key used in `@/lib/supabase/client`, `middleware`, and `server.ts`.
  - `SUPABASE_SERVICE_ROLE_KEY`: Server-only secret; used exclusively by `createAdminClient()` to bypass RLS. Never expose to client.
- **Production Compliance Guard (`next.config.mjs`):**
  - If `VERCEL_ENV=production` or `COMPLIANCE_CHECK=strict`, `next build` fails if any `NEXT_PUBLIC_*` compliance variable (`NEXT_PUBLIC_DRUG_LICENSE_NO`, `NEXT_PUBLIC_LICENSING_AUTHORITY`, `NEXT_PUBLIC_REGISTERED_ENTITY`, etc.) contains `"PENDING"` or is unset.
  - Development and normal local builds allow placeholder `"PENDING"` defaults.

---

## Architecture & Code Gotchas

- **Supabase Clients (`src/lib/supabase/`):**
  - `createClient()` in `server.ts`: Uses request cookies via `@supabase/ssr` for authenticated user operations.
  - `createAdminClient()` in `server.ts`: Uses `SUPABASE_SERVICE_ROLE_KEY` with empty cookies for trusted background / role / webhook tasks.
  - `createClient()` in `client.ts`: Browser client for client components.
- **Inventory Join Normalization:**
  - In Supabase / PostgREST queries joining `inventory`, the returned data can be either an object `{ stock_quantity, reserved_quantity }` or a single-element array `[{ stock_quantity, reserved_quantity }]`.
  - Never access `medicine.inventory.stock_quantity` directly. Always use `getInventory()`, `getStock()`, or `getAvailableStock()` from `@/lib/inventory`.
- **Order Status State Machine Drift:**
  - Order state transitions are enforced in both TypeScript (`src/lib/order-status.ts`) and PostgreSQL RPC (`supabase/migrations/` in `process_order_status_update`).
  - `tests/transitions.test.ts` dynamically parses migration files and asserts that `VALID_TRANSITIONS` matches SQL. If updating order states, update both or tests fail.
- **Role-Based Access Control (RBAC):**
  - Roles: `'customer' | 'admin' | 'pharmacist' | 'delivery'`.
  - Client input cannot set roles (`handle_new_user()` database trigger defaults to `'customer'`).
  - API routes enforce roles via `requireRole(['admin', ...])` or `verifyRole(...)` in `@/lib/auth/roles`.
  - Admin routes (`/admin`, `/api/admin/*`) require `'admin'` or `'pharmacist'`.
- **Sales Mode (`SALES_MODE`):**
  - Defaults to `otc_only`. Non-OTC medicines (Schedule H, H1, X) cannot be ordered or checked out unless `SALES_MODE=all` or `SALES_MODE=full`.
  - Logic lives in `@/lib/sales-mode.ts` and is enforced at order creation and validation endpoints.
- **Rate Limiting (`src/lib/rate-limit.ts`):**
  - Uses `failClosed: true` on sensitive routes (auth, password reset, coupons). In `NODE_ENV=development`, unknown IPs are permitted so local testing is unblocked.
