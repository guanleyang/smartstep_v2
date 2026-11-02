CREATE TABLE IF NOT EXISTS latest_locations (
  device_id TEXT PRIMARY KEY,
  latitude REAL NOT NULL CHECK(latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK(longitude BETWEEN -180 AND 180),
  pdop REAL,
  battery_percent REAL,
  recorded_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL
);

