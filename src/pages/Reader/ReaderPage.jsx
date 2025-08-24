// src/pages/Reader/ReaderPage.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePub from 'epubjs';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { openEbook, sendProgress, sendEnd } from '../../services/readerService';

const DEFAULT_EPUB = '/assets/default.epub';

export default function ReaderPage() {
  const { bookId: paramId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // accept :bookId OR state.bookId OR ?bookId=... ; fallback to 0
  const rawId =
    paramId ??
    location.state?.bookId ??
    new URLSearchParams(location.search).get('bookId');
  const id = Number.parseInt(rawId, 10) || 0;

  const viewerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);

  const [sessionId, setSessionId] = useState('');
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const init = useCallback(async () => {
    setBusy(true);
    setError('');

    try {
      // 1) Get fileUrl + session id from ebooks API
      const { sessionId: sid, fileUrl } = await openEbook(id);
      setSessionId(sid);

      // 2) Load the EPUB (use backend-provided file or fallback)
      const src = fileUrl || DEFAULT_EPUB;
      const book = ePub(src);
      bookRef.current = book;

      const rendition = book.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        spread: 'auto',
        flow: 'paginated',
      });
      renditionRef.current = rendition;

      await rendition.display();
      await book.ready;
      await book.locations.generate(1024);

      rendition.on('relocated', (location) => {
        let pct = 0;
        try {
          const cfi = location?.start?.cfi || '';
          pct = cfi ? (book.locations.percentageFromCfi(cfi) || 0) : (location?.start?.percentage || 0);
          pct = Math.round(pct * 1000) / 10; // 0.0..100.0
          setPercent(pct);
          if (sid) sendProgress(id, sid, { pagePercent: pct, cfi });
        } catch {}
      });
    } catch (e) {
      setError(e?.message || 'Unable to open the reader.');
    } finally {
      setBusy(false);
    }
  }, [id]);

  useEffect(() => {
    init();
    return () => {
      if (sessionId) sendEnd(id, sessionId);
      try { renditionRef.current?.destroy?.(); bookRef.current?.destroy?.(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [init]);

  const goBack = () => { if (sessionId) sendEnd(id, sessionId); navigate(-1); };
  const next = () => renditionRef.current?.next();
  const prev = () => renditionRef.current?.prev();

  return (
    <div className="h-screen flex flex-col">
      <div className="p-2 border-b flex items-center gap-3 bg-white">
        <button onClick={goBack} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200">← Back</button>
        <div className="flex-1 font-semibold text-indigo-700">EPUB Reader — {percent.toFixed(1)}%</div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200" disabled={busy}>‹ Prev</button>
          <button onClick={next} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200" disabled={busy}>Next ›</button>
        </div>
      </div>

      {error ? (
        <div className="p-6 text-red-600">{error}</div>
      ) : (
        <div ref={viewerRef} className="flex-1 w-full overflow-hidden bg-gray-50" />
      )}
    </div>
  );
}
