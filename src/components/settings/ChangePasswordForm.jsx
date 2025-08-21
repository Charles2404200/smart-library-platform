import React from 'react';
import Button from '../ui/Button';

export default function ChangePasswordForm({
  oldPassword,
  newPassword,
  confirmPassword,
  onOldPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  isSaving,
}) {
  return (
    <div className="bg-white p-6 border rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Change Password</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="Current Password"
          className="w-full border-gray-300 rounded-lg p-2"
          value={oldPassword}
          onChange={onOldPasswordChange}
          required
        />
        <input
          type="password"
          placeholder="New Password"
          className="w-full border-gray-300 rounded-lg p-2"
          value={newPassword}
          onChange={onNewPasswordChange}
          required
        />
        <input
          type="password"
          placeholder="Confirm New Password"
          className="w-full border-gray-300 rounded-lg p-2"
          value={confirmPassword}
          onChange={onConfirmPasswordChange}
          required
        />
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save New Password'}
        </Button>
      </form>
    </div>
  );
}