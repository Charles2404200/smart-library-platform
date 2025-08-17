// src/services/socket.js
import { io } from 'socket.io-client';

let socket;

export function getSocket(token) {
  if (!socket) {
    socket = io('http://localhost:4000', {
      path: '/socket.io',
      transports: ['websocket','polling'], // allow fallback
      withCredentials: true,
      auth: { token: token ?? null },      // matches server .handshake.auth.token
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 500,
    });

    // helpful logs
    socket.on('connect', () => console.log('🔌 socket connected', socket.id));
    socket.on('connect_error', (e) => console.error('connect_error:', e?.message || e));
    socket.on('error', (e) => console.error('socket error:', e));
  }
  return socket;
}

export function joinUserRoom(userId) {
  if (socket && userId) socket.emit('join-user', userId);
}

export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
