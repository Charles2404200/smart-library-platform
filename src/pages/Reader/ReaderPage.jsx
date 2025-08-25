// src/pages/Reader/ReaderPage.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePub from 'epubjs';
import { useParams, useNavigate } from 'react-router-dom';
import { startSession, beaconProgress, beaconEnd } from '../../services/readerService';

const DEFAULT_EPUB = '/assets/fakebook.epub';

export default function ReaderPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();

  const viewerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);

  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [flow, setFlow] = useState('scrolled-doc'); // 'paginated' for page-by-page

  // --- small helper to debounce progress beacons
  const beaconTimer = useRef(null);
  const sendProgress = (id, sid, payload) => {
    clearTimeout(beaconTimer.current);
    beaconTimer.current = setTimeout(() => {
      beaconProgress(id, sid, payload);
    }, 400);
  };

  const init = useCallback(async () => {
    setBusy(true);
    setError('');

    const id = Number(bookId) > 0 ? Number(bookId) : 0;

    try {
      // Start analytics session (non-blocking)
      const res = await startSession(id, 'web');
      setSessionId(res.sessionId);

      // 1) Create epub Book & render quickly
      const book = ePub(DEFAULT_EPUB);
      bookRef.current = book;

      const rendition = book.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        flow,               
        spread: 'none',
        manager: 'continuous',
      });
      renditionRef.current = rendition;

      // Display ASAP (no locations yet)
      await rendition.display();

      // 2) Lightweight progress (before locations exist)
      rendition.on('relocated', (location) => {
        try {
          // quick % fallback (epub.js gives 0..1 sometimes)
          const quickPct = (location?.start?.percentage ?? 0) * 100;
          setPercent(Math.max(0, Math.min(100, Math.round(quickPct * 10) / 10)));
          if (res.sessionId) {
            sendProgress(id, res.sessionId, { pagePercent: quickPct, cfi: location?.start?.cfi || '' });
          }
        } catch {}
      });

      // 3) Generate locations in the background (can be slow on big books)
      //    Do it after initial render so UI is responsive.
      (async () => {
        try {
          await book.ready;
          await book.locations.generate(1500); // larger breakpoint = fewer locations = faster
          // Replace % with precise % when available
          rendition.on('relocated', (location) => {
            try {
              const cfi = location?.start?.cfi || '';
              let pct100 = 0;
              if (cfi && book.locations) {
                const p = book.locations.percentageFromCfi(cfi) || 0;
                pct100 = Math.round(p * 1000) / 10;
                setPercent(pct100);
                if (res.sessionId) sendProgress(id, res.sessionId, { pagePercent: pct100, cfi });
              }
            } catch {}
          });
        } catch {
          // locations are optional; keep going
        }
      })();

      // Arrow keys for navigation (works for both flows; harmless in scrolled)
      const onKey = (e) => {
        if (e.key === 'ArrowRight') {
          requestAnimationFrame(() => rendition.next());
        } else if (e.key === 'ArrowLeft') {
          requestAnimationFrame(() => rendition.prev());
        }
      };
      window.addEventListener('keydown', onKey);

      // Cleanup listener on re-init/unmount
      return () => window.removeEventListener('keydown', onKey);
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Unable to open the reader.');
    } finally {
      setBusy(false);
    }
  }, [bookId, flow]);

  useEffect(() => {
    let cleanupKeys;
    init().then((fn) => { cleanupKeys = fn; });

    return () => {
      // end session & free resources
      const id = Number(bookId) > 0 ? Number(bookId) : 0;
      if (sessionId) beaconEnd(id, sessionId);
      try {
        renditionRef.current?.destroy?.();
        bookRef.current?.destroy?.();
      } catch {}
      clearTimeout(beaconTimer.current);
      if (typeof cleanupKeys === 'function') cleanupKeys();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, flow]);

  const goBack = () => {
    const id = Number(bookId) > 0 ? Number(bookId) : 0;
    if (sessionId) beaconEnd(id, sessionId);
    navigate(-1);
  };

  const next = () => requestAnimationFrame(() => renditionRef.current?.next());
  const prev = () => requestAnimationFrame(() => renditionRef.current?.prev());

  return (
    <div className="h-screen flex flex-col">
      <div className="p-2 border-b flex items-center gap-3 bg-white">
        <button
          onClick={goBack}
          className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-800"
        >
          ← Back
        </button>

        <div className="flex-1 font-semibold text-indigo-700">
          EPUB Reader — {percent.toFixed(1)}%
        </div>

        <div className="flex items-center gap-2">
          <select
            value={flow}
            onChange={(e) => setFlow(e.target.value)}
            className="px-2 py-1 border rounded"
            title="Layout"
          >
            <option value="scrolled-doc">Scrolled (fast)</option>
            <option value="paginated">Paginated</option>
          </select>
          <button
            onClick={prev}
            className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200"
            disabled={busy}
          >
            ‹ Prev
          </button>
          <button
            onClick={next}
            className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200"
            disabled={busy}
          >
            Next ›
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-6 text-red-600">{error}</div>
      ) : (
        <div
          ref={viewerRef}
          className="flex-1 w-full overflow-hidden bg-gray-50"
          style={{
            // Keep layout stable and GPU-hint for smoother scroll
            contain: 'layout paint size',
            willChange: 'transform',
          }}
        />
      )}
    </div>
  );
}
