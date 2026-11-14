// Nothing on the page says it can be played with, so once per visit, just after it has assembled,
// each toy does a little of its trick in quick turns: the dots say "Hi", the squares turn, the day
// bar slides a few hours on and back, and the line under the logo ripples. Touching or pressing
// anything stops the rest.
// Later, if the contact line still hasn't been opened, it ripples once more.
// Never with reduced motion, and never while the tab is hidden.
const START = 2200;          // ms after load, once the assembly has finished
const CONTACT_AFTER = 25_000; // ms of the page being seen before the contact line asks again
const KEY = "hinted";         // sessionStorage: the demo has run this visit

const calm = matchMedia("(prefers-reduced-motion: reduce)");
const dots = document.querySelector(".dots");
const pips = document.querySelector("[data-palette-switch]");
const bar = document.querySelector("[data-scrub]");
const sign = document.querySelector("[data-sign]");

// [element, how long it holds, ms]. Each starts a moment after the one before, so they overlap.
// The dots and the day bar run their own tricks (eggs.js, clock.js); the others take a class.
const STEPS = [[dots, 1200], [pips, 700], [bar, 1100], [sign, 900]].filter(([el]) => el);
const STAGGER = 550;

const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const visible = () => new Promise((done) => {
  if (!document.hidden) return done();
  document.addEventListener("visibilitychange", function on() {
    if (document.hidden) return;
    document.removeEventListener("visibilitychange", on);
    done();
  });
});

function hint(el, on) {
  if (el === dots || el === bar) el.dispatchEvent(new Event(on ? "hint" : "unhint"));
  else el.classList.toggle("is-hinting", on);
}

let stopped = false;
function stop() {
  stopped = true;
  STEPS.forEach(([el]) => hint(el, false));
}

async function demo() {
  try { if (sessionStorage.getItem(KEY)) return; sessionStorage.setItem(KEY, "1"); } catch { /* every load, then */ }
  await wait(START);
  for (const [el, hold] of STEPS) {
    await visible();
    if (stopped) return;
    hint(el, true);
    wait(hold).then(() => hint(el, false));
    await wait(STAGGER);
  }
}

// The contact line asks again after a while on the page, unless it has been opened
let contactSeen = false;
async function nudgeContact() {
  let seen = 0;
  while (seen < CONTACT_AFTER) {
    await visible();
    await wait(1000);
    if (!document.hidden) seen += 1000;
  }
  if (contactSeen || calm.matches) return;
  hint(sign, true);
  await wait(1100);
  hint(sign, false);
}

if (!calm.matches && STEPS.length) {
  addEventListener("pointerdown", stop, { once: true, capture: true });
  addEventListener("keydown", stop, { once: true, capture: true });
  demo();
}
if (sign) {
  sign.addEventListener("pointerenter", () => { contactSeen = true; });
  sign.addEventListener("focusin", () => { contactSeen = true; });
  nudgeContact();
}
