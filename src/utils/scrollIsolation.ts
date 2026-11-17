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
 * прокручиваемыми зонами внутри активного модального или выпадающего окна без сброса позиции скролла документа.
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

    const lockedScrollY = window.scrollY;
    const lockedScrollX = window.scrollX;

    function handleWindowWheel(e: WheelEvent) {
      if (e.deltaY === 0) return;
      const activeZone = findScrollableZone(e.target, zonesRef.current);
      if (!activeZone || shouldPreventWheelBoundary(activeZone, e.deltaY)) {
        e.preventDefault();
      }
    }

    function handleWindowScroll() {
      if (Math.abs(window.scrollY - lockedScrollY) > 1) {
        window.scrollTo(lockedScrollX, lockedScrollY);
      }
    }

    window.addEventListener('wheel', handleWindowWheel, { passive: false, capture: true });
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWindowWheel, true);
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, [isOpen]);
}

/**
 * Сохраняет визуальную позицию пользователя на странице при клике по закрепленным фильтрам или переключении веток.
 * Если пользователь прокрутил таймлайн вниз, находит опорный видимый элемент таймлайна (или сохраняет scrollY)
 * и компенсирует смещение высоты документа после обновления состояния.
 */
export function preserveViewportScrollAnchor(action: () => void) {
  const initialScrollY = window.scrollY;
  const rawTopBarHeight = parseInt(
    window.getComputedStyle(document.documentElement).getPropertyValue('--top-bar-height'),
    10,
  );
  const stickyOffset = Number.isFinite(rawTopBarHeight) ? rawTopBarHeight + 24 : 76;

  let anchorEl: HTMLElement | null = null;
  let anchorInitialTop = 0;

  if (initialScrollY > 40) {
    const candidates = document.querySelectorAll<HTMLElement>(
      '[data-ruler-context], .commit-row[id]',
    );
    for (let i = 0; i < candidates.length; i += 1) {
      const rect = candidates[i].getBoundingClientRect();
      if (rect.bottom > stickyOffset + 8 && rect.top < window.innerHeight) {
        anchorEl = candidates[i];
        anchorInitialTop = rect.top;
        break;
      }
    }
  }

  action();

  if (initialScrollY <= 0) return;

  window.requestAnimationFrame(() => {
    if (anchorEl && document.body.contains(anchorEl)) {
      const nextRect = anchorEl.getBoundingClientRect();
      const delta = nextRect.top - anchorInitialTop;
      if (Math.abs(delta) > 1) {
        window.scrollBy({ top: delta, left: 0, behavior: 'instant' as ScrollBehavior });
      }
    } else if (Math.abs(window.scrollY - initialScrollY) > 2) {
      window.scrollTo({ top: initialScrollY, left: 0, behavior: 'instant' as ScrollBehavior });
    }
  });
}

