// Small hints that the page can be played with.
// The line under the logo ripples every few seconds until the visitor does anything (touches,
// clicks, presses a key or points at it). Now and then the dot grid draws its next picture by itself.
// Never with reduced motion, and nothing ticks while the tab is hidden.
const CONTACT_EVERY = 5000; // ms between ripples
const CONTACT_FIRST = 2500; // ms after load, once the page has assembled
const RIPPLE = 1400;        // ms: long enough for the ripple in site.css to cross the line
const DOTS_EVERY = 20_000;  // ms between pictures
const DOTS_HOLD = 1800;     // ms a picture stays

const calm = matchMedia("(prefers-reduced-motion: reduce)");
const dots = document.querySelector(".dots");
const sign = document.querySelector("[data-sign]");

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
    sign.classList.add("is-hinting");
    setTimeout(() => sign.classList.remove("is-hinting"), RIPPLE);
  });
  const done = () => {
    stop();
    sign.classList.remove("is-hinting");
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
  dots.addEventListener("pointerenter", () => { over = true; });
  dots.addEventListener("pointerleave", () => { over = false; });
  every(DOTS_EVERY, DOTS_EVERY, () => {
    if (over || dots.classList.contains("is-spelling")) return; // someone is already playing
    dots.dispatchEvent(new Event("hint"));
    setTimeout(() => { if (!over) dots.dispatchEvent(new Event("unhint")); }, DOTS_HOLD);
  });
}
