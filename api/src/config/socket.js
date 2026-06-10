import { Server } from 'socket.io'
import db from './db.js'
import { verifyAccessToken } from '../utils/jwt.js'

let io
const onlineUsers = new Map()

const normalizeWalletAddress = (wallet_address) => wallet_address.toLowerCase()

const savePendingEvent = async (wallet_address, event_name, payload) => {
    const { rows: [row] } = await db.query(
        `INSERT INTO pending_events (wallet_address, event_name, payload)
         VALUES ($1, $2, $3::jsonb)
         RETURNING id`,
        [wallet_address, event_name, JSON.stringify(payload ?? null)]
    )
    return row.id
}
const deletePendingEvent = async (eventId, wallet_address) => {
    await db.query(
        `DELETE FROM pending_events
         WHERE id = $1 AND wallet_address = $2`,
        [eventId, wallet_address]
    )
}
const flushPendingEvents = async (wallet_address) => {
    const socketId = onlineUsers.get(wallet_address)
    if (!socketId) return

    const socket = io.sockets.sockets.get(socketId)
    if (!socket || !socket.connected) return

    const { rows } = await db.query(
        `SELECT id, event_name, payload
         FROM pending_events
         WHERE wallet_address = $1
         ORDER BY created_at ASC`,
        [wallet_address]
    )

    for (const row of rows) {
        if (!socket.connected || onlineUsers.get(wallet_address) !== socket.id) break

        socket.emit(row.event_name, { ...row.payload, eventId: row.id }, async (ack) => {
            if (ack === 'received') {
                try {
                    await deletePendingEvent(row.id, wallet_address)
                } catch (error) {
                    console.error('Failed to delete acknowledged pending event:', error)
                }
            }
        })
    }
}


export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: { origin: '*' }
    })

    io.on('connection', (socket) => {
        socket.on('join', async (token) => {
            let decodedToken;
            try {
                if (typeof token !== 'string') throw new Error('Invalid token format')
                decodedToken = await verifyAccessToken(token)
                const msUntilExpiry = decodedToken.exp * 1000 - Date.now()
                setTimeout(() => {
                    socket.emit('auth_error', 'Token expired. Please reconnect.')
                    socket.disconnect()
                }, msUntilExpiry)
            } catch (error) {
                socket.emit('auth_error', 'Authentication failed. Please reconnect with a valid token.')
                //console.log('Socket authentication failed:', error.message)
                return socket.disconnect()
            }

            const { sub: wallet_address } = decodedToken
            const normalizedWalletAddress = normalizeWalletAddress(wallet_address)

            socket.data.wallet_address = normalizedWalletAddress
            onlineUsers.set(normalizedWalletAddress, socket.id)
            socket.join(normalizedWalletAddress)

            try {
                await flushPendingEvents(normalizedWalletAddress)
            } catch (error) {
                console.error('Failed to flush pending socket events:', error)
            }
        })

        socket.on('ack_event', async (ackPayload) => {
            const wallet_address = socket.data.wallet_address
            const pendingEventId = typeof ackPayload === 'object' && ackPayload !== null
                ? ackPayload.id
                : ackPayload           

            if (!wallet_address || !pendingEventId) return

            try {
                await deletePendingEvent(pendingEventId, wallet_address)
            } catch (error) {
                console.error('Failed to process ack_event:', error)
            }
        })

        socket.on('disconnect', () => {
            const wallet_address = socket.data.wallet_address
            if (!wallet_address) return

            const mappedSocketId = onlineUsers.get(wallet_address)

            if (mappedSocketId === socket.id) onlineUsers.delete(wallet_address)
        })
    })
}
export const emitToUser = async (wallet_address, event, data) => {
    const normalizedWalletAddress = normalizeWalletAddress(wallet_address)
    const socketId = onlineUsers.get(normalizedWalletAddress)
    const socket = socketId ? io.sockets.sockets.get(socketId) : null

    const eventId = await savePendingEvent(normalizedWalletAddress, event, data)

    if (socket && socket.connected) {
        socket.emit(event, { ...data, eventId })
        return
    }
}