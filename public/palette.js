// Each visit opens on a random palette, never the same one twice in a row.
// The three squares top-right step through the rest by hand.
// Loaded as a plain blocking script in <head> so the palette is set before the first paint
// (no flash of the default orange); wrapped in a function to keep its names out of the global scope.
(() => {
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

// Each switch is a new print run: the page cuts straight to the next colour, and the second
// plate (the ring colour, under the headline, logo and target core) is knocked a little further
// out of register, on top of the offset clock.js sets from the time. The knocks add up, within a
// cap. Values are in the same units as the clock's (site.css turns them into pixels).
const STEP = 3;
const LIMIT = 12;
let mx = 0, my = 0;

function knock() {
  const angle = Math.random() * Math.PI * 2;
  mx += Math.cos(angle) * STEP;
  my += Math.sin(angle) * STEP;
  const far = Math.hypot(mx, my);
  if (far > LIMIT) { mx *= LIMIT / far; my *= LIMIT / far; }
  root.style.setProperty("--mx", mx.toFixed(1));
  root.style.setProperty("--my", my.toFixed(1));
}

function reprint() {
  apply(order[(order.indexOf(root.dataset.theme) + 1) % order.length]);
  knock();
}

document.addEventListener("DOMContentLoaded", () => {
  const pips = document.querySelector("[data-palette-switch]");
  pips?.addEventListener("click", reprint);
  // A mouse or touch press shouldn't leave the focus ring behind (it shows after typing to the
  // dots, since the browser then treats the page as keyboard-driven); Tab still focuses it.
  pips?.addEventListener("pointerdown", (e) => e.preventDefault());
});
})();
