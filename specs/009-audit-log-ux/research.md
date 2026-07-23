# Research: Audit Log Operator UX

**Feature**: 009-audit-log-ux
**Date**: 2026-07-17

## R-001: How to build a time-ordered, paginated index on top of Record Storage

**The question**: `AuditStore.listAuditEntries()` today scans the entire workspace keyspace via `getAllKeys()` and does a sequential `getValue()` per matching key. Fixing this needs some form of time-ordered index so a page read touches only the entries it needs — but what does `@sr-connect/record-storage` actually support?

**Investigation**: Inspected `Backend/node_modules/@sr-connect/record-storage/{types,index}.d.ts` directly rather than assuming.

Findings:
- The full API surface is `getValue`, `setValue`, `valueExists`, `deleteValue`, `getAllKeys` — flat key/value operations only.
- `getAllKeys({ lastEvaluatedKey })` supports pagination via an opaque continuation cursor, but **the type surface gives no guarantee of sort order** — this matches `AuditStore.ts`'s own migration note ("DynamoDB table `ems-audit`... GSI on timestamp for recent-queries"), implying the underlying primitive is a **Scan**, not an ordered **Query** — Scan order is not meaningful or reliable to build pagination logic on.
- `setValue` has a `denyUpdateOverwrite` option (used elsewhere via `KeyValueStore.trySet` for insert-only writes), but there is **no compare-and-swap / conditional-update-on-existing-value** primitive. Updating an existing key is always a blind overwrite — whoever's `setValue()` call lands last wins, with no conflict signal.

**Decision**: Build the index as **hour-bucketed pointer records** — a small set of Record Storage keys (e.g. `ems-audit-idx-{YYYYMMDDHH}`), each holding a JSON array of that hour's audit entry `requestId`s in newest-first order. `writeAudit()` additionally reads the current hour's bucket, prepends the new id, and writes it back (sharing the entry's 90-day TTL). Reading a page walks backward bucket-by-bucket (current hour, then the previous hour, and so on) collecting ids until enough are gathered for the requested page, then does a batched `getValue` per id for just those entries — not a keyspace scan.

**Rationale**:
- Bounds each index record's size to one hour's worth of activity, not 90 days' worth in one growing record.
- Read cost for a page is proportional to "how many buckets does it take to fill this page," not total historical volume — this is what actually fixes the timeout.
- No new platform primitive required — pure application-level composition of `get`/`set`, matching how this codebase already builds every other Platform store.

**Alternatives considered**:
- *Single global growing index record.* Rejected — unbounded size (eventually exceeds practical record-value limits), and every audit write in the entire workspace would contend on read-modify-writing the same one record, a much worse concurrency hazard than per-bucket contention.
- *Rely on `getAllKeys` returning keys in a useful order and construct lexically-sortable keys (e.g. reverse-timestamp prefix).* Rejected — the type surface and the store's own DynamoDB-Scan-shaped migration note give no basis to assume `getAllKeys` respects key ordering; building pagination logic on an unspecified ordering is fragile even if it happens to work today.
- *Day-bucketed instead of hour-bucketed.* Considered and rejected in favor of hour buckets — a day bucket is simpler (fewer buckets to walk on a quiet day) but concentrates far more concurrent-write contention into one record during a busy day (e.g., a check-in rush), and grows larger before its TTL clears it. Hour buckets trade a few more bucket-walks on read for meaningfully less write contention and a smaller per-record footprint.

**Accepted risk**: two audit writes landing in the **same hour bucket** at effectively the same moment can race (both read the bucket's current array, both append, whichever `setValue()` lands last wins — the other's index entry is silently dropped from that bucket). This does **not** lose the audit entry itself (it has its own independently-written, durable key) — only its presence in the fast-path index could rarely be missed, meaning it wouldn't surface in a paged read until enough surrounding context makes it moot, or in the worst case not at all via the index path. Given ScriptRunner Connect's per-request execution model, this collision window is narrow (the read-modify-write round trip, not the whole hour), and audit-log activity in this app is not sustained-high-throughput. If this ever proves material in practice, a bounded retry-with-reread loop on the bucket update is a straightforward follow-up — not attempted here, since it adds complexity for a risk with no evidence of being a real problem at this app's scale.

## R-002: Where do Program/Event names for `resourceLabel` come from?

**Investigation**: Checked how existing code resolves a Program/Event by id — `Utils/Catalog.ts`'s `resolveCatalogEvent`/`resolveCatalogEventById` wrap `CatalogAdapter.getProgram(id)`/`getEvent(id)` (`Utils/HubSpot/CatalogAdapter.ts`), which read the HubSpot Program/Event custom objects directly — there is no Record-Storage-side catalog name cache.

**Decision**: `resourceLabel` resolution calls `CatalogAdapter.getProgram`/`getEvent` **directly** (not the throwing `resolveCatalogEvent*` route-guard wrappers) — the adapter methods themselves return `null` on not-found (confirmed in `CatalogAdapter.ts`'s interface), which maps cleanly to FR-007's fallback label without needing to catch a thrown error. Resolution is deduped (distinct resourceIds on the current page only) and scoped strictly to the page being returned, per FR-008 — this keeps a real HubSpot dependency bounded to at most `pageSize` (usually far fewer, after dedup) lookups per request, never the full log.

**Alternatives considered**:
- *Cache Program/Event names in Record Storage, refreshed independently.* Rejected as unnecessary for this slice — adds a second freshness-management problem (see the attendee-index ADR-011/012 discussion for how much design weight that carries) for a lookup that's already cheap and bounded once scoped to a single page. Revisit only if per-page HubSpot latency for resourceLabel resolution proves material in practice.

## R-003: Does adding filters change the RBAC or audit-write surface?

**Investigation**: Reviewed `Frontend/docs/rbac.md`'s existing `audit/recent`/`events/{id}/audit` rows (admin-only) and `Utils/Audit.ts`'s existing `writeAudit`-family functions.

**Decision**: No RBAC change (filters are query parameters on an already-admin-gated route) and no new audited action (this feature changes how audit **reads** are served, not what gets written or who may write it). Confirmed in the plan's Constitution Check as N/A rows rather than skipped.
