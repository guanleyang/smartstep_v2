# Wi-Fi retention and responsive source switching

2026-11-04 update. Flash the complete SmartHybrid sketch including hybrid_timing.h, and deploy hybrid.mjs to the existing smartstep-gps Worker. Preserve credentials, DB binding and schema. The app is deployed separately to the existing GitHub Pages URL.

## Runtime behavior

- Normal Wi-Fi target: one scan/upload cycle every 10 seconds, scheduled from scan start. No additional 10-second delay after HTTP completion and no mandatory second matching scan. A passing new point is submitted in the current cycle.
- When Wi-Fi does not match, retain the last confirmed point for less than 120 seconds. Re-uploaded held data does not reset the timer. No historical point exists at startup, so show waiting instead.
- LTE is attempted only after the 120-second fallback window expires, and only if there is no valid GPS fix. A new confirmed Wi-Fi point resets the window. Valid GPS also restarts the fallback window, so losing GPS does not immediately trigger LTE.
- GPS has priority. Poll approximately every second while the single AT link is idle and recheck after each Wi-Fi/LTE scan. The first observed valid fix is submitted immediately; sustained GPS updates target 10-second intervals. GNSS remains enabled continuously.
- The location payload's source remains wifi for held points, with wifi_status=held and wifi_age_ms. The Worker preserves its stored wifi_confirmed_at on held heartbeats. New confirmed points have wifi_status=confirmed.
- The app polls every 2 seconds after each completed request, displays held points as last confirmed indoor locations, and shows their confirmation time rather than treating each heartbeat as a new position fix. Remote status retains the separate upload receipt time.

## Floor-1 elevator gate

SS2-3_elevator_L1 requires all three known strong anchors (BC:9F:E4:19:75:20, BC:9F:E4:19:7D:C0, BC:9F:E4:19:7F:C0), each -68..-40dBm. Mean deviation from their -58/-60/-62dBm training medians must be <=6dB, global RMSE <=5dB, and the best/runner-up distance gap >=3dB. Rejected observations retain the previous confirmed point, not a newly confirmed floor-1 fix.

All 180 training scans still pass replay; TR62–TR69 independent holdouts remain 75/75 correct. Floor-1 has training data only. Rooftop negative samples are absent, so the new gate is not proof that every rooftop false positive is eliminated.

## Timing boundaries

10 seconds is a normal-network target, not a guarantee of remote delivery. Wi-Fi scan, serial responses and cellular/TLS latency take time. HTTP waits are independent of the 10-second scan target: normal command timeouts are retained, the HTTP result may take up to 90 seconds, and HTTPTERM cleanup receives its own 10-second timeout. Cleanup acknowledgement is required before HTTPINIT, with one initialization retry after another full cleanup. Fallback LBS waits up to 3 seconds. Startup AGPS, initial UTC/certificate setup and modem library calls can still exceed a cycle. Only one task accesses the modem AT stream to prevent interleaved commands.

The serial log prints `Location cycle elapsed ms`. Actual 10-second behavior, GPS acquisition latency and the rooftop gate must be verified on hardware. A slow/failed upload is reported as such rather than falsely declaring success. Firmware compile-time assertions cover hold expiry, timer wrap, immediate GPS transition and floor-1 gate boundaries; API/browser tests cover held timestamps, staleness, source transitions and app polling.

The battery measurement hardware has not been added by this update.


## HTTP timeout hotfix

The initial responsive firmware incorrectly included network UTC setup, TLS setup and HTTP upload in the remaining scan-cycle budget. Once exhausted, cleanup could wait only 1ms. Real hardware logs showed alternating HTTP result timeout and HTTPINIT failures. The hotfix removes that shared budget and waits for full cleanup acknowledgement; it preserves strict floor-1 matching, Wi-Fi retention and GPS priority. A slow network may extend the scan/upload cycle; the firmware must not interrupt a valid HTTPS request merely to report a 10-second cycle.
