import React, { useState } from 'react';

export default function SearchPage({ user }) {
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('title');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSearched(true);
        // This is a client-side search simulation.
        // For a full implementation, you would fetch all books and then filter,
        // or have a dedicated backend search endpoint.
        try {
            const res = await fetch('http://localhost:4000/api/books');
            const books = await res.json();
            
            const filteredBooks = books.filter(book => {
                const searchField = book[filter] ? book[filter].toLowerCase() : (book.authors ? book.authors.toLowerCase() : '');
                return searchField.includes(query.toLowerCase());
            });

            setResults(filteredBooks);
        } catch (err) {
            console.error("Search failed:", err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-indigo-700">🔎 Search for Books</h1>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-8">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter search term..."
                    className="flex-grow border rounded-lg px-4 py-2"
                    required
                />
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded-lg px-4 py-2 bg-white">
                    <option value="title">Title</option>
                    <option value="authors">Author</option>
                    <option value="genre">Genre</option>
                </select>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                    Search
                </button>
            </form>

            {loading ? (
                <p>Searching...</p>
            ) : searched && results.length === 0 ? (
                <p className="text-center text-red-500">No books found matching your criteria.</p>
            ) : (
                <div className="space-y-4">
                    {results.map(book => (
                        <div key={book.id} className="bg-white p-4 border rounded-lg shadow-sm">
                            <h2 className="text-xl font-semibold text-indigo-600">{book.title}</h2>
                            <p className="text-gray-700">by {book.authors}</p>
                            <p className="text-sm text-gray-500">Genre: {book.genre} | Publisher: {book.publisher}</p>
                            <p className="text-sm text-green-600">{book.available_copies} available</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}