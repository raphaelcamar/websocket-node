import { Constants } from './constants';
import crypto from 'crypto'

export class PrepareHandshake {
  private connectionId: string;

  constructor(id: string){
    this.connectionId = id
  }

  createSocketAcceptKey(): string {
    const hash = crypto.createHash('sha1')
    hash.update(this.connectionId + Constants.WEBSOCKET_MAGIC_KEY)
  
    return hash.digest('base64')
  }

  createHeaders(key: string): string {
    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${key}`,
      ''
    ]
    const normalizedHeaders = headers.map(line => line.concat('\r\n')).join('')

    return normalizedHeaders
  }
}