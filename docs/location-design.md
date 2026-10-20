# Location foundation

Implemented routes: `/school/location` and `/find-schools`.

## Current data flows

1. Device lookup is one-shot and user-initiated. `getCurrentPosition` has a 15-second acquisition timeout and a 20-second application wait limit, plus cancellation that ignores late callbacks. Denied permissions and unsupported browsers have a manual alternative. No location request runs on initial page load.
2. Nearby search keeps its exact origin in volatile page memory. The app rounds the origin to a tenth-degree grid and constructs a search rectangle with padding. Only this coarse rectangle goes in a POST body to the directory API; exact distance filtering happens in the browser. The approximate query area and IP/request metadata still reach the service/providers. Clearing the point is separate from revoking browser permission.
3. A school principal explicitly confirms a school point and visibility before saving. Coordinates are validated in JS, the API and SQL. Private points are shared with current authorised school members. Device-reported accuracy is informative, not proof of being at a school; GPS is not identity verification.
4. The public directory independently filters both verified status and explicit listing opt-in in a narrowly scoped security-definer RPC. It exposes only ID/name/area and rounded coordinates. Private tables and the previous workspace implementation cannot be executed/read directly by app roles. Staff cannot modify school points.
5. Edit/remove operations lock the school row and compare expected version. A private monotonic sequence prevents a stale version becoming current again after delete/recreate. Location audit details hold version/visibility, never coordinates. Privileged operators and provider backups retain their usual administrative/retention limits.
6. External maps load only through an explicit link to OpenStreetMap. It receives the selected school/preview coordinate, not the visitor's nearby origin. No map SDK, tile request, geocoding provider, API key or new paid integration is needed. Marker imports parse a full HTTPS URL locally, accepting only OpenStreetMap marker parameters and valid coordinate ranges.

## Limits

- Device location may come from GPS, Wi-Fi or other signals and can be wrong. Save only a checked school point, not someone's home. Accuracy and rounded public points make distance estimates approximate.
- Nearby cards show straight-line distance among loaded directory records, not driving routes or a guarantee that the globally closest result loaded first. Load more is explicit.
- This is an opt-in TermQuill directory, not an external catalogue of all schools. An empty result is expected before schools verify and choose to publish. Do not seed a real institution's location or auto-publish a school to populate the interface.
- Rounded public points remain identifiable school locations. School administrators must have authority to publish them. Turning listing off removes active results but cannot recall third-party copies.
- No continuous tracking, student/staff attendance, automated school verification, location-based access enforcement, location history or sending GPS to AI was implemented.
- Public directory request limiting is per-instance and bounded; broader durable abuse controls remain separate work.

## Future features

Reuse the location helpers for explicit, separately explained actions such as educational resource discovery, local events or route links. Select only data required for that action, define retention and permissions, and update privacy information. A browser's previously granted location permission is not a reason to start collecting it automatically. Do not turn the generic helper into a global tracker.

## Verification

Unit and DOM tests cover coordinate/range checks, permission denial, cancellation/late callbacks, private-by-default saves, explicit confirmation, no storage of search points, coarse query areas, distance ordering, marker-link restrictions and HTML escaping. Database tests cover access isolation, private/unverified exclusion, public response minimisation, opt-in, removal, stale edits and withdrawn verification. Hosted rollback-only smoke checks exercise the deployed SQL without leaving a school location or listing behind. Live production UI verification follows deployment; no real device location is collected by the agent.
