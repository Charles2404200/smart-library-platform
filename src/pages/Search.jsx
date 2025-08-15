import React, { useState } from 'react';
import { searchBooks } from '../services/searchService';

export default function Search() {
  const [filters, setFilters] = useState({ title: '', author: '', genre: '', publisher: '' });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await searchBooks(filters);
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-page" style={{ padding: '20px' }}>
      <h1>Search Books</h1>
      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        <input
          name="title"
          placeholder="Title"
          value={filters.title}
          onChange={handleChange}
          style={{ marginRight: '10px' }}
        />
        <input
          name="author"
          placeholder="Author"
          value={filters.author}
          onChange={handleChange}
          style={{ marginRight: '10px' }}
        />
        <input
          name="genre"
          placeholder="Genre"
          value={filters.genre}
          onChange={handleChange}
          style={{ marginRight: '10px' }}
        />
        <input
          name="publisher"
          placeholder="Publisher"
          value={filters.publisher}
          onChange={handleChange}
          style={{ marginRight: '10px' }}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {results.length > 0 ? (
        <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Authors</th>
              <th>Publisher</th>
              <th>Genre</th>
              <th>Available Copies</th>
            </tr>
          </thead>
          <tbody>
            {results.map((book) => (
              <tr key={book.id}>
                <td>{book.title}</td>
                <td>{book.authors}</td>
                <td>{book.publisher}</td>
                <td>{book.genre}</td>
                <td>{book.available_copies}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        !loading && <p>No results found</p>
      )}
    </div>
  );
}
