import React from 'react';

export default function DashboardPage({ user }) {
  if (!user) {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold">Please log in to see your dashboard.</h1>
        </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-indigo-700">
        Welcome, {user.name || user.email}!
      </h1>
      <p className="text-lg text-gray-600">This is your personal dashboard. From here, you can manage your borrowed books and account settings.</p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-2">My Profile</h2>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-2">Quick Actions</h2>
          <ul className="list-disc list-inside text-indigo-600">
            <li><a href="/books" className="hover:underline">Browse All Books</a></li>
            <li><a href="/borrowed" className="hover:underline">View My Borrowed Books</a></li>
            <li><a href="/search" className="hover:underline">Search for a New Book</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
}