// Two clocks. The digital one bottom-right is always Auckland, where Jans is; the hands on the
// target show the visitor's own time, labelled with their city. The vertical rule fills over the Auckland day, and dragging
// it (or focusing it and using the arrow keys) scrubs all of it. The IANA zone handles NZ
// daylight saving.
//
// The clock also sets the print's misregistration. The second plate sits off register by the
// distance between the visitor and Auckland (further away in hours, further off), in the direction
// Auckland's hour hand points, so the page prints differently for every visitor and turns slowly
// through the day.
const ZONE = "Pacific/Auckland";
const NIGHT_FROM = 23;  // Auckland counts as asleep from 23:00...
const NIGHT_UNTIL = 7;  // ...until 07:00
const DAY = 1440;       // minutes
const DRAG_STEP = 5;    // minutes per step when dragging
const KEY_STEP = 15;    // minutes per arrow key
const LAST = DAY - DRAG_STEP; // the bar stops at 23:55, so the bottom never wraps to 00:00
const EASE_BACK = 600;  // ms to return to now after letting go
const PLATE_BASE = 4;   // plate units off register for a visitor in Auckland's own time
const PLATE_PER_HOUR = 0.5;

const root = document.documentElement;
const box = document.querySelector("[data-clock]");
const timeEl = document.querySelector("[data-time]");
const labelEl = document.querySelector("[data-place]");
const diffEl = document.querySelector("[data-diff]");
const hereEl = document.querySelector("[data-here]");
const bar = document.querySelector("[data-scrub]");
const handle = bar?.querySelector(".scrub");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const pad = (n) => String(n).padStart(2, "0");

// The visitor's city, hung under the target whose hands show their time:
// "Europe/London" -> "london", "America/Los_Angeles" -> "los angeles".
// Zones with no city in them ("UTC", "Etc/GMT+5") get no label.
const RENAMED = { calcutta: "kolkata", saigon: "ho chi minh", kiev: "kyiv", rangoon: "yangon", katmandu: "kathmandu" };
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
if (hereEl && zone.includes("/") && !zone.startsWith("Etc/")) {
  const raw = zone.split("/").pop().replace(/_/g, " ").toLowerCase();
  const name = RENAMED[raw] ?? raw;
  hereEl.textContent = name;
  hereEl.style.setProperty("--n", name.length); // site.css tightens the spacing for long names
}

const fmt = new Intl.DateTimeFormat("en-NZ", {
  timeZone: ZONE,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function auckland(now) {
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, m: +p.minute };
}

// How far Auckland is from the visitor: minutes ahead (to the nearest quarter hour) and whole
// calendar days ahead. The two wall clocks are compared as if both were UTC.
function gap(now, a) {
  const there = Date.UTC(a.y, a.mo - 1, a.d, a.h, a.m);
  const here = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
  const dayThere = Date.UTC(a.y, a.mo - 1, a.d);
  const dayHere = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    offset: Math.round((there - here) / 60000 / 15) * 15,
    days: Math.sign(dayThere - dayHere),
  };
}

const FRACTIONS = { 15: "¼", 30: "½", 45: "¾" };

function inWords({ offset, days }) {
  if (offset === 0) return "Same time as you";
  const abs = Math.abs(offset);
  const whole = Math.floor(abs / 60);
  const amount = `${whole || ""}${FRACTIONS[abs % 60] ?? ""}`;
  const unit = abs <= 60 ? "hour" : "hours"; // "½ hour", "1 hour", "1½ hours"
  if (offset > 0) return `${amount} ${unit} ahead of you${days > 0 ? ", already tomorrow" : ""}`;
  return `${amount} ${unit} behind you${days < 0 ? ", still yesterday" : ""}`;
}

// Auckland time is drawn as a 5x7 dot matrix in the same round dots as the "Hi" grid.
// The dots stay in place and switch on and off, so digits morph into each other.
const bits = (rows) => [...rows.replace(/ /g, "")].map((bit) => bit === "1");
export const GLYPHS = [
  "01110 10001 10001 10001 10001 10001 01110",
  "00100 01100 00100 00100 00100 00100 01110",
  "01110 10001 00001 00010 00100 01000 11111",
  "11111 00010 00100 00010 00001 10001 01110",
  "00010 00110 01010 10010 11111 00010 00010",
  "11111 10000 11110 00001 00001 10001 01110",
  "00110 01000 10000 11110 10001 10001 01110",
  "11111 00001 00010 00100 01000 01000 01000",
  "01110 10001 10001 01110 10001 10001 01110",
  "01110 10001 10001 01111 00001 00010 01100",
].map(bits);
const COLON = bits("0 0 1 0 1 0 0");

// Builds the matrix inside `el` and returns a function that draws a time on it.
function createMatrix(el) {
  const spoken = document.createElement("span"); // the time as text, for screen readers
  spoken.className = "sr";
  const matrix = document.createElement("span");
  matrix.className = "dm";
  matrix.setAttribute("aria-hidden", "true");
  const glyph = (count, extra) => {
    const g = document.createElement("i");
    if (extra) g.className = extra;
    g.append(...Array.from({ length: count }, () => document.createElement("b")));
    matrix.append(g);
    return [...g.children];
  };
  const light = (cells, pattern) => cells.forEach((b, i) => b.classList.toggle("on", pattern[i]));
  const digits = [glyph(35), glyph(35)];
  light(glyph(7, "colon"), COLON);
  digits.push(glyph(35), glyph(35));
  el.replaceChildren(spoken, matrix);

  return (h, m) => {
    const text = `${pad(h)}:${pad(m)}`;
    if (spoken.textContent === text) return;
    spoken.textContent = text;
    [text[0], text[1], text[3], text[4]].forEach((d, n) => light(digits[n], GLYPHS[d]));
  };
}
const drawTime = timeEl ? createMatrix(timeEl) : null;

// The temperature in Auckland now, from Open-Meteo (free, no key, sends nothing about the visitor:
// the request carries only Auckland's coordinates). Checked every half hour; if it fails, the
// label simply has no temperature.
const WEATHER = "https://api.open-meteo.com/v1/forecast?latitude=-36.85&longitude=174.76&current=temperature_2m";
const WEATHER_EVERY = 30 * 60_000;
let temperature = null; // °C, unrounded

// Shown in the visitor's own unit: Fahrenheit where that is the everyday scale (the US and a few
// others), Celsius everywhere else. The region comes from the browser's language when it names one
// ("en-US", not just "en"), otherwise from the time zone.
const FAHRENHEIT = new Set(["US", "PR", "GU", "VI", "AS", "MP", "UM", "BS", "BZ", "KY", "LR", "PW", "FM", "MH"]);
const US_ZONE = /^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Juneau|Sitka|Nome|Yakutat|Metlakatla|Adak|Menominee|Puerto_Rico|Indiana\/.+|Kentucky\/.+|North_Dakota\/.+)|Pacific\/(Honolulu|Guam|Saipan|Pago_Pago)|US\/.+)$/;
const region = (navigator.languages ?? [navigator.language])
  .map((tag) => { try { return new Intl.Locale(tag).region; } catch { return undefined; } })
  .find(Boolean);
const fahrenheit = region ? FAHRENHEIT.has(region) : US_ZONE.test(zone);
const inUnit = (c) => (fahrenheit ? `${Math.round(c * 9 / 5 + 32)}°F` : `${Math.round(c)}°C`);
async function checkWeather() {
  try {
    const res = await fetch(WEATHER, { referrerPolicy: "no-referrer", credentials: "omit" });
    if (!res.ok) return;
    const t = (await res.json())?.current?.temperature_2m;
    if (typeof t !== "number") return;
    temperature = t;
    render();
  } catch { /* offline or blocked: leave the label as it is */ }
}
checkWeather();
setInterval(() => { if (!document.hidden) checkWeather(); }, WEATHER_EVERY);

// Scrubbing shifts every clock by `shift` ms; letting go eases it back to 0.
let shift = 0;
let scrubbing = false;
let easing = 0;

function render() {
  const now = new Date(Date.now() + shift);
  const a = auckland(now);
  const minute = a.h * 60 + a.m;
  const apart = gap(now, a);

  // Hands: the visitor's local time
  root.style.setProperty("--hr", `${((now.getHours() % 12) + now.getMinutes() / 60) * 30}deg`);
  root.style.setProperty("--mn", `${now.getMinutes() * 6}deg`);
  root.style.setProperty("--day", (minute / DAY).toFixed(4));

  // The plate (site.css turns units into pixels for the screen size)
  const far = PLATE_BASE + (Math.abs(apart.offset) / 60) * PLATE_PER_HOUR;
  const hand = (((a.h % 12) + a.m / 60) * Math.PI) / 6;
  root.style.setProperty("--tx", (Math.sin(hand) * far).toFixed(2));
  root.style.setProperty("--ty", (-Math.cos(hand) * far).toFixed(2));

  const night = a.h >= NIGHT_FROM || a.h < NIGHT_UNTIL;
  root.toggleAttribute("data-night", night);

  if (handle) {
    handle.setAttribute("aria-valuenow", minute);
    handle.setAttribute("aria-valuetext", `${pad(a.h)}:${pad(a.m)} in Auckland`);
  }
  if (box) {
    drawTime(a.h, a.m);
    // Live time only: a scrubbed hour shouldn't show today's temperature
    const temp = temperature === null || scrubbing ? "" : `, ${inUnit(temperature)}`;
    labelEl.textContent = (night ? "Asleep in Auckland, NZ" : "Auckland, NZ") + temp;
    diffEl.textContent = scrubbing && apart.offset !== 0
      ? `${pad(now.getHours())}:${pad(now.getMinutes())} where you are`
      : inWords(apart);
    box.hidden = false;
  }
}

// Redraw exactly as each minute turns, and straight away when the tab comes back.
let minuteTimer = 0;
function everyMinute() {
  render();
  clearTimeout(minuteTimer);
  minuteTimer = setTimeout(everyMinute, 60_000 - (Date.now() % 60_000) + 50);
}
everyMinute();
document.addEventListener("visibilitychange", () => { if (!document.hidden) everyMinute(); });

// ---------- The day bar as a slider ----------
function scrubToMinute(target) {
  cancelAnimationFrame(easing);
  scrubbing = true;
  root.classList.add("is-scrubbing");
  const a = auckland(new Date());
  shift = (Math.min(LAST, Math.max(0, target)) - (a.h * 60 + a.m)) * 60_000;
  render();
}

function scrubToPoint(y) {
  const r = bar.getBoundingClientRect();
  const frac = Math.min(1, Math.max(0, (y - r.top) / r.height));
  scrubToMinute(Math.round((frac * DAY) / DRAG_STEP) * DRAG_STEP);
}

function release() {
  if (!scrubbing) return;
  scrubbing = false;
  root.classList.remove("is-scrubbing");
  if (still.matches) { shift = 0; render(); return; }
  const from = shift;
  const start = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - start) / EASE_BACK);
    shift = from * (1 - k) ** 3;
    render();
    if (k < 1) easing = requestAnimationFrame(step);
  };
  easing = requestAnimationFrame(step);
}

if (handle) {
  let dragging = false;
  handle.addEventListener("pointerdown", (e) => {
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    scrubToPoint(e.clientY);
  });
  handle.addEventListener("pointermove", (e) => { if (dragging) scrubToPoint(e.clientY); });
  // Fires on release and on cancel alike
  handle.addEventListener("lostpointercapture", () => { dragging = false; release(); });

  const KEYS = {
    ArrowUp: -KEY_STEP, ArrowLeft: -KEY_STEP, ArrowDown: KEY_STEP, ArrowRight: KEY_STEP,
    PageUp: -60, PageDown: 60,
  };
  handle.addEventListener("keydown", (e) => {
    const current = +handle.getAttribute("aria-valuenow");
    if (e.key in KEYS) scrubToMinute(current + KEYS[e.key]);
    else if (e.key === "Home") scrubToMinute(0);
    else if (e.key === "End") scrubToMinute(LAST);
    else if (e.key === "Escape") { release(); return; }
    else return;
    e.preventDefault();
  });
  handle.addEventListener("blur", release);
}
