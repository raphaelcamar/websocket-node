import { createServer } from 'http'
import crypto from 'crypto'

const WEBSOCKET_MAGIC_KEY = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const SEVEN_BITS_INTEGER_MARKER = 125
const SIXTEEN_BITS_INTEGER_MARKER = 126
const SIXTYFOUR_BITS_INTEGER_MARKER = 127
const MAXIMUM_SIXTEEN_BITS_INTEGER = 2 ** 16
const FIRST_BIT = 128
const MASK_KEY_BYTES_LENGTH = 4
const OPCODE_TEXT = 0X01 //1 bit in binary 1

const server = createServer((request, response) => {
  response.writeHead(200)
  response.end('hey there')
})
.listen(1337, () => console.log('server listening to', 1337))


server.on('upgrade', onSocketUpgrade)

function onSocketUpgrade(req, socket, head){
  const {'sec-websocket-key': webClientSocketKey} = req.headers
  
  console.log(`${webClientSocketKey} connected!`)

  const headers = prepareHandShakeHeaders(webClientSocketKey)
  
  socket.write(headers)
  socket.on('readable', () => onSocketReadable(socket))

}

function prepareHandShakeHeaders(id){
  const acceptKey = createSocketAccept(id)

  const headers = [
  'HTTP/1.1 101 Switching Protocols',
  'Upgrade: websocket',
  'Connection: Upgrade',
  `Sec-WebSocket-Accept: ${acceptKey}`,
  ''
  ].map(line => line.concat('\r\n')).join('')

  return headers
}

function createSocketAccept(id){
  const hash = crypto.createHash('sha1')
  hash.update(id + WEBSOCKET_MAGIC_KEY)

  return hash.digest('base64')
}

function onSocketReadable(socket){
  // 1 - 1byte - 8bits
  socket.read(1)

  const [markerAndPayloadLength] = socket.read(1)
  const lengthIndicatorInBits = markerAndPayloadLength - FIRST_BIT
  let messageLength = 0

  if (lengthIndicatorInBits <= SEVEN_BITS_INTEGER_MARKER) {
    messageLength = lengthIndicatorInBits
  } else {
    throw new Error(`Your message is tool large! we don´t handle 64-bit messages`)
  }

  const maskKey = socket.read(MASK_KEY_BYTES_LENGTH)
  const encoded = socket.read(messageLength)
  const decoded = unmask(encoded, maskKey)
  const received = decoded.toString('utf8')

  const data = JSON.parse(received)
  console.log('message received!', data)

  const msg = JSON.stringify({
    message: data,
    at: new Date().toISOString()
  })
  sendMessage(msg, socket) 
}

function sendMessage(msg, socket){
  const data = prepareMessage(msg)
  socket.write(data)
}

function prepareMessage(message) {
  const msg = Buffer.from(message)
  const messageSize = msg.length

  let dataFrameBuffer;
    


  const firstByte = 0x80 | OPCODE_TEXT
  if(messageSize <= SEVEN_BITS_INTEGER_MARKER) {
    const bytes = [firstByte]
    dataFrameBuffer = Buffer.from(bytes.concat(messageSize))
  } else if (messageSize <= MAXIMUM_SIXTEEN_BITS_INTEGER ) {
    const offsetFourBytes = 4
    const target = Buffer.allocUnsafe(offsetFourBytes)
    target[0] = firstByte
    target[1] = SIXTEEN_BITS_INTEGER_MARKER | 0x0

    target.writeUint16BE(messageSize, 2) // content length is 2 bytes
    dataFrameBuffer = target
  }
  else {
    throw new Error('message too long buddy :( ')
  }
  const totalLength = dataFrameBuffer.byteLength + messageSize
  const dataFrameResponse = concat([ dataFrameBuffer, msg], totalLength)
  
  return dataFrameResponse

}

function concat(bufferList, totalLength) {
  const target = Buffer.allocUnsafe(totalLength)

  let offset = 0

  for(const buffer of bufferList) {
    target.set(buffer, offset)
    offset += buffer.length
  }

  return target
}


function unmask(encodedBuffer, maskKey) {
  const finalBuffer = Buffer.from(encodedBuffer)

  const fillWithEightZeros = (t) => t.padStart(8, "0")
  const toBinary = (t) => fillWithEightZeros(t.toString(2))
  const fromBinaryToDecimal = (t) => parseInt(toBinary(t), 2)
  const getCharFromBinary = (t) => String.fromCharCode(fromBinaryToDecimal(t))

  for (let index = 0; index < encodedBuffer.length; index++) {
    finalBuffer[index] = encodedBuffer[index] ^ maskKey[index % MASK_KEY_BYTES_LENGTH];

    const logger = {
      unmaskingCalc: `${toBinary(encodedBuffer[index])} ^ ${toBinary(maskKey[index % MASK_KEY_BYTES_LENGTH])} = ${toBinary(finalBuffer[index])}`,
      decoded: getCharFromBinary(finalBuffer[index])
    }
    console.log(logger)
  }

  return finalBuffer
}

[
  "uncaughtException",
  "unhandledRejection"
].forEach((event) => process.on(event, (err) => {console.error(`Something happened! event: ${event}, msg: ${err.stack || err}`)}))
