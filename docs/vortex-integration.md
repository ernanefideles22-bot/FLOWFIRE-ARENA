# Vortex integration — controlled rollout

Current state: match pairing and display have been tested for 1v1, 2v2, and 4v4. **This does not validate Vortex room formats.**

## Preconditions
1. Verify the Vortex provider supports each of the requested formats, and document the exact request field(s) and allowed values. Do not infer that a 4v4 room can be configured as 1v1 or 2v2.
2. Confirm account authorization and whether room creation consumes credits.
3. Keep `VORTEX_TOKEN` and `ADMIN_API_KEY` on the server only.
4. Implement an admin-only, feature-flagged room creation action with an idempotent match lock. Never create a room on page refresh or match-status polling.
5. Save the Vortex session ID and room credentials transactionally; prevent concurrent duplicate creations and provide retry/reconciliation for ambiguous provider timeouts.
6. Restrict room credentials to authenticated players on either team, never public URLs.
7. Poll result shortly after the match ends, within the provider retention window; validate the result shape and persist the raw result before declaring a winner.
8. Implement rate limiting, audit logs, error handling and cleanup/release of rooms.
9. Validate the provider's terms and applicable legal requirements before enabling paid entry or prizes.

## Read-only diagnostics
`GET /api/admin/vortex-readiness` requires the `x-admin-key` request header and checks PostgreSQL and Vortex balance without creating a room.

## Known gaps
- Vortex 1v1 / 2v2 / 4v4 configuration is **unverified**.
- Room creation, room start, result retrieval, and release are **not enabled**.
- Payments remain **disabled**.
