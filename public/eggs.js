// The dot grid says "Hi". On hover (or a tap on touch screens) every dot travels:
// fifteen of them form the letters and the other ten land on top of those and merge in.
// The assignment is shuffled each time, so the dots take different routes.
const dots = document.querySelector(".dots");

if (dots) {
  const all = [...dots.children];
  const letters = all.flatMap((b, i) => (b.classList.contains("o") ? [] : [i]));
  all.forEach((b, i) => b.style.setProperty("--i", i));

  const shuffle = (list) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };

  function sayHi() {
    const order = shuffle(all.map((_, i) => i));
    order.forEach((from, n) => {
      const to = n < letters.length ? letters[n] : letters[Math.floor(Math.random() * letters.length)];
      all[from].style.setProperty("--dx", (to % 5) - (from % 5));
      all[from].style.setProperty("--dy", Math.floor(to / 5) - Math.floor(from / 5));
    });
    dots.classList.add("is-hi");
  }

  function settle() {
    all.forEach((b) => { b.style.setProperty("--dx", 0); b.style.setProperty("--dy", 0); });
    dots.classList.remove("is-hi");
  }

  dots.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") sayHi(); });
  dots.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") settle(); });
  dots.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "mouse") dots.classList.contains("is-hi") ? settle() : sayHi();
  });
}
