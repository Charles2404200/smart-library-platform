import React, { useRef } from "react";

export default function ProfilePicture({
  avatarSrc,
  isSaving,
  selectedFile,
  onFileChange,
  onUpload,
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="bg-white p-6 border rounded-lg shadow mb-6">
      <h2 className="text-xl font-semibold mb-4">Profile Picture</h2>
      <div className="flex items-center gap-4">
        <img
          src={avatarSrc}
          alt="Avatar"
          className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
        />
        <div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={onFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current.click()}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            Choose Photo
          </button>
          {selectedFile && (
            <button
              onClick={onUpload}
              disabled={isSaving}
              className="ml-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? "Uploading..." : "Upload"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
