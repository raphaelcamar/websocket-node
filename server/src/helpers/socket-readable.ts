import { Constants } from './constants';
import internal from "stream";
import { UnmaskSocketMessage } from "./unmask-socket-message";

export class SocketReadable {
  private readonly socket: internal.Duplex
  private indicatorInBitsLength: number = 0
  private messageLength: number = 0

  constructor(socket: internal.Duplex){
    this.socket = socket
  }
  
  private getIndicatorInBits(): number {
    this.socket.read(1)
    const [markerAndPayloadLength] = this.socket.read(1)
    this.indicatorInBitsLength = markerAndPayloadLength - Constants.FIRST_BIT

    return this.indicatorInBitsLength
  }


  read(): object {
    this.getIndicatorInBits()
    this.verifyMessageSize()
    return this.getEncodedMessage()
  }

  verifyMessageSize(): void {
    if (this.indicatorInBitsLength <= Constants.SEVEN_BITS_INTEGER_MARKER) {
      this.messageLength = this.indicatorInBitsLength
    } else {
      throw new Error(`Your message is tool large! we don't handle 64-bit messages.`)
    }
  }

  private getEncodedMessage(): object {
    const maskKey = this.socket.read(Constants.MASK_KEY_BYTES_LENGTH)
    const encoded = this.socket.read(this.messageLength)

    const unmaskSocketMessage = new UnmaskSocketMessage(encoded, maskKey)
    const decoded = unmaskSocketMessage.unmask()
    const received = decoded.toString('utf8')
    return JSON.parse(received)
  }
}