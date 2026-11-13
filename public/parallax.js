// Pointer parallax for the top layer. Depth comes from each element's --depth (px at the edge).
// Off for touch screens and for visitors who prefer reduced motion.
const fine = matchMedia("(hover: hover) and (pointer: fine)");
const calm = matchMedia("(prefers-reduced-motion: reduce)");

if (fine.matches && !calm.matches) {
  const root = document.documentElement;
  let tx = 0, ty = 0, x = 0, y = 0, frame = 0;

  const step = () => {
    // Ease toward the pointer so the layers glide rather than snap.
    x += (tx - x) * 0.08;
    y += (ty - y) * 0.08;
    root.style.setProperty("--px", x.toFixed(4));
    root.style.setProperty("--py", y.toFixed(4));
    frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(step) : 0;
  };

  addEventListener("pointermove", (e) => {
    tx = (e.clientX / innerWidth) * 2 - 1;
    ty = (e.clientY / innerHeight) * 2 - 1;
    if (!frame) frame = requestAnimationFrame(step);
  }, { passive: true });

  document.addEventListener("pointerleave", () => {
    tx = 0; ty = 0;
    if (!frame) frame = requestAnimationFrame(step);
  });
}
