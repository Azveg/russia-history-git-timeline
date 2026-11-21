import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  ':is(button, [href], input, select, textarea, [tabindex]):not([disabled], [tabindex="-1"], [hidden])';

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => element.offsetParent !== null || element === document.activeElement);
}

let activeScrollLocks = 0;
let initialBodyOverflow = '';
const activeModalStack: symbol[] = [];

function acquireBodyScrollLock(): void {
  if (typeof document === 'undefined') return;
  if (activeScrollLocks === 0) {
    initialBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  activeScrollLocks += 1;
}

function releaseBodyScrollLock(): void {
  if (typeof document === 'undefined') return;
  activeScrollLocks = Math.max(0, activeScrollLocks - 1);
  if (activeScrollLocks === 0) {
    document.body.style.overflow = initialBodyOverflow;
  }
}

export function useModalFocusTrap<T extends HTMLElement = HTMLDivElement>(onClose: () => void) {
  const dialogRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const modalToken = Symbol('modal');
    activeModalStack.push(modalToken);
    acquireBodyScrollLock();

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const container = dialogRef.current;
    if (container && !container.contains(document.activeElement)) {
      const [initialFocusable] = focusableWithin(container);
      if (initialFocusable) {
        initialFocusable.focus();
      } else {
        container.focus();
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      // Only the topmost active modal handles Escape / Tab cycling
      if (activeModalStack[activeModalStack.length - 1] !== modalToken) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = focusableWithin(dialogRef.current);

        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first || !dialogRef.current.contains(document.activeElement)) {
            event.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last || !dialogRef.current.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      const stackIdx = activeModalStack.lastIndexOf(modalToken);
      if (stackIdx !== -1) {
        activeModalStack.splice(stackIdx, 1);
      }
      releaseBodyScrollLock();
      if (
        activeModalStack.length === 0 &&
        previouslyFocused &&
        previouslyFocused.isConnected &&
        typeof previouslyFocused.focus === 'function'
      ) {
        previouslyFocused.focus();
      }
    };
  }, []);

  return dialogRef;
}
