import { EventEmitter } from 'node:events'

/**
 * In-process domain event bus. Services emit mutations here; the Socket.IO
 * layer in server.ts subscribes and fans events out to connected clients.
 */
export const bus = new EventEmitter()
bus.setMaxListeners(20)

export function emit(event: string, payload: unknown) {
  bus.emit(event, payload)
}
