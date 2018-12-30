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
TronQuery.prototype.getBalance = generateFnFor('wallet/getaccount')
TronQuery.prototype.getBlockByNumber = generateFnFor('wallet/getblockbynum')
TronQuery.prototype.getLatestBlock = generateFnFor('wallet/getnowblock')
TronQuery.prototype.createTransaction = generateFnFor('wallet/createtransaction')
TronQuery.prototype.transferAsset = generateFnFor('wallet/transferasset')
TronQuery.prototype.broadcastTransaction = generateFnFor('wallet/broadcasttransaction')
TronQuery.prototype.assetIssueByName = generateFnFor('wallet/getassetissuebyname')
TronQuery.prototype.getNodeInfo = generateFnFor('wallet/getnodeinfo')
TronQuery.prototype.getTransactionInfoByID = generateFnFor('wallet/gettransactioninfobyid')
TronQuery.prototype.getTransactionSign = generateFnFor('wallet/gettransactionsign')

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
