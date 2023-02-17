import { createServer, IncomingMessage } from 'http'
import internal from 'stream'
import { PrepareHandshake } from './helpers'
import { SendSocketMessage } from './helpers/send-socket-message'
import { SocketReadable } from './helpers/socket-readable'

const PORT = 1337

const server = createServer((request, response) => {
  response.writeHead(200)
  response.end('hey there')
})
.listen(PORT, () => console.log('server listening to', PORT))

function onSocketUpgrade(req: IncomingMessage, socket: internal.Duplex) {
  const {'sec-websocket-key': webClientSocketKey} = req.headers

  const handshakeProcess = new PrepareHandshake(webClientSocketKey!)
  const key = handshakeProcess.createSocketAcceptKey()
  const headers = handshakeProcess.createHeaders(key)
  
  socket.write(headers)
  socket.on('readable', () => onSocketReadable(socket))
}

function onSocketReadable(socket: internal.Duplex) {
  const socketReadable = new SocketReadable(socket)
  const message = socketReadable.read()

  const sendMessage = new SendSocketMessage(socket)
  sendMessage.verifyMessageSize(JSON.stringify(message)).mountByteMessage().send()
}

server.on('upgrade', onSocketUpgrade)
