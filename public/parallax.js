// Moves the second print plate (the ring-colour layer under the ink, and the target's core) by
// setting --px/--py from -1 to 1. The ink itself stays still.
// With a mouse the plate follows the pointer. On phones and tablets it follows the tilt of the
// device, and a swipe across the page pushes it around until the finger lifts.
// iOS only reports tilt after the visitor allows it, so the first tap on an empty part of the page
// asks once. Off for visitors who prefer reduced motion.
const calm = matchMedia("(prefers-reduced-motion: reduce)");
const fine = matchMedia("(hover: hover) and (pointer: fine)");
const INTERACTIVE = "a, button, .dots, .scrub, .sign";

if (!calm.matches) {
  const root = document.documentElement;
  let tx = 0, ty = 0, x = 0, y = 0, frame = 0;
  const clamp = (n) => Math.max(-1, Math.min(1, n));

  const step = () => {
    // Ease toward the target so the plate glides rather than snaps.
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
  } else {
    // Tilt sets where the plate rests; a swipe pushes it from there while the finger is down.
    let rest = { x: 0, y: 0 };
    let swipe = null;

    if ("DeviceOrientationEvent" in window) {
      let level = null; // how the phone was held at the first reading
      const tilt = (e) => {
        if (e.beta == null || e.gamma == null) return;
        level ??= { beta: e.beta, gamma: e.gamma };
        rest = { x: (e.gamma - level.gamma) / 20, y: (e.beta - level.beta) / 20 };
        if (!swipe) aim(rest.x, rest.y);
      };
      const listen = () => addEventListener("deviceorientation", tilt);

      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        const ask = (e) => {
          if (e.target.closest(INTERACTIVE)) return;
          removeEventListener("pointerup", ask);
          DeviceOrientationEvent.requestPermission()
            .then((state) => { if (state === "granted") listen(); })
            .catch(() => { /* declined or unavailable: tilt stays off, swipes still work */ });
        };
        addEventListener("pointerup", ask);
      } else {
        listen();
      }
    }

    addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" || e.target.closest(INTERACTIVE)) return;
      swipe = { x: e.clientX, y: e.clientY };
    }, { passive: true });
    addEventListener("pointermove", (e) => {
      if (!swipe) return;
      // A swipe of about a third of the screen pushes the plate all the way
      const reach = Math.min(innerWidth, innerHeight) / 3;
      aim(rest.x + (e.clientX - swipe.x) / reach, rest.y + (e.clientY - swipe.y) / reach);
    }, { passive: true });
    const lift = () => { if (swipe) { swipe = null; aim(rest.x, rest.y); } };
    addEventListener("pointerup", lift);
    addEventListener("pointercancel", lift);
  }
}
