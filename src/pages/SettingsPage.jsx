import React, { useEffect, useState } from 'react';
import { getMyProfile, updateMyProfile, uploadAvatar, changePassword } from '../services/userService';
import { storage } from '../utils/storage';
import { API_URL } from '../config/env';
import ProfilePicture from '../components/settings/ProfilePicture';
import ProfileInformation from '../components/settings/ProfileInformation';
import ChangePasswordForm from '../components/settings/ChangePasswordForm';


export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    getMyProfile().then(data => {
      if (data) {
        setUser(data);
        setEditedName(data.name);
      } else {
        setError('Could not retrieve profile.');
      }
    }).catch(err => setError(err.message)).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const handleAvatarUpload = async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    setError('');
    try {
      const data = await uploadAvatar(selectedFile);
      const updatedUser = { ...user, avatar_url: data.avatar_url };
      setUser(updatedUser);
      storage.set('user', updatedUser);
      window.dispatchEvent(new Event('storage'));
      setSelectedFile(null);
    } catch(err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedUser = await updateMyProfile({ name: editedName });
      setUser(updatedUser);
      storage.set('user', updatedUser);
      window.dispatchEvent(new Event('storage'));
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      return setError('New passwords do not match.');
    }

    setIsSaving(true);
    try {
      await changePassword({ oldPassword, newPassword });
      setSuccess('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditToggle = (isEditing) => {
    setIsEditing(isEditing);
    if (!isEditing) {
      setEditedName(user.name); 
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  const avatarSrc = previewUrl || (user?.avatar_url ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`) : `https://ui-avatars.com/api/?name=${user?.name.replace(/\s/g, '+')}&background=random`);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-indigo-700 mb-6">Settings</h1>
      
      <ProfilePicture 
        avatarSrc={avatarSrc}
        isSaving={isSaving}
        selectedFile={selectedFile}
        onFileChange={(e) => setSelectedFile(e.target.files[0])}
        onUpload={handleAvatarUpload}
      />
      
      <ProfileInformation
        user={user}
        isEditing={isEditing}
        editedName={editedName}
        isSaving={isSaving}
        onNameChange={(e) => setEditedName(e.target.value)}
        onEditToggle={handleEditToggle}
        onSave={handleSaveName}
      />

       <ChangePasswordForm
        oldPassword={oldPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        onOldPasswordChange={(e) => setOldPassword(e.target.value)}
        onNewPasswordChange={(e) => setNewPassword(e.target.value)}
        onConfirmPasswordChange={(e) => setConfirmPassword(e.target.value)}
        onSubmit={handleChangePassword}
        isSaving={isSaving}
      />
    </div>
  );
}