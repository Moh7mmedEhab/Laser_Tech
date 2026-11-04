import { io, type Socket } from 'socket.io-client'

/**
 * Single shared Socket.IO connection. Authentication rides the session
 * cookie (same-origin via the Vite proxy in dev), matching the backend's
 * socketAuth middleware; unauthorized handshakes are simply rejected.
 */
let socket: Socket | undefined

export function getSocket(): Socket | undefined {
  return socket
}

export function connectSocket(): Socket {
  if (socket) return socket
  socket = io('/', { withCredentials: true })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = undefined
}
