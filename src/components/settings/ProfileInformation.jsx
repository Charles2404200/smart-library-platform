import React from "react";
import FormInput from "../ui/FormInput";
import Button from "../ui/Button";

export default function ProfileInformation({
  user,
  isEditing,
  editedName,
  onNameChange,
  onEditToggle,
  onSave,
  isSaving,
}) {
  return (
    <div className="bg-white p-6 border rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">My Information</h2>
      <form onSubmit={onSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ""}
            readOnly
            className="w-full bg-gray-100 border-gray-200 rounded-lg p-2 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          {!isEditing ? (
            <div className="flex items-center justify-between">
              <p className="text-lg p-2">{user?.name || ""}</p>
              <button
                type="button"
                onClick={() => onEditToggle(true)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Edit
              </button>
            </div>
          ) : (
            <>
              <FormInput
                id="name"
                type="text"
                value={editedName}
                onChange={onNameChange}
                required
              />
              <div className="flex gap-3 mt-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <button
                  type="button"
                  onClick={() => onEditToggle(false)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
