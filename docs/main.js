// For anyone who opens the browser's dev tools.
const clock = `⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⡤⠶⠖⠒⠒⠒⠒⠲⠶⢤⣄⡀
⠀⠀⠀⠀⠀⠀⣀⡴⠚⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠓⢦⣀
⠀⠀⠀⠀⣠⠞⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠳⣄
⠀⠀⢀⡼⠁⠀⠀⠀⠀⠀⣀⡤⠖⠚⠉⠉⠉⠉⠓⠲⢤⣀⠀⠀⠀⠀⠀⠈⢧⡀
⠀⢀⡞⠀⠀⠀⠀⠀⣠⠞⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠳⣄⠀⠀⠀⠀⠀⢳⡀
⠀⡾⠀⠀⠀⠀⠀⡼⠁⠀⣴⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢧⠀⠀⠀⠀⠀⢷
⢸⠇⠀⠀⠀⠀⣸⠁⠀⠀⠈⠻⣿⣦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⣇⠀⠀⠀⠀⠸⡇
⢸⠀⠀⠀⠀⠀⡇⠀⠀⠀⠀⠀⠈⠙⢿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⢸⠀⠀⠀⠀⠀⡇
⢸⠀⠀⠀⠀⠀⡇⠀⠀⠀⠀⠀⠀⠀⢀⡏⠙⠿⣦⣄⡀⠀⠀⠀⠀⢸⠀⠀⠀⠀⠀⡇
⢸⡆⠀⠀⠀⠀⢹⡀⠀⠀⠀⠀⠀⠀⡼⠀⠀⠀⠀⠉⠻⢶⣤⣀⢀⡏⠀⠀⠀⠀⢰⡇
⠀⢷⠀⠀⠀⠀⠀⢳⡀⠀⠀⠀⠀⣰⠃⠀⠀⠀⠀⠀⠀⠀⠈⢙⡿⣦⡄⠀⠀⠀⡾
⠀⠈⢧⠀⠀⠀⠀⠀⠙⢦⡀⠀⢠⠇⠀⠀⠀⠀⠀⠀⠀⢀⡴⠋⠀⠀⠀⠀⠀⡼⠁
⠀⠀⠈⢳⡀⠀⠀⠀⠀⠀⠉⢳⣾⣦⣀⣀⣀⣀⡤⠴⠚⠉⠀⠀⠀⠀⠀⢀⡞⠁
⠀⠀⠀⠀⠙⢦⡀⠀⠀⠀⠀⠀⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡴⠋
⠀⠀⠀⠀⠀⠀⠉⠳⢤⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⡤⠞⠉
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠓⠶⠦⠤⠤⠤⠤⠴⠶⠚⠋⠁`;
console.log(`%c${clock}`, "font: 12px/1.1 ui-monospace, Menlo, monospace; color: #da5328;");
console.log("%cSo, what are you looking at?", "font: 600 22px/1.4 Georgia, serif; font-style: italic;");
console.log("%cThe clock up there is the one on the page, drawn in Braille dots. Everything here is hand-made: plain HTML, CSS and a few small scripts, no framework.", "font: 13px/1.6 system-ui, sans-serif;");

// The keys that open the dev tools, view the source or save the page get a reply instead, and the
// colour squares jump. It's a joke, not a lock: the browser's menus still open all of them.
const pips = document.querySelector("[data-palette-switch]");
const REPLIES = {
  tools: "Nice try. The hood's already open, and everything's right here.",
  source: "View source? Scroll to the very top of the HTML. There's a clock.",
  save: "No need to save it. It'll be right here tomorrow.",
};
function reply(kind) {
  console.log(`%c${REPLIES[kind]}`, "font: italic 15px/1.5 Georgia, serif;");
  pips?.classList.remove("is-hinting");
  void pips?.offsetWidth; // restart the bump if it's mid-way
  pips?.classList.add("is-hinting");
  setTimeout(() => pips?.classList.remove("is-hinting"), 1200);
}
addEventListener("keydown", (e) => {
  const mod = e.metaKey || e.ctrlKey;
  let kind = "";
  if (e.key === "F12") kind = "tools";
  else if (mod && (e.shiftKey || e.altKey) && ["KeyI", "KeyJ", "KeyC"].includes(e.code)) kind = "tools";
  else if (mod && !e.shiftKey && e.code === "KeyU") kind = "source";
  else if (mod && !e.shiftKey && e.code === "KeyS") kind = "save";
  if (!kind) return;
  e.preventDefault();
  reply(kind);
});

// Oh, still going? That's all of it. Thanks for reading this far.
