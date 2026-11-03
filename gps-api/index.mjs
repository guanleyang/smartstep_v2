// Standalone GPS API for a GitHub Pages frontend.
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim());
    const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin" };
    if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
    const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });
    if (origin && !allowed.includes(origin)) return reply(403, { error: "Origin denied" });
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...headers,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type" } });
    }
    const path = new URL(request.url).pathname;
    const match = path.match(/^\/v1\/devices\/([a-zA-Z0-9_-]{1,64})\/location$/);
    if (!match) return reply(404, { error: "Not found" });
    if (!["GET", "POST"].includes(request.method)) return reply(405, { error: "Method not allowed" });
    const device = match[1];
    try {
      const devices = JSON.parse(env.DEVICE_CREDENTIALS || "{}");
      const credentials = Object.hasOwn(devices, device) ? devices[device] : null;
      const secret = credentials?.[request.method === "POST" ? "upload" : "read"];
      if (!secret || typeof secret !== "string" || secret.length < 32 ||
          credentials.upload === credentials.read || !env.DB) {
        return reply(503, { error: "Device service is not configured" });
      }
      if (request.headers.get("Authorization") !== "Bearer " + secret)
        return reply(401, { error: "Invalid credentials" });
      if (request.method === "GET") {
        const row = await env.DB.prepare("SELECT * FROM latest_locations WHERE device_id = ?").bind(device).first();
        if (!row) return reply(404, { error: "No location received yet" });
        return reply(200, { ...row, stale: Date.now() - row.received_at > 120000 });
      }
      if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json"))
        return reply(415, { error: "Use application/json" });
      // Bound the streamed body even if Content-Length is absent or dishonest.
      const reader = request.body?.getReader();
      if (!reader) return reply(400, { error: "Missing JSON" });
      let bytes = 0;
      const chunks = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 4096) { await reader.cancel(); return reply(413, { error: "Body too large" }); }
        chunks.push(value);
      }
      const data = new Uint8Array(bytes);
      let offset = 0;
      for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
      let body;
      try { body = JSON.parse(new TextDecoder().decode(data)); }
      catch { return reply(400, { error: "Invalid JSON" }); }
      const number = (v, min, max) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
      if (!body || typeof body !== "object" ||
          (body.device_id !== undefined && body.device_id !== device) ||
          !number(body.latitude, -90, 90) || !number(body.longitude, -180, 180) ||
          (body.pdop != null && !number(body.pdop, 0, 100)) ||
          (body.battery_percent != null && !number(body.battery_percent, 0, 100)))
        return reply(400, { error: "Invalid device or GPS fields" });
      // First version accepts current fixes only; no queued historical uploads.
      const received = Date.now();
      const fix = body.recorded_at == null ? received : body.recorded_at;
      if (!number(fix, received - 120000, received + 30000))
        return reply(400, { error: "recorded_at must be a current Unix timestamp in milliseconds" });
      const result = await env.DB.prepare(`INSERT INTO latest_locations
        (device_id, latitude, longitude, pdop, battery_percent, recorded_at, received_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(device_id) DO UPDATE SET latitude=excluded.latitude,
        longitude=excluded.longitude, pdop=excluded.pdop,
        battery_percent=excluded.battery_percent, recorded_at=excluded.recorded_at,
        received_at=excluded.received_at
        WHERE excluded.recorded_at > latest_locations.recorded_at`)
        .bind(device, body.latitude, body.longitude, body.pdop ?? null,
          body.battery_percent ?? null, fix, received).run();
      return reply(200, { ok: true, updated: (result.meta?.changes ?? 0) > 0 });
    } catch {
      return reply(503, { error: "Location service temporarily unavailable" });
    }
  }
};

