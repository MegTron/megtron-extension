const pump = require('pump')
const RpcEngine = require('json-rpc-engine')
const createIdRemapMiddleware = require('json-rpc-engine/src/idRemapMiddleware')
const createJsonRpcStream = require('json-rpc-middleware-stream')
const LocalStorageStore = require('obs-store')
const asStream = require('obs-store/lib/asStream')
const ObjectMultiplex = require('obj-multiplex')
const util = require('util')
const log = require('loglevel')
const SafeEventEmitter = require('safe-event-emitter')
require('util.promisify').shim()

module.exports = MegtronInpageProvider

util.inherits(MegtronInpageProvider, SafeEventEmitter)

function MegtronInpageProvider (connectionStream) {
  const self = this

  // super constructor
  SafeEventEmitter.call(self)

  // setup connectionStream multiplexing
  const mux = self.mux = new ObjectMultiplex()
  pump(
    connectionStream,
    mux,
    connectionStream,
    logStreamDisconnectWarning.bind(this, 'MegTron')
  )

  // subscribe to metamask public config (one-way)
  self.publicConfigStore = new LocalStorageStore({ storageKey: 'MegTron-Config' })

  pump(
    mux.createStream('megtron_publicConfig'),
    asStream(self.publicConfigStore),
    logStreamDisconnectWarning.bind(this, 'MegTron PublicConfigStore')
  )

  // ignore phishing warning message (handled elsewhere)
  mux.ignoreStream('megtron_phishing')

  // connect to async provider
  const jsonRpcConnection = createJsonRpcStream()
  pump(
    jsonRpcConnection.stream,
    mux.createStream('megtron_provider'),
    jsonRpcConnection.stream,
    logStreamDisconnectWarning.bind(this, 'MegTron RpcProvider')
  )

  // handle sendAsync requests via dapp-side rpc engine
  const rpcEngine = new RpcEngine()
  rpcEngine.push(createIdRemapMiddleware())
  rpcEngine.push(createErrorMiddleware())
  rpcEngine.push(jsonRpcConnection.middleware)
  self.rpcEngine = rpcEngine

  // forward json rpc notifications
  jsonRpcConnection.events.on('notification', function (payload) {
    self.emit('data', null, payload)
  })

  self.sendAsync = self.sendAsync.bind(self)
}

// handle sendAsync requests via asyncProvider
// also remap ids inbound and outbound
MegtronInpageProvider.prototype.sendAsync = function (payload, cb) {
  const self = this
  self.rpcEngine.handle(payload, cb)
}

// TronWeb HttpProvider functions
MegtronInpageProvider.prototype.request = function (url, payload, method) {
  const self = this
  const sendAsyncPromise = util.promisify(self.sendAsync)
  return sendAsyncPromise({method: url, params: [payload]}).then(response => response.result)
}

MegtronInpageProvider.prototype.setStatusPage = function (statusPage = '/') {

}

MegtronInpageProvider.prototype.isConnected = function () {
  return true
}

MegtronInpageProvider.prototype.isMegTron = true

// util
function logStreamDisconnectWarning (remoteLabel, err) {
  let warningMsg = `MegtronInpageProvider - lost connection to ${remoteLabel}`
  if (err) warningMsg += '\n' + err.stack
  console.warn(warningMsg)
  const listeners = this.listenerCount('error')
  if (listeners > 0) {
    this.emit('error', warningMsg)
  }
}

/**
 * Map of standard and non-standard RPC error codes to messages
 */
const RPC_ERRORS = {
  1: 'An unauthorized action was attempted.',
  2: 'A disallowed action was attempted.',
  3: 'An execution error occurred.',
  [-32600]: 'The JSON sent is not a valid Request object.',
  [-32601]: 'The method does not exist / is not available.',
  [-32602]: 'Invalid method parameter(s).',
  [-32603]: 'Internal JSON-RPC error.',
  [-32700]: 'Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.',
  internal: 'Internal server error.',
  unknown: 'Unknown JSON-RPC error.',
}

/**
 * Modifies a JSON-RPC error object in-place to add a human-readable message,
 * optionally overriding any provider-supplied message
 *
 * @param {RpcError} error - JSON-RPC error object
 * @param {boolean} override - Use RPC_ERRORS message in place of provider message
 */
function sanitizeRPCError (error, override) {
  if (error.message && !override) { return error }
  const message = error.code > -31099 && error.code < -32100 ? RPC_ERRORS.internal : RPC_ERRORS[error.code]
  error.message = message || RPC_ERRORS.unknown
}

/**
 * json-rpc-engine middleware that both logs standard and non-standard error
 * messages and ends middleware stack traversal if an error is encountered
 *
 * @param {MiddlewareConfig} [config={override:true}] - Middleware configuration
 * @returns {Function} json-rpc-engine middleware function
 */
function createErrorMiddleware ({ override = true } = {}) {
  return (req, res, next) => {
    next(done => {
      const { error } = res
      if (!error) { return done() }
      sanitizeRPCError(error)
      log.error(`MegTron - RPC Error: ${error.message}`, error)
      done()
    })
  }
}