import { http } from './http';
import { API_URL } from '../config/env'; 

export function getMyProfile() {
  return http('/api/users/me');
}

export function updateMyProfile(payload) {
  return http('/api/users/me', {
    method: 'PATCH',
    body: payload,
  });
}

export function changePassword(passwords) {
  return http('/api/users/me/change-password', {
    method: 'POST',
    body: passwords, // { oldPassword, newPassword }
  });
}

export async function uploadAvatar(file) {
  const token = JSON.parse(localStorage.getItem('token') || 'null');
  const formData = new FormData();
  formData.append('avatar', file); 
  const response = await fetch(`${API_URL}/api/users/me/avatar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });



  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to upload avatar.');
  }
  return data;
}