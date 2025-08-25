import React, { useEffect, useMemo, useState } from 'react';
import { http } from '../../services/http';

// helper to build query string
function qs(params = {}) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    p.set(k, String(v));
  });
  return p.toString();
}

function Card({ title, children, right }) {
  return (
    <div className="bg-white border rounded-xl shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Table({ cols, rows, keyField }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {cols.map((c) => (
              <th key={c.key} className="text-left px-3 py-2 font-medium">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-3 text-gray-500" colSpan={cols.length}>No data</td>
            </tr>
          ) : rows.map((r, i) => (
            <tr key={r[keyField] ?? i} className="hover:bg-gray-50">
              {cols.map((c) => (
                <td key={c.key} className="px-3 py-2">
                  {c.render ? c.render(r[c.key], r) : String(r[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminAnalytics() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [limit, setLimit] = useState(10);

  const [avgData, setAvgData] = useState([]);
  const [hlData, setHlData] = useState([]);
  const [topData, setTopData] = useState([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const commonParams = useMemo(() => {
    const p = { from, to };
    if (limit && !Number.isNaN(Number(limit))) p.limit = Number(limit);
    return p;
  }, [from, to, limit]);

  async function loadReports() {
    setLoading(true);
    setErr('');
    try {
      const [avg, hl, top] = await Promise.all([
        http(`/api/analytics/reports/avg-session-time?${qs(commonParams)}`),
        http(`/api/analytics/reports/most-highlighted?${qs(commonParams)}`),
        http(`/api/analytics/reports/top-books-time?${qs(commonParams)}`),
      ]);
      setAvgData(Array.isArray(avg?.data) ? avg.data : []);
      setHlData(Array.isArray(hl?.data) ? hl.data : []);
      setTopData(Array.isArray(top?.data) ? top.data : []);
    } catch (e) {
      setErr(e.message || 'Failed to load analytics');
      setAvgData([]);
      setHlData([]);
      setTopData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadReports, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, limit]);

  const csvLink = (endpoint) =>
    `${endpoint}?${qs({ ...commonParams, format: 'csv' })}`;

  return (
    <div className="space-y-6">
      {/* Filter controls */}
      <Card title="Reading Analytics" right={
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
          <label className="text-sm text-gray-600">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
          <label className="text-sm text-gray-600">Limit</label>
          <input
            type="number"
            min={1}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) || 10)}
            className="w-20 border rounded px-2 py-1 text-sm"
          />
          <button
            onClick={loadReports}
            className="ml-2 px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
          >
            Refresh
          </button>
        </div>
      }>
        <p className="text-sm text-gray-600">
          View reading trends, highlights, and session time analytics for your library.
        </p>
      </Card>

      {loading ? (
        <div className="text-gray-500">Loading reports...</div>
      ) : err ? (
        <div className="text-red-600">{err}</div>
      ) : (
        <>
          {/* Avg session time */}
          <Card title="Average Session Time per User" right={
            <a
              className="text-sm text-indigo-600 hover:underline"
              href={csvLink('/api/analytics/reports/avg-session-time')}
              target="_blank"
              rel="noreferrer"
            >
              Download CSV
            </a>
          }>
            <Table
              keyField="userId"
              cols={[
                { key: 'userId', label: 'User ID' },
                { key: 'sessions', label: 'Sessions' },
                { key: 'avgSessionMinutes', label: 'Avg Minutes' },
                { key: 'avgSessionMs', label: 'Avg (ms)' },
              ]}
              rows={avgData}
            />
          </Card>

          {/* Most highlighted books */}
          <Card title="Most Highlighted Books" right={
            <a
              className="text-sm text-indigo-600 hover:underline"
              href={csvLink('/api/analytics/reports/most-highlighted')}
              target="_blank"
              rel="noreferrer"
            >
              Download CSV
            </a>
          }>
            <Table
              keyField="bookId"
              cols={[
                { key: 'bookId', label: 'Book ID' },
                { key: 'highlightsCount', label: 'Highlights' },
              ]}
              rows={hlData}
            />
          </Card>

          {/* Top books by time */}
          <Card title="Top Books by Total Reading Time" right={
            <a
              className="text-sm text-indigo-600 hover:underline"
              href={csvLink('/api/analytics/reports/top-books-time')}
              target="_blank"
              rel="noreferrer"
            >
              Download CSV
            </a>
          }>
            <Table
              keyField="bookId"
              cols={[
                { key: 'bookId', label: 'Book ID' },
                { key: 'sessions', label: 'Sessions' },
                { key: 'totalHours', label: 'Total Hours' },
                { key: 'totalMs', label: 'Total (ms)' },
              ]}
              rows={topData}
            />
          </Card>
        </>
      )}
    </div>
  );
}
