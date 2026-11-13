// The signature line, under the handwritten logo. At rest it is a short line made of dots packed
// together. Hover it (or tap, or focus and press Enter) and the dots drop into dot-matrix letters
// beneath it, in the same 5x7 grid as the clock. Move away and they climb back into the line.
//
// The addresses (the profile and the email) are not in the HTML and not readable in this file: each is reversed and base64 encoded,
// and the href is only set the first time a person opens the line. Scrapers that read the source, or run
// it without interacting, find no URLs. This keeps casual harvesting off them; it can't stop someone
// determined, since any visitor can open the line.
const SOCIALS = [
  ["instagram", "eXJ1YnNuYWovbW9jLm1hcmdhdHNuaS53d3cvLzpzcHR0aA=="],
  ["email", "bW9jLnlydWJzbmFqQG9sbGVoOm90bGlhbQ=="],
];

const GLYPHS = {
  a: "00000 00000 01110 00001 01111 10001 01111",
  e: "00000 00000 01110 10001 11111 10000 01110",
  g: "00000 01111 10001 10001 01111 00001 01110",
  i: "00100 00000 01100 00100 00100 00100 01110",
  l: "01100 00100 00100 00100 00100 00100 01110",
  m: "00000 00000 11010 10101 10101 10001 10001",
  n: "00000 00000 10110 11001 10001 10001 10001",
  r: "00000 00000 10110 11001 10000 10000 10000",
  s: "00000 00000 01110 10000 01110 00001 11110",
  t: "01000 01000 11100 01000 01000 01001 00110",
};
const WORD_GAP = 7;   // empty columns between names
const LINE_COLS = 32; // length of the resting line, in cells
const DROP = 3;       // rows from the line down to the top of the letters

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
    // Each dot knows its place in the letter (x, y) and its place packed into the line (rx, ry),
    // both relative to its word, in cells. The line is DROP rows above the letters.
    w.dots.forEach(([x, y]) => {
      const b = document.createElement("b");
      const rx = (k / (count - 1)) * (LINE_COLS - 1) - start;
      b.style.cssText = `--x:${x};--y:${y};--rx:${rx.toFixed(2)};--ry:${-DROP};--d:${start + x}`;
      a.append(b);
      k++;
    });
    links.push([a, w.code]);
    sign.append(a);
    start += w.cols + WORD_GAP;
  });
}

function setOpen(open) {
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
