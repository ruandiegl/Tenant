import { useEffect } from "react";

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const isInsideModal = (target: EventTarget | null) => {
      return target instanceof Element && Boolean(target.closest(".modal-card"));
    };

    const preventBackgroundWheel = (event: WheelEvent) => {
      if (!isInsideModal(event.target)) {
        event.preventDefault();
      }
    };

    const preventBackgroundTouch = (event: TouchEvent) => {
      if (!isInsideModal(event.target)) {
        event.preventDefault();
      }
    };

    const preventBackgroundKeys = (event: KeyboardEvent) => {
      const scrollKeys = [" ", "ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"];

      if (scrollKeys.includes(event.key) && !isInsideModal(document.activeElement)) {
        event.preventDefault();
      }
    };

    window.addEventListener("wheel", preventBackgroundWheel, { passive: false, capture: true });
    window.addEventListener("touchmove", preventBackgroundTouch, { passive: false, capture: true });
    window.addEventListener("keydown", preventBackgroundKeys, { capture: true });

    return () => {
      window.removeEventListener("wheel", preventBackgroundWheel, { capture: true });
      window.removeEventListener("touchmove", preventBackgroundTouch, { capture: true });
      window.removeEventListener("keydown", preventBackgroundKeys, { capture: true });
    };
  }, [active]);
}
