'use client'

const RECORD_SEPARATOR = '\u001e'
const KEEP_ALIVE_MS = 12_000
const HANDSHAKE_TIMEOUT_MS = 15_000
const SERVER_TIMEOUT_MS = 35_000
const SERVER_WATCHDOG_INTERVAL_MS = 5_000

type SignalRInvocation = {
  type: 1
  invocationId?: string
  target: string
  arguments: unknown[]
}

type SignalRCompletion = {
  type: 3
  invocationId: string
  result?: unknown
  error?: string
}

type SignalRMessage =
  | SignalRInvocation
  | SignalRCompletion
  | { type: 6 }
  | { type: 7; error?: string; allowReconnect?: boolean }

type EventHandler = (payload: unknown) => void

type PendingInvocation = {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}

type SignalRJsonClientOptions = {
  hubUrl: string
  accessTokenFactory?: () => Promise<string | null> | string | null
}

const toWebSocketUrl = (value: string) => {
  const url = new URL(value)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url
}

export class SignalRJsonClient {
  private socket: WebSocket | null = null
  private started = false
  private invocationId = 0
  private keepAliveTimer: number | null = null
  private serverWatchdogTimer: number | null = null
  private lastServerActivityAt = 0
  private readonly pending = new Map<string, PendingInvocation>()
  private readonly handlers = new Map<string, Set<EventHandler>>()
  private closeHandlers = new Set<(error?: Error) => void>()

  constructor(private readonly options: SignalRJsonClientOptions) {}

  get isConnected() {
    return this.started && this.socket?.readyState === WebSocket.OPEN
  }

  on<T>(eventName: string, handler: (payload: T) => void) {
    const handlers = this.handlers.get(eventName) ?? new Set<EventHandler>()
    handlers.add(handler as EventHandler)
    this.handlers.set(eventName, handlers)
    return () => handlers.delete(handler as EventHandler)
  }

  onClose(handler: (error?: Error) => void) {
    this.closeHandlers.add(handler)
    return () => this.closeHandlers.delete(handler)
  }

  async start() {
    if (this.isConnected) return

    if (this.socket) this.stop()

    const token = await this.options.accessTokenFactory?.()
    const negotiateUrl = new URL(`${this.options.hubUrl.replace(/\/$/, '')}/negotiate`)
    negotiateUrl.searchParams.set('negotiateVersion', '1')

    const headers = new Headers({ 'Content-Type': 'application/json' })
    if (token) headers.set('Authorization', `Bearer ${token}`)

    const negotiate = await fetch(negotiateUrl, {
      method: 'POST',
      headers,
      credentials: 'include'
    })

    if (!negotiate.ok) throw new Error(`Unable to negotiate realtime connection (${negotiate.status}).`)

    const payload = await negotiate.json() as {
      connectionId?: string
      connectionToken?: string
      availableTransports?: Array<{ transport: string }>
      error?: string
    }

    if (payload.error) throw new Error(payload.error)
    if (!payload.availableTransports?.some(item => item.transport === 'WebSockets')) {
      throw new Error('The Quiz realtime endpoint does not offer WebSocket transport.')
    }

    const connectionToken = payload.connectionToken ?? payload.connectionId
    if (!connectionToken) throw new Error('Realtime negotiation did not return a connection token.')

    const socketUrl = toWebSocketUrl(this.options.hubUrl)
    socketUrl.searchParams.set('id', connectionToken)
    if (token) socketUrl.searchParams.set('access_token', token)

    const socket = new WebSocket(socketUrl)
    this.socket = socket
    this.lastServerActivityAt = Date.now()

    await new Promise<void>((resolve, reject) => {
      let handshakeComplete = false
      const handshakeTimer = window.setTimeout(() => {
        if (handshakeComplete) return

        const error = new Error('Quiz realtime handshake timed out.')
        reject(error)
        this.failConnection(error, 1001, 'Handshake timeout')
      }, HANDSHAKE_TIMEOUT_MS)

      const clearHandshakeTimer = () => window.clearTimeout(handshakeTimer)

      const fail = (reason: Error) => {
        if (handshakeComplete) return
        clearHandshakeTimer()
        reject(reason)
      }

      socket.onopen = () => {
        socket.send(JSON.stringify({ protocol: 'json', version: 1 }) + RECORD_SEPARATOR)
      }

      socket.onerror = () => fail(new Error('Unable to open the Quiz realtime WebSocket.'))

      socket.onclose = event => {
        clearHandshakeTimer()
        const error = event.reason ? new Error(event.reason) : undefined
        if (!handshakeComplete) fail(error ?? new Error('Quiz realtime connection closed during handshake.'))
        this.handleClosed(error)
      }

      socket.onmessage = event => {
        this.lastServerActivityAt = Date.now()
        const frames = String(event.data).split(RECORD_SEPARATOR).filter(Boolean)

        for (const frame of frames) {
          let message: Record<string, unknown>

          try {
            message = JSON.parse(frame) as Record<string, unknown>
          } catch {
            continue
          }

          if (!handshakeComplete && !('type' in message)) {
            if (typeof message.error === 'string') {
              fail(new Error(message.error))
              socket.close()
              return
            }

            handshakeComplete = true
            clearHandshakeTimer()
            this.started = true
            this.startKeepAlive()
            this.startServerWatchdog()
            resolve()
            continue
          }

          this.handleMessage(message as SignalRMessage)
        }
      }
    })
  }

  async invoke<T>(target: string, ...args: unknown[]): Promise<T> {
    if (!this.isConnected || !this.socket) throw new Error('Quiz realtime connection is not active.')

    const invocationId = String(++this.invocationId)
    const message: SignalRInvocation = {
      type: 1,
      invocationId,
      target,
      arguments: args
    }

    return new Promise<T>((resolve, reject) => {
      this.pending.set(invocationId, {
        resolve: value => resolve(value as T),
        reject
      })

      try {
        this.socket!.send(JSON.stringify(message) + RECORD_SEPARATOR)
      } catch (error) {
        this.pending.delete(invocationId)
        reject(error)
      }
    })
  }

  stop() {
    const socket = this.socket
    this.started = false
    this.stopTimers()
    this.socket = null

    if (socket && socket.readyState <= WebSocket.OPEN) socket.close(1000, 'Client stopped')

    this.rejectPending(new Error('Quiz realtime connection stopped.'))
  }

  private startKeepAlive() {
    if (this.keepAliveTimer !== null) window.clearInterval(this.keepAliveTimer)

    this.keepAliveTimer = window.setInterval(() => {
      if (!this.isConnected || !this.socket) return
      this.socket.send(JSON.stringify({ type: 6 }) + RECORD_SEPARATOR)
    }, KEEP_ALIVE_MS)
  }

  private startServerWatchdog() {
    if (this.serverWatchdogTimer !== null) window.clearInterval(this.serverWatchdogTimer)

    this.serverWatchdogTimer = window.setInterval(() => {
      if (!this.isConnected) return
      if (Date.now() - this.lastServerActivityAt <= SERVER_TIMEOUT_MS) return

      this.failConnection(
        new Error('Quiz realtime server stopped responding. Reconnecting...'),
        1001,
        'Server timeout'
      )
    }, SERVER_WATCHDOG_INTERVAL_MS)
  }

  private stopTimers() {
    if (this.keepAliveTimer !== null) window.clearInterval(this.keepAliveTimer)
    if (this.serverWatchdogTimer !== null) window.clearInterval(this.serverWatchdogTimer)
    this.keepAliveTimer = null
    this.serverWatchdogTimer = null
  }

  private handleMessage(message: SignalRMessage) {
    if (message.type === 1) {
      const payload = message.arguments?.[0]
      this.handlers.get(message.target)?.forEach(handler => handler(payload))
      return
    }

    if (message.type === 3) {
      const pending = this.pending.get(message.invocationId)
      if (!pending) return
      this.pending.delete(message.invocationId)
      if (message.error) pending.reject(new Error(message.error))
      else pending.resolve(message.result)
      return
    }

    if (message.type === 7) {
      const error = message.error ? new Error(message.error) : undefined
      this.failConnection(error, 1000, message.error ?? 'Server closed connection')
    }
  }

  private failConnection(error?: Error, code = 1001, reason = 'Connection lost') {
    const socket = this.socket
    this.handleClosed(error)

    if (socket && socket.readyState <= WebSocket.OPEN) {
      try {
        socket.close(code, reason.slice(0, 123))
      } catch {
        // The connection has already been torn down locally.
      }
    }
  }

  private handleClosed(error?: Error) {
    if (!this.started && !this.socket) return

    this.started = false
    this.stopTimers()
    this.socket = null
    this.rejectPending(error ?? new Error('Quiz realtime connection closed.'))
    this.closeHandlers.forEach(handler => handler(error))
  }

  private rejectPending(error: Error) {
    this.pending.forEach(item => item.reject(error))
    this.pending.clear()
  }
}
