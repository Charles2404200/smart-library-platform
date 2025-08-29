// src/pages/SettingsPage.jsx
import React, { useEffect, useState } from "react";
import { useNotification } from "../contexts/NotificationContext";
import {
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
  changePassword,
} from "../services/userService";
import { storage } from "../utils/storage";
import { API_URL } from "../config/env";
import ProfilePicture from "../components/settings/ProfilePicture";
import ProfileInformation from "../components/settings/ProfileInformation";
import ChangePasswordForm from "../components/settings/ChangePasswordForm";

export default function SettingsPage() {
  // 2. Lấy hàm showNotification từ context
  const { showNotification } = useNotification();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 3. Đã có thể xóa state error, success và hàm clearMessages cũ

  useEffect(() => {
    getMyProfile()
      .then((data) => {
        if (!data) {
          // 4. Sử dụng showNotification
          showNotification("Could not retrieve profile.");
        }
        setUser(data);
        setEditedName(data.name);
      })
      .catch((err) => showNotification(err.message))
      .finally(() => setIsLoading(false));
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
    try {
      const data = await uploadAvatar(selectedFile);
      const updatedUser = { ...user, avatar_url: data.avatar_url };
      setUser(updatedUser);
      storage.set("user", updatedUser);
      window.dispatchEvent(new Event("storage"));
      setSelectedFile(null);
      showNotification("Avatar updated successfully!", "success"); // 4. Sử dụng
    } catch (err) {
      showNotification(err.message);
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
      storage.set("user", updatedUser);
      window.dispatchEvent(new Event("storage"));
      setIsEditing(false);
      showNotification("Name updated successfully!", "success"); // 4. Sử dụng
    } catch (err) {
      showNotification(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showNotification("New passwords do not match."); // 4. Sử dụng
      return;
    }
    setIsSaving(true);
    try {
      await changePassword({ oldPassword, newPassword });
      showNotification("Password updated successfully!", "success"); // 4. Sử dụng
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      showNotification(err.message || "Failed to update password.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditToggle = (isEditing) => {
    setIsEditing(isEditing);
    if (!isEditing && user) {
      setEditedName(user.name);
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  const avatarSrc =
    previewUrl ||
    (user?.avatar_url
      ? user.avatar_url.startsWith("http")
        ? user.avatar_url
        : `${API_URL}${user.avatar_url}`
      : `https://ui-avatars.com/api/?name=${user?.name.replace(
          /\s/g,
          "+"
        )}&background=random`);

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
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