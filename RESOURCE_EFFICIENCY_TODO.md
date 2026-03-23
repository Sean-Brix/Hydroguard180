# Resource Efficiency Todo

## Goal

Improve resource efficiency across the HydroGuard180 system without changing user-facing functionality, data meaning, or access rules.

## System Map

### Frontend

- Runtime: React + Vite SPA built into `server/public`
- Routing: `src/app/routes.tsx`
- Public pages: Home, About, FAQ, Training, Contact
- Admin pages: Analytics, Water Monitoring, Resident Directory, FAQ Management, Alert Levels, Inquiries, Profile, User Management
- Shared alert UI: `AlertSystem` is mounted by both `PublicLayout` and `DashboardLayout`
- Real-time flow: `useWaterMonitoringSSE` subscribes to `/api/sse/water-monitoring`

### Backend

- Runtime: Express server in `server/src/server.js`
- ORM: Prisma client in `server/src/db.js`
- Main domains: auth, users, residents, water monitoring, alert levels, settings, audit logs, FAQs, inquiries
- Real-time flow: `server/src/routes/sse.js` broadcasts new water-monitoring records through a global `EventEmitter`

### Database

- Provider: MySQL via Prisma
- Main tables: `users`, `residents`, `water_monitoring`, `alert_levels`, `settings`, `audit_logs`, `faqs`, `inquiries`

## Baseline Hotspots

Items already improved in the current pass are marked as `resolved`.

- Frontend bundle is heavy: current production build emitted a main JS chunk around `1.8 MB` minified and `~511 kB` gzip.
- Static images are heavy: `hero-image.png` is about `2.27 MB`, `logo.png` about `2.02 MB`, and `city-hall.png` about `1.78 MB`.
- Route loading is eager: all public and dashboard pages are imported up front in `src/app/routes.tsx`. `resolved`
- MapLibre is imported directly in both `About.tsx` and `Contact.tsx`, so map code is bundled into the main app instead of only when those pages load. `resolved for initial bundle via route splitting`
- `AlertSystem` polls `/api/alert-levels/current` every 5 seconds; it is not using the existing SSE channel. `resolved`
- Some screens pull more data than they need:
  - `Analytics.tsx` requests `waterMonitoringAPI.getAll({ limit: 10000 })`
  - `WaterMonitoring.tsx` requests `limit: 1000`
  - `ResidentDirectory.tsx` and `UserManagement.tsx` load full tables and filter on the client
  - `Dashboard.tsx` calls multiple broad list endpoints on first load
- Backend query logging is always enabled in `server/src/db.js`, which adds avoidable I/O and console noise in normal runtime. `resolved`
- `getWaterMonitoringStats` loads all matching rows into memory and computes stats in Node instead of using database aggregation. `resolved`
- `recalculateAllWaterMonitoringAlertLevels` loads every monitoring row and updates records one by one.
- Auth middleware reads the full user record from the database on every authenticated request. `resolved`
- `src/main.tsx` registers `/sw.js`, but no `sw.js` exists in `public` or `server/public`, so every page load can trigger a failing request. `resolved`
- `src/app/utils/database.ts` appears to be an unused in-memory data layer and should be verified as dead code.

## Optimization Todo

### Phase 0: Baseline And Guardrails

- [ ] Capture baseline build output, largest assets, API response times, and common DB query counts before edits.
- [ ] Add a short smoke-test checklist for login, dashboard navigation, CRUD flows, SSE updates, and alert display.
- [ ] Record which pages must remain byte-for-byte equivalent in behavior after optimization.

### Phase 1: Frontend Payload Reduction

- [x] Convert route imports in `src/app/routes.tsx` to lazy-loaded route modules.
- [x] Lazy-load heavy page-only dependencies such as MapLibre screens and PDF export code paths.
- [ ] Compress or replace oversized PNG assets with smaller WebP/AVIF variants while preserving layout and branding.
- [x] Remove the broken service-worker registration or add a real `sw.js` only if offline support is truly required.
- [ ] Review shared UI dependencies and remove unused runtime imports that are not used anywhere in the app.

### Phase 2: Frontend Data Efficiency

- [ ] Replace broad list fetches with purpose-built API calls for dashboard summaries, latest reading, counts, and analytics.
- [ ] Move large-table filtering, pagination, and date-range filtering from the browser to the API where practical.
- [ ] Keep SSE-driven updates incremental so pages do not need full refresh fetches after every insert.
- [ ] Centralize current-alert state so we do not mix polling logic with multiple page-level data fetches.

### Phase 3: Backend Query Efficiency

- [x] Change Prisma logging to environment-aware logging so verbose `query` logs run only when intentionally enabled.
- [ ] Add lightweight summary endpoints for dashboard cards and analytics instead of returning full row sets.
- [x] Rework `getWaterMonitoringStats` to use Prisma aggregation or grouped queries instead of loading all rows into memory.
- [ ] Add pagination, search, and selective field retrieval to resident, user, inquiry, and water-monitoring endpoints.
- [ ] Review indexes for common filters and ordering paths such as status, created dates, and timestamp windows.

### Phase 4: Realtime And Alert Flow

- [ ] Evaluate moving current alert updates to the existing SSE stream to replace 5-second polling.
- [ ] Add SSE heartbeat and connection accounting so long-lived clients are easier to observe and cheaper to maintain.
- [ ] Cache alert-level thresholds in memory with explicit invalidation after updates, instead of reading them for every new water record.

### Phase 5: Heavy Maintenance Tasks

- [ ] Rewrite alert-level recalculation so it avoids per-row update loops when thresholds change.
- [ ] Audit auth middleware for leaner user reads while preserving security and role checks.
- [ ] Confirm `src/app/utils/database.ts` and any unused UI dependencies can be removed safely.

### Phase 6: Verification

- [ ] Rebuild and compare bundle sizes against baseline.
- [ ] Re-test login, public pages, dashboard pages, CRUD flows, exports, and SSE live updates.
- [ ] Verify no user-visible workflows changed apart from faster loading and lower resource usage.

## Recommended Execution Order

1. Baseline + smoke-test checklist
2. Frontend route splitting and asset compression
3. Dashboard/API summary endpoints and server-side pagination
4. Analytics/statistics query optimization
5. Alert polling and recalculation improvements
6. Cleanup of dead code and unused dependencies
