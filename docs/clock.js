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
const LAST = DAY - DRAG_STEP; // the bar stops at 23:55, so the bottom never wraps round to midnight
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

// Visitors in New Zealand get a hello rather than a time difference. Their time zone tells us; it
// never leaves the browser. Others on the same clock (Fiji some months) just share the time.
const IN_NZ = ["Pacific/Auckland", "NZ", "Antarctica/McMurdo"].includes(zone);

function inWords({ offset, days }) {
  if (offset === 0) return IN_NZ ? "You’re in Aotearoa too" : "Same time as you";
  const abs = Math.abs(offset);
  const amount = `${Math.floor(abs / 60) || ""}${FRACTIONS[abs % 60] ?? ""}hr`; // "18hr", "½hr", "5¾hr"
  if (offset > 0) return `${amount} ahead${days > 0 ? ", already tomorrow" : ""}`;
  return `${amount} behind${days < 0 ? ", still yesterday" : ""}`;
}

// Auckland time is drawn as a 5x7 dot matrix, in the same round dots as the dot grid.
// The dots stay in place and switch on and off, so digits morph into each other.
const bits = (rows) => [...rows.replace(/ /g, "")].map((bit) => bit === "1");
const GLYPHS = [
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
const BLANK = bits("0".repeat(35)); // the tens of the hour, from 1 to 9 o'clock
// am and pm, as two small letters stacked beside the digits
const LETTERS = {
  A: bits("01110 10001 10001 11111 10001 10001 10001"),
  P: bits("11110 10001 10001 11110 10000 10000 10000"),
  M: bits("10001 11011 10101 10101 10001 10001 10001"),
  H: bits("10001 10001 10001 11111 10001 10001 10001"),
  D: bits("11110 10001 10001 10001 10001 10001 11110"),
};

// 12-hour time, as Auckland says it: "7:05pm"
const twelve = (h) => h % 12 || 12;
const say = (h, m) => `${twelve(h)}:${pad(m)}${h < 12 ? "am" : "pm"}`;

// Builds the matrix inside `el` and returns a function that draws on it: four digits (a space is
// blank), two small letters beside them, and the same thing as text for screen readers.
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
  const ap = document.createElement("span");
  ap.className = "dm__ap";
  const half = [0, 1].map(() => {
    const g = document.createElement("i");
    g.append(...Array.from({ length: 35 }, () => document.createElement("b")));
    ap.append(g);
    return [...g.children];
  });
  matrix.append(ap);
  el.replaceChildren(spoken, matrix);

  return (four, top, bottom, text) => {
    if (spoken.textContent === text) return;
    spoken.textContent = text;
    [...four].forEach((d, n) => light(digits[n], d === " " ? BLANK : GLYPHS[d]));
    light(half[0], LETTERS[top]);
    light(half[1], LETTERS[bottom]);
  };
}
const draw = timeEl ? createMatrix(timeEl) : null;
const drawTime = (h, m) =>
  draw(String(twelve(h)).padStart(2, " ") + pad(m), h < 12 ? "A" : "P", "M", say(h, m));

// Someone in New Zealand already knows the time here, so for them the clock counts the time since
// Jans last pushed code, to any of his repos: hours and minutes (H M beside the digits), and past
// 99 hours, days and hours (D H). The deploy writes the time into last-push.json
// (.github/workflows/pages.yml). Until it arrives, or if it can't be read, the clock stays a clock.
let pushed = 0;
const countsUp = () => IN_NZ && pushed > 0;
if (IN_NZ) {
  fetch("/last-push.json", { cache: "no-cache" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => { pushed = Date.parse(data?.at) || 0; if (pushed) render(); })
    .catch(() => { /* no file yet: Auckland time it is */ });
}
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
function drawSince(now) {
  const mins = Math.max(0, Math.floor((now - pushed) / 60_000));
  const h = Math.floor(mins / 60);
  if (h < 100) {
    draw(String(h).padStart(2, " ") + pad(mins % 60), "H", "M",
      `${h ? plural(h, "hour") + " " : ""}${plural(mins % 60, "minute")} since my last git commit`);
  } else {
    const d = Math.min(99, Math.floor(h / 24));
    draw(String(d).padStart(2, " ") + pad(h % 24), "D", "H",
      `${plural(d, "day")} ${plural(h % 24, "hour")} since my last git commit`);
  }
}

// The temperature in Auckland now, from Open-Meteo (free, no key, sends nothing about the visitor:
// the request carries only Auckland's coordinates). The reading, and when the next request is due,
// are kept in the browser, so reloads, return visits and other tabs show it at once and never ask
// early: a good reading lasts an hour; after a failure (a request that hangs is cut off after 8s)
// the next try waits a minute, then five, then a quarter hour. Until one succeeds, the label has no
// temperature.
const WEATHER = "https://api.open-meteo.com/v1/forecast?latitude=-36.85&longitude=174.76&current=temperature_2m";
const WEATHER_EVERY = 60 * 60_000;
const WEATHER_RETRY = [60_000, 5 * 60_000, 15 * 60_000];
const WEATHER_TIMEOUT = 8000;
const WEATHER_STALE = 3 * 60 * 60_000; // an older reading isn't shown
const WEATHER_KEY = "auckland-weather"; // localStorage: { t: °C or null, at, next: ms, failures }
let weather = { t: null, at: 0, next: 0, failures: 0 };
try {
  const kept = JSON.parse(localStorage.getItem(WEATHER_KEY));
  // Ignore anything stored by a clock that has since been set back
  if (kept && kept.next - Date.now() <= WEATHER_EVERY) weather = kept;
} catch { /* storage blocked or empty: ask */ }
let temperature = Date.now() - weather.at < WEATHER_STALE ? weather.t : null; // °C, unrounded

function keep(next, at = weather.at) {
  weather = { t: temperature, at, next, failures: weather.failures };
  try { localStorage.setItem(WEATHER_KEY, JSON.stringify(weather)); } catch { /* not kept */ }
}

// Auckland's is in °C, as it is there. Visitors who think in Fahrenheit (the US and a few others)
// also get it converted, under the clock. The region comes from the browser's language when it names one
// ("en-US", not just "en"), otherwise from the time zone.
const FAHRENHEIT = new Set(["US", "PR", "GU", "VI", "AS", "MP", "UM", "BS", "BZ", "KY", "LR", "PW", "FM", "MH"]);
const US_ZONE = /^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Juneau|Sitka|Nome|Yakutat|Metlakatla|Adak|Menominee|Puerto_Rico|Indiana\/.+|Kentucky\/.+|North_Dakota\/.+)|Pacific\/(Honolulu|Guam|Saipan|Pago_Pago)|US\/.+)$/;
const region = (navigator.languages ?? [navigator.language])
  .map((tag) => { try { return new Intl.Locale(tag).region; } catch { return undefined; } })
  .find(Boolean);
const fahrenheit = region ? FAHRENHEIT.has(region) : US_ZONE.test(zone);
async function checkWeather() {
  if (Date.now() < weather.next) return;
  keep(Date.now() + WEATHER_TIMEOUT + 2000); // claim this request, so other tabs and reloads wait for it
  try {
    const res = await fetch(WEATHER, {
      referrerPolicy: "no-referrer", credentials: "omit",
      signal: AbortSignal.timeout?.(WEATHER_TIMEOUT), // older browsers just wait
    });
    const t = res.ok ? (await res.json())?.current?.temperature_2m : undefined;
    if (typeof t !== "number") throw new Error(`no temperature (${res.status})`);
    temperature = t;
    weather.failures = 0;
    keep(Date.now() + WEATHER_EVERY, Date.now());
    render();
  } catch {
    // Offline, slow or blocked: keep any earlier reading and try again after a wait
    const wait = WEATHER_RETRY[Math.min(weather.failures++, WEATHER_RETRY.length - 1)];
    keep(Date.now() + wait);
  }
}

// The seconds hand sweeps by itself (site.css); this starts it at the right point, once. Changing
// it later would make a running sweep jump.
{
  const t = new Date();
  root.style.setProperty("--sec", `${-(t.getSeconds() + t.getMilliseconds() / 1000)}s`);
}

// The hour and minute hands move with a little character (site.css gives them a springy settle).
// Their angles keep counting past 360deg, so a move always takes the short way round.
// `handsHeld` stops render() moving them: before the target has appeared, and while the rest of
// the clock eases back after a drag (the hands spring straight back instead).
const turned = { hr: null, mn: null };
let handsHeld = true;
function turn(name, deg) {
  const prev = turned[name];
  // The first move goes forward from 12, so the hands sweep round to the time on load
  const next = prev === null ? deg : prev + ((((deg - prev) % 360) + 540) % 360) - 180;
  turned[name] = next;
  root.style.setProperty(`--${name}`, `${next}deg`);
}
function setHands(now) {
  turn("hr", ((now.getHours() % 12) + now.getMinutes() / 60) * 30);
  turn("mn", now.getMinutes() * 6);
}
// The target cuts in at 900ms (site.css); the hands set off just after
setTimeout(() => { handsHeld = false; render(); }, still.matches ? 0 : 950);

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
  if (!handsHeld) setHands(now);
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
    handle.setAttribute("aria-valuetext", `${say(a.h, a.m)} in Auckland`);
  }
  if (box) {
    // Live time only: a scrubbed hour shouldn't show today's temperature
    const temp = temperature === null || scrubbing ? "" : `, ${Math.round(temperature)}°C`;
    const counting = countsUp() && !shift;
    if (counting) drawSince(Date.now());
    else drawTime(a.h, a.m);
    labelEl.textContent = (night ? "Asleep in Auckland, NZ" : "Auckland, NZ") + temp;
    diffEl.textContent = scrubbing && apart.offset !== 0
      ? `${say(now.getHours(), now.getMinutes())} where you are`
      : inWords(apart) + (temperature === null || !fahrenheit
        ? "" : `\n${Math.round(temperature)}°C is ${Math.round(temperature * 9 / 5 + 32)}°F to you`);
    if (counting) diffEl.textContent = "Since my last git commit"; // says what the digits count
    diffEl.classList.toggle("is-note", counting); // set like the place line above (site.css)
    // Lines past the first, so the narrow layout can make room for them (site.css)
    root.style.setProperty("--diff-extra", diffEl.textContent.split("\n").length - 1);
    box.hidden = false;
  }
}

// Redraw exactly as each minute turns. Nothing ticks while the tab is hidden; it catches up
// straight away when the tab comes back.
let minuteTimer = 0;
function everyMinute() {
  clearTimeout(minuteTimer);
  if (document.hidden) return;
  render();
  checkWeather();
  minuteTimer = setTimeout(everyMinute, 60_000 - (Date.now() % 60_000) + 50);
}
everyMinute();
document.addEventListener("visibilitychange", everyMinute);

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
  // The hands spring straight back to now; the rest of the clock eases after them
  setHands(new Date());
  handsHeld = true;
  const from = shift;
  const start = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - start) / EASE_BACK);
    shift = from * (1 - k) ** 3;
    if (k === 1) handsHeld = false;
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

// Still here? The seconds hand has been going round the whole time you've been reading.
