import { useRef, useState, type ReactNode } from "react";

/**
 * Touch + mouse drag-to-reveal action. Reveals an action panel on the right
 * when dragged left. Tap the row to close it again.
 */
export function SwipeRow({
  children,
  onAction,
  actionLabel = "Delete",
  actionTone = "destructive",
  threshold = 70,
  maxOffset = 88,
}: {
  children: ReactNode;
  onAction: () => void;
  actionLabel?: string;
  actionTone?: "destructive" | "neutral";
  threshold?: number;
  maxOffset?: number;
}) {
  const startX = useRef<number | null>(null);
  const startOffset = useRef(0);
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    startOffset.current = offset;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    const next = Math.max(-maxOffset, Math.min(0, startOffset.current + dx));
    setOffset(next);
  }
  function onPointerUp() {
    startX.current = null;
    if (Math.abs(offset) > threshold) {
      setOffset(-maxOffset);
      setOpen(true);
    } else {
      setOffset(0);
      setOpen(false);
    }
  }

  function handleRowClick() {
    if (open) {
      setOffset(0);
      setOpen(false);
    }
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          onClick={onAction}
          className={`${actionTone === "destructive" ? "bg-loss text-white" : "bg-[#1f1f1f] text-ink"} text-sm font-medium px-5 hover:brightness-110 active:brightness-90 transition`}
          style={{ width: maxOffset }}
        >
          {actionLabel}
        </button>
      </div>
      <div
        className="relative bg-bg select-none"
        style={{
          transform: `translateX(${offset}px)`,
          transition: startX.current === null ? "transform 240ms cubic-bezier(.22,1,.36,1)" : "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={handleRowClick}
      >
        {children}
      </div>
    </div>
  );
}
