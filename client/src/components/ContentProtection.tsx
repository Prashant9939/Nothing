import { useEffect } from 'react';

const isEditable = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return !!el.closest('input, textarea, select, [contenteditable="true"]');
};

export default function ContentProtection() {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      if (!isEditable(e.target)) e.preventDefault();
    };
    const onDragStart = (e: DragEvent) => e.preventDefault();
    const onCopy = (e: ClipboardEvent) => {
      if (!isEditable(e.target)) e.preventDefault();
    };
    const onCut = (e: ClipboardEvent) => {
      if (!isEditable(e.target)) e.preventDefault();
    };
    const onPaste = (e: ClipboardEvent) => {
      if (!isEditable(e.target)) e.preventDefault();
    };
    const onSelectStart = (e: Event) => {
      if (!isEditable(e.target)) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (key === 'f12') { e.preventDefault(); return; }
      if (ctrl && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) { e.preventDefault(); return; }
      if (ctrl && (key === 'u' || key === 's' || key === 'p')) { e.preventDefault(); return; }
      if (ctrl && key === 'a' && !isEditable(e.target)) { e.preventDefault(); return; }
      if (ctrl && (key === 'c' || key === 'x') && !isEditable(e.target)) { e.preventDefault(); }
    };

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    document.addEventListener('selectstart', onSelectStart);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('selectstart', onSelectStart);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return null;
}
