// src/components/admin/UsersTable.jsx
import React from 'react';

/**
 * UsersTable
 * Props:
 *  - users: Array<User>
 *  - loading: boolean
 *
 * NOTE: Role-changing UI has been removed per request.
 */
export default function UsersTable({ users = [], loading = false /* onChangeRole */ }) {
  return (
    <div className="bg-white border rounded-xl shadow p-5">
      <h2 className="text-xl font-semibold mb-4">👥 Users</h2>
      {loading ? (
        <p className="text-gray-500">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-300 shadow-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id ?? u._id} className="border-t align-top">
                  <td className="px-3 py-2">{u.id ?? u._id}</td>
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize">
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
