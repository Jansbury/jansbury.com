// The dot grid says "Hi". Hover it (or tap on touch screens) and every dot travels: the fifteen
// the letters need move into place and the other ten land on top of those and merge in.
// The routes are shuffled each time.
const dots = document.querySelector(".dots");

if (dots) {
  const all = [...dots.children];
  all.forEach((b, i) => b.style.setProperty("--i", i));
  // "Hi" is marked in the markup: the dots it doesn't need have class "o"
  const HI = all.flatMap((b, i) => (b.classList.contains("o") ? [] : [i]));

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

  dots.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") spell(HI); });
  dots.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") settle(); });
  dots.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "mouse") dots.classList.contains("is-spelling") ? settle() : spell(HI);
  });
}
