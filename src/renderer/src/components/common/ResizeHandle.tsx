import { useRef, useCallback } from "react";
import "./ResizeHandle.css";

export function ResizeHandle(): React.JSX.Element {
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startPos.current = { x: e.screenX, y: e.screenY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!startPos.current) return;
    const dx = e.screenX - startPos.current.x;
    const dy = e.screenY - startPos.current.y;
    if (dx !== 0 || dy !== 0) {
      window.electronAPI.window.resize(dx, dy);
      startPos.current = { x: e.screenX, y: e.screenY };
    }
  }, []);

  const onPointerUp = useCallback(() => {
    startPos.current = null;
  }, []);

  return (
    <div
      className="resize-handle"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <svg width="12" height="12" viewBox="0 0 12 12">
        <path
          d="M11 1L1 11M11 5L5 11M11 9L9 11"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    </div>
  );
}
