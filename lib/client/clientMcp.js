const net = require('net')

const ProtoDef = require('protodef').ProtoDef
const mcp = require('../../data/mcp')
const EventEmitter = require('events').EventEmitter

const mcpToServer = new ProtoDef(false)
mcpToServer.addProtocol(mcp, ['toServer'])

const mcpToClient = new ProtoDef(false)
mcpToClient.addProtocol(mcp, ['toClient'])

class Client extends EventEmitter {
  constructor (isServer = false) {
    super()
    this.isServer = isServer
  }

  connect (host, port) {
    this.host = host
    this.port = port
    const socket = net.createConnection({ port: this.port, host: this.host }, () => {
      this.emit('connect')
    })
    this.setSocket(socket)
  }

  setSocket (socket) {
    this.socket = socket

    this.socket.on('data', (data) => {
      try {
        // console.log('received that hex MCP', data.toString('hex'))
        if (data.length === 1 && data[0] === 0x01) {
          this.emit('init_connection')
          return
        }
        const proto = this.isServer ? mcpToServer : mcpToClient
        const parsed = proto.parsePacketBuffer('packet', data).data

        const { name, params } = parsed
        console.info('received packet MCP', name, JSON.stringify(parsed))

        this.emit(name, params)
        this.emit('packet', { name, params })
      } catch (err) {
        console.log(err.message)
      }
    })

    this.socket.on('end', () => {
      console.log('disconnected from mcp server')
    })
  }

  write (name, params) {
    const proto = this.isServer ? mcpToClient : mcpToServer
    const buffer = proto.createPacketBuffer('packet', {
      size: 0,
      name: name,
      params
    })

    console.info('sending packet', name, params)
    buffer.writeInt16LE(buffer.length, 0)

    // console.log('sending that hex MCP ', buffer)

    this.socket.write(buffer)
  }
}

module.exports = Client
