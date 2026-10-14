import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn } from 'lucide-react';

// A thumbnail that opens a full-screen, zoomable viewer when tapped — instead
// of kicking the user out to a raw /api/uploads URL in a new browser tab.
export function ViewableImage({
  src,
  alt = '',
  className = '',
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View image full screen"
        className="group pressable relative block cursor-zoom-in overflow-hidden rounded-2xl"
      >
        <img src={src} alt={alt} className={className} />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
          <ZoomIn size={22} className="text-white drop-shadow" />
        </span>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-[fadein_160ms_ease-out]"
            onClick={() => setOpen(false)}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="pressable absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-white/10"
            >
              <X size={22} />
            </button>
            <img
              src={src}
              alt={alt}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] max-w-full rounded-2xl object-contain animate-[popin_200ms_ease-out]"
            />
          </div>,
          document.body,
        )}
    </>
  );
}
