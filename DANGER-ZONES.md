# Danger Zone configuration

Configured from the user's 2026-11-04 instructions:

- Indoor: Canteen_B_South_Spine (Canteen B South Spine).
- Indoor: Garage_EEE (Garage EEE).
- Outdoor: center latitude 1.341917, longitude 103.680252; radius 25 meters.
- The green circle in the reference screenshot is not used.

The app's single shared location polling stream drives all danger-zone checks. There is no extra API polling loop, Worker migration or board-firmware change. Configuration and logic are in app/danger-zones.mjs.

Fresh confirmed Wi-Fi reports identify indoor danger zones by zone_id, with an exact-name fallback for older responses. GPS uses a great-circle distance check against the outdoor circle. LTE is too coarse for a 25m boundary and never triggers entry. Held Wi-Fi reports, stale data and read failures do not create new entries or prove exit. The current location card still labels a held/stale danger point as the last confirmed position.

Entry creates an in-app alert and a record in Alerts. Continuous residence does not repeat; a confirmed exit rearms entry. Outdoor exit uses a 5m hysteresis margin to reduce boundary jitter. This does not enlarge the visible 25m circle. Deduplication state survives refresh in the same tab; separate tabs are independent observers. First fresh observation inside a zone may trigger an alert even if the physical entry occurred before the page connected.

Records are stored in localStorage for this browser, up to 100, with read/unread status. They are not a server event history and are not synchronized across phones. Coordinates are not stored in notification history, and credentials are not stored by the notification worker.

## System notifications

Open Alerts and choose 开启系统提醒, then allow the browser permission request. On supported secure contexts the app registers a notification-only service worker scoped to the app's base path. It caches no pages or API data. Clicking a system notification opens/focuses Alerts. The opt-in preference is restored after reload if permission and an active registration remain available; 关闭系统提醒 disables dispatch without disabling in-app alerts.

This is page-driven notification dispatch, not Web Push. The page must remain connected and executing. A closed, suspended or throttled page cannot guarantee monitoring or notification delivery. Background push requires a separate backend/subscription implementation. Rejected/unsupported system notification permission still permits in-app alerts and history.

## Validation

Node tests cover indoor IDs, 25m geometry, entry deduplication, fresh exit/reentry, held/stale/LTE exclusion, hysteresis, device isolation, ordering and tab-state restoration. Browser checks cover badges, red map circle, toast/history, system notification permission/worker dispatch, denied permission, persistence, and existing location/remote-status navigation. System notification dispatch is spied in headless tests to avoid sending real OS notifications during QA. Actual walking/phone checks remain necessary because GNSS position error and report interval affect boundary detection.
