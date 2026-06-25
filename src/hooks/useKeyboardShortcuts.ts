'use client';
import { useEffect } from 'react';

type Handler = (e: KeyboardEvent) => void;

export function useKeyboardShortcuts(handlers: Record<string, Handler>) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      const inInput = ['input', 'textarea', 'select'].includes(tag);

      const key = [
        e.ctrlKey && 'ctrl',
        e.altKey && 'alt',
        e.shiftKey && 'shift',
        e.key.toLowerCase(),
      ].filter(Boolean).join('+');

      if (handlers[key]) {
        const globalKeys = ['ctrl+g','alt+g','f1','f2','f3','f11','f12','ctrl+n','ctrl+q','ctrl+p','ctrl+e','escape'];
        if (inInput && !globalKeys.includes(key)) return;
        e.preventDefault();
        handlers[key](e);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
