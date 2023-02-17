import { Constants } from './constants';
import internal from "stream";

export class UnmaskSocketMessage {
  socket: internal.Duplex
  finalBuffer: Buffer
  encodedBuffer: Buffer
  maskedKey: Buffer

  constructor(encodedBuffer: Buffer, maskedKey: Buffer) {
    this.finalBuffer = Buffer.from(encodedBuffer)
    this.encodedBuffer = encodedBuffer
    this.maskedKey = maskedKey
  }

  unmask(): Buffer {
    for (let index = 0; index < this.encodedBuffer.length; index++) {
      this.finalBuffer[index] = this.encodedBuffer[index] ^ this.maskedKey[index % Constants.MASK_KEY_BYTES_LENGTH];
    }
    return this.finalBuffer
  }

  getCharFromBinary(binary: number): string {
    return String.fromCharCode(this.fromBinaryToDecimal(binary))
  }

  fromBinaryToDecimal(binary: number): number {
    return parseInt(this.toBinary(binary), 2)
  }

  toBinary(bufferSpace: number): string {
    return this.fillBinaryLength(bufferSpace.toString(2))
  }

  fillBinaryLength(incompleteBinary: string): string {
    return incompleteBinary.padStart(8, "0")
  }
}