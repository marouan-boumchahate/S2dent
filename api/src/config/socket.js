import { Server } from 'socket.io'

let io

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: { origin: '*' }
    })

    io.on('connection', (socket) => {
        socket.on('join', (wallet_address) => {
            socket.join(wallet_address.toLowerCase())
        })
    })
}

export const emitToUser = (wallet_address, event, data) => {
    io.to(wallet_address.toLowerCase())
        .emit(event, data)
}