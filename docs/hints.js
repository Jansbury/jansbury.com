// Small hints that the page can be played with.
// The line under the logo opens to ask "get in touch?" every few seconds, then folds back, until the
// visitor does anything (touches, clicks, presses a key or points at it). When nobody's playing with it, the dot grid draws its next picture every few seconds.
// Never with reduced motion, and nothing ticks while the tab is hidden.
const CONTACT_EVERY = 11_600; // ms between peeks: 8.8s hidden between each
const CONTACT_FIRST = 2500; // ms after load, once the page has assembled
const PEEK = 2800;          // ms the hint stays open
const DOTS_EVERY = 9000;    // ms between pictures while the grid is left alone
const DOTS_HOLD = 2400;     // ms a picture stays
const DOTS_QUIET = 30_000;  // ms the grid waits after someone plays with it
const PIPS_EVERY = 14_000;  // ms between spins of the colour squares, until they're used
const PIPS_HOLD = 1200;     // ms they show the next colours

const calm = matchMedia("(prefers-reduced-motion: reduce)");
const dots = document.querySelector(".dots");
const sign = document.querySelector("[data-sign]");
const pips = document.querySelector("[data-palette-switch]");

// Runs `fn` every `ms` of visible time, the first time after `first`. Returns a stop function.
function every(ms, first, fn) {
  let timer = 0;
  let left = first; // ms still to wait
  let from = Date.now();
  let stopped = false;
  const arm = () => {
    clearTimeout(timer);
    if (stopped || document.hidden || calm.matches) return;
    from = Date.now();
    timer = setTimeout(() => { fn(); left = ms; arm(); }, left);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { clearTimeout(timer); left = Math.max(0, left - (Date.now() - from)); }
    else arm();
  });
  calm.addEventListener("change", arm);
  arm();
  return () => { stopped = true; clearTimeout(timer); };
}

if (sign) {
  const stop = every(CONTACT_EVERY, CONTACT_FIRST, () => {
    sign.dispatchEvent(new CustomEvent("peek", { detail: PEEK }));
  });
  const done = () => {
    stop();
    removeEventListener("pointerdown", done, true);
    removeEventListener("keydown", done, true);
    sign.removeEventListener("pointerenter", done);
  };
  addEventListener("pointerdown", done, true);
  addEventListener("keydown", done, true);
  sign.addEventListener("pointerenter", done);
}

if (dots) {
  let over = false;
  let played = 0; // when someone last played with the grid
  dots.addEventListener("pointerenter", () => { over = true; played = Date.now(); });
  dots.addEventListener("pointerleave", () => { over = false; played = Date.now(); });
  dots.addEventListener("pointerup", () => { played = Date.now(); });
  every(DOTS_EVERY, DOTS_EVERY / 2, () => {
    // Left alone, it cycles through its pictures; once someone plays with it, it waits a while
    if (over || Date.now() - played < DOTS_QUIET || dots.classList.contains("is-spelling")) return;
    dots.dispatchEvent(new Event("hint"));
    setTimeout(() => { if (!over) dots.dispatchEvent(new Event("unhint")); }, DOTS_HOLD);
  });
}

if (pips) {
  const stop = every(PIPS_EVERY, PIPS_EVERY / 2, () => {
    pips.classList.add("is-hinting");
    setTimeout(() => pips.classList.remove("is-hinting"), PIPS_HOLD);
  });
  pips.addEventListener("click", () => { stop(); pips.classList.remove("is-hinting"); }, { once: true });
}
