import { createServer } from 'node:http'
import { Server as SocketServer } from 'socket.io'
import { createApp } from './app.js'
import { env, isProduction } from '../config/env.js'

export function startServer() {
  const app = createApp()
  const httpServer = createServer(app)
  const io = new SocketServer(httpServer, {
    cors: { origin: env.CORS_ORIGINS, credentials: true },
  })
  // Socket auth middleware is attached once the auth module exists.

  io.on('connection', () => {
    // Events (bill:created, product:updated, ...) are emitted by modules on mutation.
  })

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
