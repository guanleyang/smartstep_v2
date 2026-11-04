# Indoor Wi-Fi model

Updated 2026-11-04 with Garage EEE (`Garage_EEE`).

Campus recognition uses NTUSECURE BSSID/RSSI fingerprints: 12 zones, 83 features, 180 training scans. Gly’s Room remains a separate development rule in glys_room.h and the main sketch.

Garage EEE contributes 15 valid training scans. The four strong, stable NTUSECURE BSSIDs are B8:3A:5A:BF:AD:60, B8:3A:5A:BF:9B:40, B8:3A:5A:BF:98:E0, B8:3A:5A:BF:88:80. Nearby garage@eee/TP-Link/Deco SSIDs are not used.

Model method remains median RSSI, missing=-100dBm, Euclidean RMSE, training-derived per-zone threshold and two consecutive matching scans. Features require at least 8/15 sightings and median RSSI >= -85dBm in at least one training zone. Thresholds were recomputed in the extended feature space.

Validation: Garage EEE leave-one-out 15/15, original TR62/TR63/TR65/TR67/TR69 independent holdouts 75/75 retained. No independent Garage EEE field test is available yet; leave-one-out is not an independent accuracy claim. Other six original campus points retain training-only validation.

model.json stores the model; fingerprint_model.h is its Arduino representation; model-validation.json stores results. Original frozen demonstration archives were not modified.

Install: flash the updated complete SmartHybrid sketch with the new header; deploy gps-api/hybrid.mjs to the existing Worker so Garage_EEE is accepted and displayed. Keep existing D1 table, binding and credentials. The app already displays the server-provided zone name. GPS remains preferred when valid; GNSS stays on continuously. Battery sensing has not been added by this update.
