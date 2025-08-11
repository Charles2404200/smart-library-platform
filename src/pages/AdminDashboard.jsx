import React from 'react';
import BookManager from '../components/BookManager'; // Import component quản lý sách
// Bạn có thể tạo và import component xem log tương tự ở đây

export default function AdminDashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-indigo-700">🛠 Admin Dashboard</h1>

      {/* Khu vực Quản lý Sách */}
      <BookManager />

      <hr className="my-12" />

      {/* Khu vực Xem Logs (bạn có thể tạo component LogsViewer.jsx và đặt vào đây) */}
      {/* <LogsViewer /> */}
    </div>
  );
}