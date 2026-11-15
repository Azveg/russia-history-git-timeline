import { useEffect, useRef, type RefObject } from 'react';

function findScrollableZone(
  target: EventTarget | null,
  zones: Array<RefObject<HTMLElement | null>>,
): HTMLElement | null {
  if (!(target instanceof Node)) return null;
  for (const ref of zones) {
    const el = ref.current;
    if (el && el.contains(target)) {
      return el;
    }
  }
  return null;
}

function shouldPreventWheelBoundary(el: HTMLElement, deltaY: number): boolean {
  if (deltaY === 0) return false;
  const { scrollTop, scrollHeight, clientHeight } = el;
  if (scrollHeight <= clientHeight + 1) return true;
  if (deltaY < 0 && scrollTop <= 0) return true;
  if (deltaY > 0 && scrollTop + clientHeight >= scrollHeight - 1) return true;
  return false;
}

/**
 * Изолирует вертикальный скролл колесом мыши внутри активного элемента (например, боковой панели «Ветка правителей»),
 * не допуская проброса прокрутки на основную страницу на верхней и нижней границах.
 */
export function useWheelScrollContainment(
  containerRef: RefObject<HTMLElement | null>,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      if (!el) return;
      if (shouldPreventWheelBoundary(el, e.deltaY)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef, enabled]);
}

/**
 * Блокирует прокрутку фоновой страницы и ограничивает колесо мыши строго перечисленными
 * прокручиваемыми зонами внутри активного модального или выпадающего окна.
 * Более вложенные зоны следует передавать в массиве раньше родительских.
 */
export function useOverlayScrollLock(
  isOpen: boolean,
  scrollableZones: Array<RefObject<HTMLElement | null>>,
) {
  const zonesRef = useRef(scrollableZones);
  zonesRef.current = scrollableZones;

  useEffect(() => {
    if (!isOpen) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - html.clientWidth;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    function handleWindowWheel(e: WheelEvent) {
      if (e.deltaY === 0) return;
      const activeZone = findScrollableZone(e.target, zonesRef.current);
      if (!activeZone || shouldPreventWheelBoundary(activeZone, e.deltaY)) {
        e.preventDefault();
      }
    }

    window.addEventListener('wheel', handleWindowWheel, { passive: false, capture: true });
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
      window.removeEventListener('wheel', handleWindowWheel, true);
    };
  }, [isOpen]);
}
