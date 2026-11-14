// The signature line, under the handwritten logo. At rest it is a short line made of dots packed
// together. Hover it (or tap, or focus and press Enter) and the dots drop into dot-matrix letters
// beneath it, in the same 5x7 grid as the clock. Move away and they climb back into the line.
//
// The address is not in the HTML and not readable in this file: it is reversed and base64 encoded,
// and the href is only set the first time a person opens the line. Scrapers that read the source, or run
// it without interacting, find no address. This keeps casual harvesting off it; it can't stop someone
// determined, since any visitor can open the line.
const SOCIALS = [
  ["contact", "bW9jLnlydWJzbmFqQG1vb3JsaWFtOm90bGlhbQ=="],
];

const GLYPHS = {
  a: "00000 00000 01110 00001 01111 10001 01111",
  c: "00000 00000 01110 10001 10000 10001 01110",
  n: "00000 00000 10110 11001 10001 10001 10001",
  o: "00000 00000 01110 10001 10001 10001 01110",
  t: "01000 01000 11100 01000 01000 01001 00110",
  // for the hint
  e: "00000 00000 01110 10001 11111 10000 01110",
  g: "00000 01111 10001 10001 01111 00001 01110",
  h: "10000 10000 10110 11001 10001 10001 10001",
  i: "00100 00000 01100 00100 00100 00100 01110",
  u: "00000 00000 10001 10001 10001 10011 01101",
  "?": "01110 10001 00001 00010 00100 00000 00100",
  " ": "00000 00000 00000 00000 00000 00000 00000",
};
const HINT = "get in touch?"; // what the peek spells; opening the line spells the link's name
const WORD_GAP = 7;   // empty columns between names
const LINE_COLS = 32; // length of the resting line, in cells
const DROP = 1;       // rows from the line down to the top of the letters

const sign = document.querySelector("[data-sign]");
const toggle = sign?.querySelector(".sign__line");

function letterDots(word) {
  const dots = [];
  [...word].forEach((ch, n) => {
    [...GLYPHS[ch].replace(/ /g, "")].forEach((bit, i) => {
      if (bit === "1") dots.push([n * 6 + (i % 5), Math.floor(i / 5)]);
    });
  });
  return { dots, cols: word.length * 6 - 1 };
}

const words = SOCIALS.map(([name, code]) => ({ name, code, ...letterDots(name) }));
const total = words.reduce((sum, w) => sum + w.cols, 0) + WORD_GAP * (words.length - 1);
const count = words.reduce((sum, w) => sum + w.dots.length, 0);
const links = [];
const hint = letterDots(HINT);

// Dots for `word`, each placed in its letter (x, y) and packed into the resting line (rx, ry),
// relative to where the word starts (`start` columns in). `k0` and `n` spread them along the line.
function placeDots(el, word, start, k0, n) {
  word.dots.forEach(([x, y], k) => {
    const b = document.createElement("b");
    const rx = ((k0 + k) / (n - 1)) * (LINE_COLS - 1) - start;
    b.style.cssText = `--x:${x};--y:${y};--rx:${rx.toFixed(2)};--ry:${-DROP};--d:${start + x}`;
    el.append(b);
  });
}

if (sign) {
  sign.style.setProperty("--cols", Math.max(total, LINE_COLS));
  sign.style.setProperty("--line", LINE_COLS);
  sign.style.setProperty("--drop", DROP);
  let start = 0;
  let k = 0;
  words.forEach((w) => {
    const a = document.createElement("a");
    a.className = "sign__word";
    a.setAttribute("aria-label", w.name);
    a.tabIndex = -1;
    a.target = "_blank";
    a.rel = "noopener noreferrer nofollow";
    a.style.setProperty("--at", start);
    a.style.setProperty("--w", w.cols);
    // The line is DROP rows above the letters
    placeDots(a, w, start, k, count);
    k += w.dots.length;
    links.push([a, w.code]);
    sign.append(a);
    start += w.cols + WORD_GAP;
  });
  // The hint: its own dots, hidden in the line until a peek, and not a link
  const h = document.createElement("span");
  h.className = "sign__word sign__hint";
  h.setAttribute("aria-hidden", "true");
  h.style.setProperty("--at", 0);
  h.style.setProperty("--w", hint.cols / 2); // drawn at half size (site.css)
  placeDots(h, hint, 0, 0, hint.dots.length);
  sign.append(h);
}

// A peek (hints.js) spells the hint for a moment, without setting any address. If the visitor
// opens the line during it, theirs takes over and stays.
let peekTimer = 0;
function peek(ms) {
  if (sign.classList.contains("is-open")) return;
  sign.classList.add("is-peeking");
  clearTimeout(peekTimer);
  peekTimer = setTimeout(() => sign.classList.remove("is-peeking"), ms);
}

function setOpen(open) {
  clearTimeout(peekTimer);
  sign.classList.remove("is-peeking");
  if (open) links.forEach(([a, code]) => {
    if (a.href) return;
    a.href = [...atob(code)].reverse().join("");
    if (a.protocol === "mailto:") a.removeAttribute("target"); // opens the mail app, not a new tab
  });
  links.forEach(([a]) => { a.tabIndex = open ? 0 : -1; });
  sign.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
}

if (sign) {
  sign.addEventListener("peek", (e) => peek(e.detail));
  // A tap on a peeked letter opens the line for real first, so the link it lands on works
  sign.addEventListener("pointerdown", (e) => {
    if (sign.classList.contains("is-peeking") && e.target.closest(".sign__word")) setOpen(true);
  });
  sign.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") setOpen(true); });
  sign.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") setOpen(false); });
  // Touch and keyboard toggle; a mouse already opened it on hover. Safari's click event carries no
  // pointerType, so the type is remembered from pointerdown (a keyboard click has none).
  let lastPointer = "";
  toggle.addEventListener("pointerdown", (e) => { lastPointer = e.pointerType; });
  toggle.addEventListener("click", () => {
    if (lastPointer !== "mouse") setOpen(!sign.classList.contains("is-open"));
    lastPointer = "";
  });
  sign.addEventListener("keydown", (e) => { if (e.key === "Escape") { setOpen(false); toggle.focus(); } });
  sign.addEventListener("focusout", (e) => { if (!sign.contains(e.relatedTarget)) setOpen(false); });
  document.addEventListener("pointerdown", (e) => { if (!sign.contains(e.target)) setOpen(false); });
}
