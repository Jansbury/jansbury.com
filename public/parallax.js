// Parallax for the top layer. Depth comes from each element's --depth (px at the edge).
// With a mouse the layers follow the pointer; on phones and tablets they follow the tilt of the
// device. iOS only reports tilt after the visitor allows it, so the first tap on an empty part of
// the page asks once. Off for visitors who prefer reduced motion.
const calm = matchMedia("(prefers-reduced-motion: reduce)");
const fine = matchMedia("(hover: hover) and (pointer: fine)");

if (!calm.matches) {
  const root = document.documentElement;
  let tx = 0, ty = 0, x = 0, y = 0, frame = 0;
  const clamp = (n) => Math.max(-1, Math.min(1, n));

  const step = () => {
    // Ease toward the target so the layers glide rather than snap.
    x += (tx - x) * 0.08;
    y += (ty - y) * 0.08;
    root.style.setProperty("--px", x.toFixed(4));
    root.style.setProperty("--py", y.toFixed(4));
    frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(step) : 0;
  };
  const aim = (nx, ny) => {
    tx = clamp(nx); ty = clamp(ny);
    if (!frame) frame = requestAnimationFrame(step);
  };

  if (fine.matches) {
    addEventListener("pointermove", (e) => {
      aim((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    }, { passive: true });
    document.addEventListener("pointerleave", () => aim(0, 0));
  } else if ("DeviceOrientationEvent" in window) {
    // Tilt is measured from how the phone was held when the first reading came in.
    let rest = null;
    const tilt = (e) => {
      if (e.beta == null || e.gamma == null) return;
      rest ??= { beta: e.beta, gamma: e.gamma };
      aim((e.gamma - rest.gamma) / 20, (e.beta - rest.beta) / 20);
    };
    const listen = () => addEventListener("deviceorientation", tilt);

    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const ask = (e) => {
        if (e.target.closest("a, button, .dots, .scrub, .sign")) return;
        removeEventListener("pointerup", ask);
        DeviceOrientationEvent.requestPermission()
          .then((state) => { if (state === "granted") listen(); })
          .catch(() => { /* declined or unavailable: the page just stays still */ });
      };
      addEventListener("pointerup", ask);
    } else {
      listen();
    }
  }
}
