import { Constants } from './constants';
import internal from "stream";

export class SendSocketMessage {
  socket: internal.Duplex
  dataFrameBuffer: Buffer
  bufferedMessage: Buffer
  byteBuffer: Buffer
  messageSize: number
  message: string;

  constructor(socket: internal.Duplex) {
    this.socket = socket
  }

  verifyMessageSize(message: string): SendSocketMessage {
    const bufferedMessage = Buffer.from(message)
    this.bufferedMessage = bufferedMessage

    const messageSize = bufferedMessage.length
    this.messageSize = messageSize

    const firstByte = 0x80 | Constants.OPCODE_TEXT

    if(messageSize <= Constants.SEVEN_BITS_INTEGER_MARKER) {
      this.dataFrameBuffer = this.get7bitMessage(firstByte, messageSize)
      
    } else if (messageSize <= Constants.MAXIMUM_SIXTEEN_BITS_INTEGER) {
      this.dataFrameBuffer = this.get16BitMessage(firstByte, messageSize)

    } else {
      throw new Error('The message is too long.')
    }

    return this
  }

  mountByteMessage(): SendSocketMessage {
    const totalLength = this.dataFrameBuffer.byteLength + this.messageSize
    const byteBuffer = Buffer.allocUnsafe(totalLength)
    const bufferList = [this.dataFrameBuffer, this.bufferedMessage]
    let offset = 0

    for(const buffer of bufferList) {
      byteBuffer.set(buffer, offset)
      offset += buffer.length
    }
    this.byteBuffer = byteBuffer

    return this
  }

  send(): void{
    const data = this.byteBuffer
    this.socket.write(data)
  }

  get7bitMessage(firstByte: number,  messageSize: number): Buffer {
    const bytes = [firstByte]

    return Buffer.from(bytes.concat(messageSize))
  }

  get16BitMessage(firstByte: number, messageSize: number): Buffer {
    const offsetFourBytes = 4
    const target = Buffer.allocUnsafe(offsetFourBytes)

    target[0] = firstByte
    target[1] = Constants.SIXTEEN_BITS_INTEGER_MARKER | 0x0
    target.writeUint16BE(messageSize, 2) // content length is 2 bytes

    const dataFrameBuffer = target

    return dataFrameBuffer
  }

}