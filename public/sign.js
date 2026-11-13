// The signature line, bottom right. At rest it is a short line made of dots packed together.
// Hover it (or tap, or focus and press Enter) and the dots rise into dot-matrix letters,
// in the same 5x7 grid as the clock: "instagram" and "kick". Move away and they fall back into the line.
//
// The addresses are not in the HTML and not readable in this file: each is reversed and base64 encoded,
// and the href is only set the first time a person opens the line. Scrapers that read the source, or run
// it without interacting, find no URLs. This keeps casual harvesting off them; it can't stop someone
// determined, since any visitor can open the line.
const SOCIALS = [
  ["instagram", "eXJ1YnNuYWovbW9jLm1hcmdhdHNuaS53d3cvLzpzcHR0aA=="],
  ["kick", "eF9zbmFqL21vYy5rY2lrLy86c3B0dGg="],
];

const GLYPHS = {
  a: "00000 00000 01110 00001 01111 10001 01111",
  c: "00000 00000 01110 10000 10000 10001 01110",
  g: "00000 01111 10001 10001 01111 00001 01110",
  i: "00100 00000 01100 00100 00100 00100 01110",
  k: "10000 10000 10010 10100 11000 10100 10010",
  m: "00000 00000 11010 10101 10101 10001 10001",
  n: "00000 00000 10110 11001 10001 10001 10001",
  r: "00000 00000 10110 11001 10000 10000 10000",
  s: "00000 00000 01110 10000 01110 00001 11110",
  t: "01000 01000 11100 01000 01000 01001 00110",
};
const WORD_GAP = 7;   // empty columns between the two names
const LINE_COLS = 24; // length of the resting line, in cells
const LINE_ROW = 9;   // the line sits two rows under the letters

const sign = document.querySelector("[data-sign]");
const toggle = sign?.querySelector(".sign__line");

function letterDots(word) {
  const dots = [];
  [...word].forEach((ch, n) => {
    GLYPHS[ch].replace(/ /g, "").split("").forEach((bit, i) => {
      if (bit === "1") dots.push([n * 6 + (i % 5), Math.floor(i / 5)]);
    });
  });
  return { dots, cols: word.length * 6 - 1 };
}

const words = SOCIALS.map(([name, code]) => ({ name, code, ...letterDots(name) }));
const total = words.reduce((sum, w) => sum + w.cols, 0) + WORD_GAP * (words.length - 1);
const count = words.reduce((sum, w) => sum + w.dots.length, 0);
const links = [];

if (sign) {
  sign.style.setProperty("--cols", total);
  sign.style.setProperty("--line", LINE_COLS);
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
    // Each dot knows its place in the letter (x, y) and its place packed into the line (rx, ry),
    // both relative to its word, in cells.
    w.dots.forEach(([x, y]) => {
      const b = document.createElement("b");
      const rx = total - LINE_COLS + (k / (count - 1)) * (LINE_COLS - 1) - start;
      b.style.cssText = `--x:${x};--y:${y};--rx:${rx.toFixed(2)};--ry:${LINE_ROW};--d:${start + x}`;
      a.append(b);
      k++;
    });
    links.push([a, w.code]);
    sign.append(a);
    start += w.cols + WORD_GAP;
  });
}

function setOpen(open) {
  if (open) links.forEach(([a, code]) => { if (!a.href) a.href = [...atob(code)].reverse().join(""); });
  links.forEach(([a]) => { a.tabIndex = open ? 0 : -1; });
  sign.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
}

if (sign) {
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
