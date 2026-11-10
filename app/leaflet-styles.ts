export function ensureLeafletStyles() {
  if (document.getElementById("leaflet-css")) return;
  const css = document.createElement("link");
  css.id = "leaflet-css";
  css.rel = "stylesheet";
  css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(css);
}
