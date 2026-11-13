// Each visit opens on a random palette, never the same one twice in a row.
// The three squares top-right step through the rest by hand.
const order = ["orange", "amber", "red", "green", "sky"];
const themeColour = { orange: "#da5328", amber: "#e2ae4a", red: "#ef6a7a", green: "#52c08f", sky: "#72b4f0" };
const KEY = "jansbury-last-palette";

const root = document.documentElement;
const meta = document.querySelector('meta[name="theme-color"]');

function readLast() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
function saveLast(name) {
  try { localStorage.setItem(KEY, name); } catch { /* storage blocked: repeats are possible */ }
}

function apply(name) {
  root.dataset.theme = name;
  if (meta) meta.content = themeColour[name];
  saveLast(name);
}

const last = readLast();
const choices = order.filter((name) => name !== last);
apply(choices[Math.floor(Math.random() * choices.length)]);

document.querySelector("[data-palette-switch]")?.addEventListener("click", () => {
  apply(order[(order.indexOf(root.dataset.theme) + 1) % order.length]);
});
