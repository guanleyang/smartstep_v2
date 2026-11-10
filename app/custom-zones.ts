export type CircleZone = {id:string;name:string;latitude:number;longitude:number;radius_m:number};
const KEY = "smartstep-custom-zones-v1";
export const MAX_ZONES = 50;
export function validCenter(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Math.abs(latitude) <= 85 && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}
export function validRadius(radius: number) { return Number.isInteger(radius) && radius >= 5 && radius <= 5000; }
export function readCustomZones(): CircleZone[] {
  try {
    const rows: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(rows)) return [];
    const seen = new Set<string>();
    return rows.slice(0, MAX_ZONES).filter((z): z is CircleZone => {
      if (!z || typeof z.id !== "string" || !z.id.startsWith("custom-") || seen.has(z.id) ||
          typeof z.name !== "string" || !z.name.trim() || z.name.length > 120 ||
          !validCenter(z.latitude,z.longitude) || !validRadius(z.radius_m)) return false;
      seen.add(z.id);
      return true;
    });
  } catch { return []; }
}
export function writeCustomZones(zones: CircleZone[]) { localStorage.setItem(KEY, JSON.stringify(zones)); }
