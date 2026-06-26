'use client';
// useEnterToNext — fundamental Tally behaviour: pressing Enter in any input
// moves focus to the next logical input field, exactly like Tab.
// Attach to any form container by passing its ref.

import { useEffect, RefObject } from 'react';

const FOCUSABLE = [
  'input:not([type="hidden"]):not([disabled]):not([readonly])',
  'select:not([disabled])',
  'textarea[data-enter-ok]', // only textareas explicitly marked
].join(', ');

export function useEnterToNext(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // TypeScript narrowing: create a local const that TS knows is non-null
    const containerEl = container;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter') return;

      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();

      // Let Enter work normally on buttons
      if (tag === 'button') return;
      // Let Enter work normally on textareas unless marked
      if (tag === 'textarea' && !target.hasAttribute('data-enter-next')) return;
      // Skip if a modifier is held (allow Cmd+Enter for form submit etc.)
      if (e.metaKey || e.ctrlKey) return;

      // Prevent form submit
      e.preventDefault();

      // Get all focusable fields in DOM order within the container
      const fields = Array.from(
        containerEl.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter(el => {
        const style = window.getComputedStyle(el);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          !el.closest('[aria-hidden="true"]') &&
          (el as HTMLElement).offsetParent !== null
        );
      });

      const currentIndex = fields.indexOf(target);
      if (currentIndex === -1) return;

      const next = fields[currentIndex + 1];
      if (next) {
        next.focus();
        // Select all text so user can type immediately
        if (next instanceof HTMLInputElement) {
          next.select();
        }
      }
    }

    // Capture phase so it fires before any element-level handlers
    containerEl.addEventListener('keydown', handleKeyDown, true);
    return () => containerEl.removeEventListener('keydown', handleKeyDown, true);
  }, [containerRef]);
}
