// Inspired by eth-query
const extend = require('xtend')
const createRandomId = require('json-rpc-random-id')()

function TronQuery (provider) {
  const self = this
  self.currentProvider = provider
}

//
// base queries
//

// default block
/*
TronQuery.prototype.getCode = generateFnWithDefaultBlockFor(2, 'eth_getCode')
TronQuery.prototype.getTransactionCount = generateFnWithDefaultBlockFor(2, 'eth_getTransactionCount')
TronQuery.prototype.getStorageAt = generateFnWithDefaultBlockFor(3, 'eth_getStorageAt')
TronQuery.prototype.call = generateFnWithDefaultBlockFor(2, 'eth_call')
*/
// standard
TronQuery.prototype.getBalance = generateFnFor('wallet/getaccount')
TronQuery.prototype.getBlockByNumber = generateFnFor('wallet/getblockbynum')
TronQuery.prototype.getLatestBlock = generateFnFor('wallet/getnowblock')

/*
TronQuery.prototype.protocolVersion = generateFnFor('eth_protocolVersion')
TronQuery.prototype.syncing = generateFnFor('eth_syncing')
TronQuery.prototype.coinbase = generateFnFor('eth_coinbase')
TronQuery.prototype.mining = generateFnFor('eth_mining')
TronQuery.prototype.hashrate = generateFnFor('eth_hashrate')
TronQuery.prototype.gasPrice = generateFnFor('eth_gasPrice')
TronQuery.prototype.accounts = generateFnFor('eth_accounts')
TronQuery.prototype.blockNumber = generateFnFor('eth_blockNumber')
TronQuery.prototype.getBlockTransactionCountByHash = generateFnFor('eth_getBlockTransactionCountByHash')
TronQuery.prototype.getBlockTransactionCountByNumber = generateFnFor('eth_getBlockTransactionCountByNumber')
TronQuery.prototype.getUncleCountByBlockHash = generateFnFor('eth_getUncleCountByBlockHash')
TronQuery.prototype.getUncleCountByBlockNumber = generateFnFor('eth_getUncleCountByBlockNumber')
TronQuery.prototype.sign = generateFnFor('eth_sign')
TronQuery.prototype.sendTransaction = generateFnFor('eth_sendTransaction')
TronQuery.prototype.sendRawTransaction = generateFnFor('eth_sendRawTransaction')
TronQuery.prototype.estimateGas = generateFnFor('eth_estimateGas')
TronQuery.prototype.getBlockByHash = generateFnFor('eth_getBlockByHash')
TronQuery.prototype.getTransactionByHash = generateFnFor('eth_getTransactionByHash')
TronQuery.prototype.getTransactionByBlockHashAndIndex = generateFnFor('eth_getTransactionByBlockHashAndIndex')
TronQuery.prototype.getTransactionByBlockNumberAndIndex = generateFnFor('eth_getTransactionByBlockNumberAndIndex')
TronQuery.prototype.getTransactionReceipt = generateFnFor('eth_getTransactionReceipt')
TronQuery.prototype.getUncleByBlockHashAndIndex = generateFnFor('eth_getUncleByBlockHashAndIndex')
TronQuery.prototype.getUncleByBlockNumberAndIndex = generateFnFor('eth_getUncleByBlockNumberAndIndex')
TronQuery.prototype.getCompilers = generateFnFor('eth_getCompilers')
TronQuery.prototype.compileLLL = generateFnFor('eth_compileLLL')
TronQuery.prototype.compileSolidity = generateFnFor('eth_compileSolidity')
TronQuery.prototype.compileSerpent = generateFnFor('eth_compileSerpent')
TronQuery.prototype.newFilter = generateFnFor('eth_newFilter')
TronQuery.prototype.newBlockFilter = generateFnFor('eth_newBlockFilter')
TronQuery.prototype.newPendingTransactionFilter = generateFnFor('eth_newPendingTransactionFilter')
TronQuery.prototype.uninstallFilter = generateFnFor('eth_uninstallFilter')
TronQuery.prototype.getFilterChanges = generateFnFor('eth_getFilterChanges')
TronQuery.prototype.getFilterLogs = generateFnFor('eth_getFilterLogs')
TronQuery.prototype.getLogs = generateFnFor('eth_getLogs')
TronQuery.prototype.getWork = generateFnFor('eth_getWork')
TronQuery.prototype.submitWork = generateFnFor('eth_submitWork')
TronQuery.prototype.submitHashrate = generateFnFor('eth_submitHashrate')
*/

// network level
TronQuery.prototype.sendAsync = function (opts, cb) {
  const self = this
  self.currentProvider.sendAsync(createPayload(opts), function (err, response) {
    if (!err && response.Error) err = new Error('TronQuery - RPC Error - ' + response.Error)
    if (err) return cb(err)
    cb(null, response.result)
  })
}

// util
function generateFnFor (methodName) {
  return function () {
    const self = this
    var args = [].slice.call(arguments)
    var cb = args.pop()
    self.sendAsync({
      method: methodName,
      params: args,
    }, cb)
  }
}

function createPayload (data) {
  return extend({
    // defaults
    id: createRandomId(),
    jsonrpc: '2.0',
    params: [],
    // user-specified
  }, data)
}

module.exports = TronQuery
