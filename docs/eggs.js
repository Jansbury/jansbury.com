// The dot grid is a small display, 7 by 7. At rest every dot is the same size. Hover it (or tap on
// touch screens) and it draws a picture: the dots stay where they are, the ones the picture needs
// swell and the rest fade to a faint grid, in a wave out from the middle, so one picture morphs into
// the next. The first time it says "Hi"; each time after, the next picture.
const dots = document.querySelector(".dots");
const SIZE = 7;

if (dots) {
  const all = Array.from({ length: SIZE * SIZE }, (_, i) => {
    const b = document.createElement("b");
    // How far from the middle, for the wave
    b.style.setProperty("--d", Math.hypot((i % SIZE) - 3, Math.floor(i / SIZE) - 3).toFixed(2));
    return b;
  });
  dots.replaceChildren(...all);

  const draw = (rows) => [...rows.replace(/ /g, "")].map((c) => c === "#");
  const PICTURES = [
    draw("#...#.# #...#.. #...#.# #####.# #...#.# #...#.# #...#.#"), // Hi
    draw("....... .#...#. .#...#. ....... #.....# .#...#. ..###.."), // a smile
    draw("....... .##.##. ####### ####### .#####. ..###.. ...#..."), // a heart
    draw("...#... .#.#... .#.#.#. ####### .#.#.#. .#.#... ...#..."), // a sound wave, for the music
    draw("....... .#..... .#..### ....... #.....# .#...#. ..###.."), // a wink
    draw("...#... ..###.. .#####. ####### .#####. ..###.. ...#..."), // a diamond
    draw("#.....# ##...## ####### #.###.# ####### #.#.#.# .#...#."), // Gengar: spiky ears, a toothy grin
    draw(".#.#.#. ..###.. .#####. #.#.#.# ####### #.###.# .#####."), // Togepi: crown spikes on an egg
    draw("..###.. .#####. #.#.#.# ##...## ###.### .#####. .#...#."), // Piplup: crest, eyes, beak, feet
  ];
  let next = 0;

  function spell(picture) {
    all.forEach((b, i) => b.classList.toggle("on", picture[i]));
    dots.classList.add("is-spelling");
  }
  function settle() {
    dots.classList.remove("is-spelling");
  }
  function show() {
    spell(PICTURES[next]);
    next = (next + 1) % PICTURES.length;
  }

  // Now and then the grid draws its next picture by itself (hints.js)
  dots.addEventListener("hint", show);
  dots.addEventListener("unhint", settle);
  dots.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") show(); });
  dots.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") settle(); });
  // Touch: each tap draws the next picture; tapping elsewhere lets it rest
  dots.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") show(); });
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" && !dots.contains(e.target)) settle();
  });
}
