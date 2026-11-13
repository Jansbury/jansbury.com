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

// Switching is a screen-print pull: the next colour is dragged across the page, then the page is
// printed in it. Each pull also knocks the second plate (the ring colour, under the headline, logo,
// target core and dots) a few pixels out of register, and the offsets add up, so the print drifts
// a little further with every pull. It wanders within a cap rather than running off the page.
const STEP = 3;   // px of drift per pull
const LIMIT = 16; // px; the furthest the plate drifts from true
let mx = 0, my = 0, pulling = false;
const still = matchMedia("(prefers-reduced-motion: reduce)");

function knock() {
  const angle = Math.random() * Math.PI * 2;
  mx += Math.cos(angle) * STEP;
  my += Math.sin(angle) * STEP;
  const far = Math.hypot(mx, my);
  if (far > LIMIT) { mx *= LIMIT / far; my *= LIMIT / far; }
  root.style.setProperty("--mx", `${mx.toFixed(1)}px`);
  root.style.setProperty("--my", `${my.toFixed(1)}px`);
}

function pull() {
  if (pulling) return;
  const next = order[(order.indexOf(root.dataset.theme) + 1) % order.length];
  if (still.matches) { apply(next); knock(); return; }
  pulling = true;
  const sheet = document.createElement("i");
  sheet.className = "pull";
  sheet.setAttribute("aria-hidden", "true");
  sheet.style.background = themeColour[next];
  sheet.addEventListener("animationend", () => {
    apply(next);
    knock();
    sheet.remove();
    pulling = false;
  }, { once: true });
  document.body.append(sheet);
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("[data-palette-switch]")?.addEventListener("click", pull);
});
})();
