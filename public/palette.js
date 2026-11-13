// Each visit is a new print run: a random palette and a random headline, never the same as the
// last visit. The three squares top-right step through the rest by hand.
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

// The headline is reprinted too: each visit, and each switch, says a different thing Jans does.
// In the second line, *asterisks* mark the italic words and _underscores_ letters that stay
// lower case in the capitals (the s in "UIs").
const LINES = [
  ["designs", "UI_s_ *&* UX flows"],
  ["builds", "Software"],
  ["solves", "Hard problems"],
  ["automates", "The boring bits"],
  ["makes", "Stuff *&* things"],
];
const LINE_KEY = "jansbury-last-line";
let line = 0;

function setLine(n) {
  line = n;
  const does = document.querySelector("[data-does]");
  const what = document.querySelector("[data-what]");
  if (!does || !what) return;
  does.textContent = LINES[n][0];
  const wrap = (tag, text, className) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = text;
    return el;
  };
  what.replaceChildren(...LINES[n][1].split("*").flatMap((part, i) => {
    if (i % 2) return [wrap("em", part)];
    return part.split("_").map((bit, j) => (j % 2 ? wrap("span", bit, "lc") : bit));
  }));
  try { localStorage.setItem(LINE_KEY, n); } catch { /* storage blocked: repeats are possible */ }
}

function reprint() {
  apply(order[(order.indexOf(root.dataset.theme) + 1) % order.length]);
  setLine((line + 1) % LINES.length);
  knock();
}

document.addEventListener("DOMContentLoaded", () => {
  // Open on a random line, never the one from the last visit
  let lastLine = null;
  try { lastLine = localStorage.getItem(LINE_KEY); } catch { /* storage blocked */ }
  const fresh = LINES.map((_, i) => i).filter((i) => String(i) !== lastLine);
  setLine(fresh[Math.floor(Math.random() * fresh.length)]);

  const pips = document.querySelector("[data-palette-switch]");
  pips?.addEventListener("click", reprint);
  // A mouse or touch press shouldn't leave the focus ring behind (it shows after typing to the
  // dots, since the browser then treats the page as keyboard-driven); Tab still focuses it.
  pips?.addEventListener("pointerdown", (e) => e.preventDefault());
});
})();
