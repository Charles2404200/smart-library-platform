// src/components/search/SearchForm.jsx
import React from 'react';

export default function SearchForm({ filters, setFilters, onSearch, onClear, loading }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSearch && onSearch(); }} className="mb-6 bg-white rounded-lg shadow p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          name="title"
          value={filters.title}
          onChange={(e) => setFilters((p) => ({ ...p, title: e.target.value }))}
          placeholder="Title"
          className="border rounded px-3 py-2"
        />
        <input
          name="author"
          value={filters.author}
          onChange={(e) => setFilters((p) => ({ ...p, author: e.target.value }))}
          placeholder="Author"
          className="border rounded px-3 py-2"
        />
        <input
          name="genre"
          value={filters.genre}
          onChange={(e) => setFilters((p) => ({ ...p, genre: e.target.value }))}
          placeholder="Genre"
          className="border rounded px-3 py-2"
        />
        <input
          name="publisher"
          value={filters.publisher}
          onChange={(e) => setFilters((p) => ({ ...p, publisher: e.target.value }))}
          placeholder="Publisher"
          className="border rounded px-3 py-2"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          onClick={(e) => { e.preventDefault(); onSearch && onSearch(); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onClear && onClear(); }}
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded"
          disabled={loading}
        >
          Clear
        </button>
      </div>
    </form>
  );
}
