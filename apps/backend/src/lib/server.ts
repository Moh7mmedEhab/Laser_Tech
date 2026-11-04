import { createServer } from 'node:http'
import { Server as SocketServer, type Socket } from 'socket.io'
import { createApp } from './app.js'
import { env, isProduction } from '../config/env.js'
import { SESSION_COOKIE } from '../modules/auth/auth.constants.js'
import * as authRepo from '../modules/auth/auth.repository.js'
import { bus } from './events.js'

/** Session tokens are unpadded base64url, so naive header splitting is safe. */
function readSessionCookie(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const prefix = `${SESSION_COOKIE}=`
  const pair = raw.split(';').map((p) => p.trim()).find((p) => p.startsWith(prefix))
  return pair?.slice(prefix.length)
}

const AUTH_EVENTS = new Set(['bill:created', 'bill:updated', 'bill:deleted', 'product:changed'])

async function socketAuth(socket: Socket, next: (err?: Error) => void) {
  try {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      readSessionCookie(socket.handshake.headers.cookie)
    if (!token) return next(new Error('unauthorized'))

    const session = await authRepo.findActiveSession(token)
    if (!session) return next(new Error('unauthorized'))

    // The session user drives per-user rooms so note events stay private.
    socket.data.user = session.user
    await socket.join(`user:${session.user.id}`)
    next()
  } catch (err) {
    next(err instanceof Error ? err : new Error('unauthorized'))
  }
}

function wireRealtime(io: SocketServer) {
  // Domain events from services fan out to all authenticated sockets; product
  // changes are coarse-grained, so no per-user room split is needed.
  for (const event of AUTH_EVENTS) {
    bus.on(event, (payload: unknown) => {
      io.emit(event, payload)
    })
  }

  // Notes: broadcast globally; the subject's room gets an extra copy.
  connectNoteScoped('note:created', io)
  connectNoteScoped('note:updated', io)
  connectNoteScoped('note:deleted', io)
}

function connectNoteScoped(event: string, io: SocketServer) {
  bus.on(event, (payload: unknown) => {
    const { noteId, userId } = payload as { noteId: string; userId: string | null }
    io.emit(event, { noteId })
    if (userId) io.to(`user:${userId}`).emit(event, { noteId })
  })
}

export function startServer() {
  const app = createApp()
  const httpServer = createServer(app)
  const io = new SocketServer(httpServer, {
    cors: { origin: env.CORS_ORIGINS, credentials: true },
  })
  io.use(socketAuth)
  wireRealtime(io)

  httpServer.listen(env.PORT, () => {
    if (!isProduction) {
      console.log(`Laser Tech API listening on http://localhost:${env.PORT}`)
    }
  })

  return { httpServer, io }
}

if (process.env.NODE_ENV !== 'test') {
  startServer()
}
