// Two clocks. The digital one bottom-right is always Auckland, where Jans is;
// the hands on the target show the visitor's own time, labelled with their city
// down the vertical text. The vertical rule fills over the Auckland day.
// The IANA zone handles NZ daylight saving. Dragging the day bar scrubs all of it through Auckland's day.
const ZONE = "Pacific/Auckland";
const root = document.documentElement;
const box = document.querySelector("[data-clock]");
const timeEl = document.querySelector("[data-time]");
const labelEl = document.querySelector("[data-place]");
const diffEl = document.querySelector("[data-diff]");
const hereEl = document.querySelector("[data-here]");

// "Europe/London" -> "london", "America/Los_Angeles" -> "los angeles"
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// Some browsers still report the old zone names for renamed cities.
const RENAMED = { calcutta: "kolkata", saigon: "ho chi minh", kiev: "kyiv", rangoon: "yangon", katmandu: "kathmandu" };
const raw = zone?.includes("/") ? zone.split("/").pop().replace(/_/g, " ").toLowerCase() : null;
const city = raw ? RENAMED[raw] ?? raw : null;
if (hereEl && city) hereEl.textContent = city;

const fmt = new Intl.DateTimeFormat("en-NZ", {
  timeZone: ZONE,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function auckland(now) {
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, m: +p.minute };
}

const FRACTIONS = { 15: "¼", 30: "½", 45: "¾" };

function difference(now, a) {
  // Compare the two wall clocks as if both were UTC, to get the offset in minutes.
  const there = Date.UTC(a.y, a.mo - 1, a.d, a.h, a.m);
  const here = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
  const mins = Math.round((there - here) / 60000 / 15) * 15;
  if (mins === 0) return "Same time as you";

  const abs = Math.abs(mins);
  const whole = Math.floor(abs / 60);
  const amount = `${whole || ""}${FRACTIONS[abs % 60] ?? ""}` || "0";
  const unit = abs === 60 ? "hour" : "hours";
  const dayThere = Date.UTC(a.y, a.mo - 1, a.d);
  const dayHere = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  if (mins > 0) return `${amount} ${unit} ahead of you${dayThere > dayHere ? ", already tomorrow" : ""}`;
  return `${amount} ${unit} behind you${dayThere < dayHere ? ", still yesterday" : ""}`;
}

// Scrubbing: dragging the day bar shifts every clock by `shift` ms; letting go eases it back to 0.
let shift = 0;
let scrubbing = false;
const pad = (n) => String(n).padStart(2, "0");

// Auckland time is drawn as a 5x7 dot matrix in the same round dots as the "Hi" grid.
// The dots stay in place and switch on and off, so digits morph into each other.
const GLYPHS = {
  0: "01110 10001 10001 10001 10001 10001 01110",
  1: "00100 01100 00100 00100 00100 00100 01110",
  2: "01110 10001 00001 00010 00100 01000 11111",
  3: "11111 00010 00100 00010 00001 10001 01110",
  4: "00010 00110 01010 10010 11111 00010 00010",
  5: "11111 10000 11110 00001 00001 10001 01110",
  6: "00110 01000 10000 11110 10001 10001 01110",
  7: "11111 00001 00010 00100 01000 01000 01000",
  8: "01110 10001 10001 01110 10001 10001 01110",
  9: "01110 10001 10001 01111 00001 00010 01100",
};
const COLON = "0 0 1 0 1 0 0";
let spoken, cells;

function buildMatrix() {
  spoken = document.createElement("span");
  spoken.className = "sr";
  const matrix = document.createElement("span");
  matrix.className = "dm";
  matrix.setAttribute("aria-hidden", "true");
  const glyph = (count, extra = "") => {
    const g = document.createElement("i");
    if (extra) g.className = extra;
    g.append(...Array.from({ length: count }, () => document.createElement("b")));
    matrix.append(g);
    return [...g.children];
  };
  cells = [glyph(35), glyph(35), glyph(7, "colon"), glyph(35), glyph(35)];
  COLON.split(" ").forEach((bit, i) => cells[2][i].classList.toggle("on", bit === "1"));
  timeEl.replaceChildren(spoken, matrix);
}

function drawTime(h, m) {
  const text = `${pad(h)}:${pad(m)}`;
  if (spoken.textContent === text) return;
  spoken.textContent = text;
  [text[0], text[1], null, text[3], text[4]].forEach((d, n) => {
    if (d === null) return;
    const bits = GLYPHS[d].replace(/ /g, "");
    cells[n].forEach((b, i) => b.classList.toggle("on", bits[i] === "1"));
  });
}

function render() {
  const now = new Date(Date.now() + shift);
  const a = auckland(now);

  // Hands: the visitor's local time
  root.style.setProperty("--hr", `${((now.getHours() % 12) + now.getMinutes() / 60) * 30}deg`);
  root.style.setProperty("--mn", `${now.getMinutes() * 6}deg`);
  root.style.setProperty("--day", ((a.h * 60 + a.m) / 1440).toFixed(4));

  const night = a.h >= 23 || a.h < 7;
  root.toggleAttribute("data-night", night);

  if (box) {
    if (!cells) buildMatrix();
    drawTime(a.h, a.m);
    labelEl.textContent = night ? "Asleep in Auckland, NZ" : "Auckland, NZ";
    const diff = difference(now, a);
    diffEl.textContent = scrubbing && diff !== "Same time as you"
      ? `${pad(now.getHours())}:${pad(now.getMinutes())} where you are`
      : diff;
    box.hidden = false;
  }
}

render();
setInterval(render, 15_000);

const bar = document.querySelector("[data-scrub]");
const handle = bar?.querySelector(".scrub");
const still = matchMedia("(prefers-reduced-motion: reduce)");

function scrubTo(y) {
  const r = bar.getBoundingClientRect();
  const frac = Math.min(1, Math.max(0, (y - r.top) / r.height));
  const target = Math.round((frac * 1440) / 5) * 5; // Auckland minute of the day, in 5-minute steps
  const a = auckland(new Date());
  shift = (target - (a.h * 60 + a.m)) * 60_000;
  render();
}

function release() {
  scrubbing = false;
  root.classList.remove("is-scrubbing");
  if (still.matches) { shift = 0; render(); return; }
  const from = shift;
  const start = performance.now();
  const step = (t) => {
    if (scrubbing) return;
    const k = Math.min(1, (t - start) / 600);
    shift = from * (1 - k) ** 3;
    render();
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

handle?.addEventListener("pointerdown", (e) => {
  scrubbing = true;
  root.classList.add("is-scrubbing");
  handle.setPointerCapture(e.pointerId);
  scrubTo(e.clientY);
});
handle?.addEventListener("pointermove", (e) => { if (scrubbing) scrubTo(e.clientY); });
handle?.addEventListener("pointerup", release);
handle?.addEventListener("pointercancel", release);
