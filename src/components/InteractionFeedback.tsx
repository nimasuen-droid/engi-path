import { useEffect } from "react";

export function InteractionFeedback() {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest(
        "button, a, [role='button'], input[type='radio'], input[type='checkbox']",
      );
      if (!(control instanceof HTMLElement)) return;
      control.classList.add("is-pressing");
      window.setTimeout(() => control.classList.remove("is-pressing"), 180);
      if ("vibrate" in navigator) {
        navigator.vibrate(8);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, { passive: true });
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return null;
}
