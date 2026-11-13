// The dot grid spells. Hover it (or tap on touch screens) and it says "Hi"; type anywhere and it
// shows each letter or digit as you press it. Every dot travels: the ones a letter needs move into
// place and the rest land on top of those and merge in. The routes are shuffled each time.
// Typing "jans" also makes the logo write itself again.
const dots = document.querySelector(".dots");
const logo = document.querySelector(".logo");

// 5x5 letters and digits, rows top to bottom
const GLYPHS = {
  a: "01110 10001 11111 10001 10001", b: "11110 10001 11110 10001 11110",
  c: "01111 10000 10000 10000 01111", d: "11110 10001 10001 10001 11110",
  e: "11111 10000 11110 10000 11111", f: "11111 10000 11110 10000 10000",
  g: "01111 10000 10011 10001 01111", h: "10001 10001 11111 10001 10001",
  i: "11111 00100 00100 00100 11111", j: "00111 00010 00010 10010 01100",
  k: "10010 10100 11000 10100 10010", l: "10000 10000 10000 10000 11111",
  m: "10001 11011 10101 10001 10001", n: "10001 11001 10101 10011 10001",
  o: "01110 10001 10001 10001 01110", p: "11110 10001 11110 10000 10000",
  q: "01110 10001 10101 10010 01101", r: "11110 10001 11110 10010 10001",
  s: "01111 10000 01110 00001 11110", t: "11111 00100 00100 00100 00100",
  u: "10001 10001 10001 10001 01110", v: "10001 10001 10001 01010 00100",
  w: "10001 10001 10101 11011 10001", x: "10001 01010 00100 01010 10001",
  y: "10001 01010 00100 00100 00100", z: "11111 00010 00100 01000 11111",
  0: "01110 10011 10101 11001 01110", 1: "00100 01100 00100 00100 01110",
  2: "11110 00001 01110 10000 11111", 3: "11110 00001 01110 00001 11110",
  4: "10010 10010 11111 00010 00010", 5: "11111 10000 11110 00001 11110",
  6: "01110 10000 11110 10001 01110", 7: "11111 00001 00010 00100 00100",
  8: "01110 10001 01110 10001 01110", 9: "01110 10001 01111 00001 01110",
};
const HOLD = 1100; // how long a typed letter stays before the grid settles

if (dots) {
  const all = [...dots.children];
  all.forEach((b, i) => b.style.setProperty("--i", i));
  // "Hi" is marked in the markup: the dots it doesn't need have class "o"
  const HI = all.flatMap((b, i) => (b.classList.contains("o") ? [] : [i]));
  const cells = (glyph) => [...glyph.replace(/ /g, "")].flatMap((bit, i) => (bit === "1" ? [i] : []));

  const shuffle = (list) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };

  function spell(targets) {
    shuffle(all.map((_, i) => i)).forEach((from, n) => {
      const to = n < targets.length ? targets[n] : targets[Math.floor(Math.random() * targets.length)];
      all[from].style.setProperty("--dx", (to % 5) - (from % 5));
      all[from].style.setProperty("--dy", Math.floor(to / 5) - Math.floor(from / 5));
    });
    dots.classList.add("is-spelling");
  }

  function settle() {
    all.forEach((b) => { b.style.setProperty("--dx", 0); b.style.setProperty("--dy", 0); });
    dots.classList.remove("is-spelling");
  }

  let hovering = false;
  dots.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { hovering = true; spell(HI); } });
  dots.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { hovering = false; settle(); } });
  dots.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "mouse") dots.classList.contains("is-spelling") ? settle() : spell(HI);
  });

  let typed = "";
  let timer = 0;
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const key = e.key.toLowerCase();
    if (!(key in GLYPHS) || key.length !== 1) return;
    spell(cells(GLYPHS[key]));
    clearTimeout(timer);
    timer = setTimeout(() => (hovering ? spell(HI) : settle()), HOLD);

    typed = (typed + key).slice(-4);
    if (typed === "jans" && logo) {
      // Restart the pen-stroke reveal from the load sequence
      logo.style.animation = "none";
      void logo.getBoundingClientRect();
      logo.style.animation = "";
    }
  });
}
