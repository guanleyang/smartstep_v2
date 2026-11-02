import { test } from "node:test";
import assert from "node:assert/strict";
import api from "./index.mjs";

const upload = "u".repeat(64), read = "r".repeat(64);
function setup() {
  let row = null;
  const env = {
    ALLOWED_ORIGINS: "https://guanleyang.github.io",
    DEVICE_CREDENTIALS: JSON.stringify({ shoe_001: { upload, read } }),
    DB: { prepare(sql) { return { bind(...args) { return {
      async first() { return row; },
      async run() {
        assert.match(sql, /WHERE excluded.recorded_at > latest_locations.recorded_at/);
        if (row && args[5] <= row.recorded_at) return { meta: { changes: 0 } };
        row = Object.fromEntries(["device_id", "latitude", "longitude", "pdop", "battery_percent", "recorded_at", "received_at"].map((k,i) => [k,args[i]]));
        return { meta: { changes: 1 } };
      }
    }; } }; } }
  };
  return env;
}
const fix = () => ({ device_id: "shoe_001", latitude: 1.354268, longitude: 103.687622, pdop: 1.39, battery_percent: null, recorded_at: Date.now() - 1000 });
function request(env, method = "GET", token = read, body, extra = {}) {
  return api.fetch(new Request("https://api.example/v1/devices/shoe_001/location", {
    method, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  }), env);
}
test("authenticated upload/read roundtrip and unknown battery", async () => {
  const env = setup();
  assert.equal((await request(env)).status, 404);
  assert.equal((await request(env, "POST", upload, fix())).status, 200);
  const response = await request(env);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const body = await response.json();
  assert.equal(body.latitude, 1.354268);
  assert.equal(body.battery_percent, null);
  assert.equal(body.stale, false);
});
test("read and upload credentials cannot be interchanged", async () => {
  const env = setup();
  assert.equal((await request(env, "GET", upload)).status, 401);
  assert.equal((await request(env, "POST", read, fix())).status, 401);
  assert.equal((await request(env, "GET", "")).status, 401);
});
test("field validation rejects invalid ranges, strings, mismatched IDs and old fixes", async () => {
  const env = setup();
  for (const override of [{ latitude: 91 }, { longitude: -181 }, { latitude: "1.3" },
    { battery_percent: 101 }, { pdop: -1 }, { device_id: "other" }, { recorded_at: 1 },
    { recorded_at: Date.now() + 60000 }]) {
    assert.equal((await request(env, "POST", upload, { ...fix(), ...override })).status, 400);
  }
});
test("older fixes do not replace a newer location", async () => {
  const env = setup(), body = fix();
  await request(env, "POST", upload, body);
  const response = await request(env, "POST", upload, { ...body, latitude: 2, recorded_at: body.recorded_at - 100 });
  assert.equal((await response.json()).updated, false);
  assert.equal((await (await request(env)).json()).latitude, body.latitude);
});
test("CORS, bounded bodies, invalid JSON and fail-closed configuration", async () => {
  const env = setup();
  assert.equal((await request(env, "GET", read, undefined, { Origin: "https://evil.example" })).status, 403);
  const good = await request(env, "GET", read, undefined, { Origin: "https://guanleyang.github.io" });
  assert.equal(good.headers.get("Access-Control-Allow-Origin"), "https://guanleyang.github.io");
  assert.equal((await request(env, "POST", upload, { ...fix(), excess: "x".repeat(5000) })).status, 413);
  const bad = new Request("https://api.example/v1/devices/shoe_001/location",
    { method: "POST", headers: { Authorization: "Bearer " + upload, "Content-Type": "application/json" }, body: "{" });
  assert.equal((await api.fetch(bad, env)).status, 400);
  env.DEVICE_CREDENTIALS = "{}";
  assert.equal((await request(env)).status, 503);
});
test("storage failures do not expose internals", async () => {
  const env = setup();
  env.DB.prepare = () => { throw new Error("internal database detail"); };
  const response = await request(env);
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /internal database detail/);
});

