const createAsyncMiddleware = require('json-rpc-engine/src/createAsyncMiddleware')
const createScaffoldMiddleware = require('json-rpc-engine/src/createScaffoldMiddleware')
const { getTxParamsFromAddress, getBase58Address } = require('../transactions/lib/util')

module.exports = createWalletMiddleware

function createWalletMiddleware (opts = {}) {
  const processTransaction = opts.processTransaction
  const getAccounts = opts.getAccounts
  const getTransactionPublishStatus = opts.getTransactionPublishStatus

  return createScaffoldMiddleware({
    'wallet/gettransactionsign': createAsyncMiddleware(signTransaction),
    'wallet/broadcasttransaction': createAsyncMiddleware(broadcastTransaction),
  })

  async function signTransaction (req, res) {
    if (!processTransaction) throw new Error('WalletMiddleware - opts.processTransaction not provided')
    const txParams = req.params[0].transaction || {}
    const fromAddress = getBase58Address(getTxParamsFromAddress(txParams))
    await validateSender(fromAddress, req)
    res.result = await processTransaction(txParams, req)
  }

  async function validateSender (address, req) {
    // allow unspecified address (allow transaction signer to insert default)
    if (!address) return
    // ensure address is included in provided accounts
    if (!getAccounts) throw new Error('WalletMiddleware - opts.getAccounts not provided')
    const accounts = await getAccounts(req)
    if (!accounts.includes(address)) throw new Error('WalletMiddleware - Invalid "from" address.')
  }

  async function broadcastTransaction (req, res, next) {
    if (!getTransactionPublishStatus) throw new Error('WalletMiddleware - opts.getTransactionPublishStatus not provided')
    const txID = req.params[0].txID
    const publishStatus = await getTransactionPublishStatus(txID)
    if (publishStatus) {
      res.result = publishStatus
    } else {
      next()
    }
  }
}
