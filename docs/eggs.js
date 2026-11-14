// The dot grid is a small display, 15 by 15. At rest every dot is the same size. Hover it (or tap on
// touch screens) and it draws a picture: the dots stay where they are, the ones the picture needs
// swell and the rest fade to a faint grid, in a wave out from the middle, so one picture morphs into
// the next. The first time it says "Hi"; each time after, the next picture.
const dots = document.querySelector(".dots");
const SIZE = 15;

if (dots) {
  const all = Array.from({ length: SIZE * SIZE }, (_, i) => {
    const b = document.createElement("b");
    // How far from the middle, for the wave
    b.style.setProperty("--d", Math.hypot((i % SIZE) - (SIZE - 1) / 2, Math.floor(i / SIZE) - (SIZE - 1) / 2).toFixed(2));
    return b;
  });
  dots.replaceChildren(...all);

  const draw = (rows) => [...rows.replace(/\s/g, "")].map((c) => c === "#");
  const PICTURES = [
    draw(`
      ...............
      ...............
      ...............
      ...............
      ...#...#..###..
      ...#...#...#...
      ...#...#...#...
      ...#####...#...
      ...#...#...#...
      ...#...#...#...
      ...#...#..###..
      ...............
      ...............
      ...............
      ...............`), // Hi
    draw(`
      ...............
      ...............
      ...............
      ....##...##....
      ....##...##....
      ...............
      ...............
      .#...........#.
      ..#.........#..
      ...##.....##...
      .....#####.....
      ...............
      ...............
      ...............
      ...............`), // a smile
    draw(`
      ...............
      ...............
      ...###...###...
      ..#####.#####..
      .#############.
      .#############.
      .#############.
      ..###########..
      ...#########...
      ....#######....
      .....#####.....
      ......###......
      .......#.......
      ...............
      ...............`), // a heart
    draw(`
      ........#......
      ........#...#..
      ......#.#...#..
      ......#.#.#.#..
      ..#...#.#.#.#..
      ..#.#.#.#.#.#.#
      #.#.#.#.#.#.#.#
      ###############
      #.#.#.#.#.#.#.#
      ..#.#.#.#.#.#.#
      ..#...#.#.#.#..
      ......#.#.#.#..
      ......#.#...#..
      ........#...#..
      ........#......`), // a waveform, for the music: eight bars on a centre line
    draw(`
      ...............
      ...............
      ...............
      ....##...###...
      ....##..#...#..
      ...............
      ...............
      .#...........#.
      ..#.........#..
      ...##.....##...
      .....#####.....
      ...............
      ...............
      ...............
      ...............`), // a wink: one eye open, the other closed in a happy arc
    draw(`
      ...............
      ...............
      #.............#
      ##...........##
      ###.........###
      .####.....####.
      ..###.....###..
      ...............
      ...............
      ##...........##
      .#############.
      ..##.##.##.##..
      ...#.##.##.#...
      .....##.##.....
      ...............`), // Gengar's grin: narrowed eyes over a huge toothy smile
    draw(`
      ...#...#...#...
      ..#.#.#.#.#.#..
      .#...........#.
      .#...#...#...#.
      .#...#...#...#.
      .#.....#.....#.
      .#..#..#..#..#.
      #.##.##.##.##.#
      #..#.....##...#
      #.##....#..#..#
      #..#.....##...#
      .#...........#.
      ..#.........#..
      ...#########...
      ...............`), // Togepi: crown of spikes, eyes, the zigzag rim of its shell, markings, feet
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

  // A word can scroll across the grid like a shop sign: 5x7 letters on the middle rows, moving one
  // column at a time. clock.js asks for "somewhere" while the analog clock shows 4:20, and "my local time" over the digital time.
  const LETTERS = {
    s: "00000 00000 01111 10000 01110 00001 11110",
    o: "00000 00000 01110 10001 10001 10001 01110",
    m: "00000 00000 11010 10101 10101 10001 10001",
    e: "00000 00000 01110 10001 11111 10000 01110",
    w: "00000 00000 10001 10001 10101 10101 01010",
    h: "10000 10000 10110 11001 10001 10001 10001",
    r: "00000 00000 10110 11001 10000 10000 10000",
    y: "00000 00000 10001 10001 01111 00001 01110",
    l: "01100 00100 00100 00100 00100 00100 01110",
    c: "00000 00000 01110 10000 10000 10001 01110",
    a: "00000 00000 01110 00001 01111 10001 01111",
    t: "01000 01000 11100 01000 01000 01001 00110",
    i: "00100 00000 01100 00100 00100 00100 01110",
    " ": "00000 00000 00000 00000 00000 00000 00000",
  };
  const STEP = 85; // ms per column
  let scrollTimer = 0;
  function scrollWord(word) {
    clearInterval(scrollTimer);
    // The word as columns of 7 dots, a blank column after each letter
    const cols = [...word].flatMap((ch) => {
      const bits = LETTERS[ch].replace(/ /g, "");
      return [...Array(5).keys()].map((x) => [...Array(7).keys()].map((y) => bits[y * 5 + x] === "1")).concat([Array(7).fill(false)]);
    });
    const top = Math.floor((SIZE - 7) / 2);
    let at = -SIZE; // starts off the right edge
    dots.classList.add("is-scrolling");
    scrollTimer = setInterval(() => {
      at++;
      if (at > cols.length) { clearInterval(scrollTimer); dots.classList.remove("is-scrolling"); settle(); return; }
      spell(all.map((_, i) => {
        const x = i % SIZE, y = Math.floor(i / SIZE) - top;
        return y >= 0 && y < 7 && !!cols[at + x]?.[y];
      }));
    }, STEP);
  }
  function stopScroll() {
    if (!dots.classList.contains("is-scrolling")) return;
    clearInterval(scrollTimer);
    dots.classList.remove("is-scrolling");
    settle();
  }
  dots.addEventListener("scroll-word", (e) => scrollWord(e.detail));
  dots.addEventListener("stop-word", stopScroll);

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
