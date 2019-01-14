const createAsyncMiddleware = require('json-rpc-engine/src/createAsyncMiddleware')
const createScaffoldMiddleware = require('json-rpc-engine/src/createScaffoldMiddleware')
const { getTxParamsFromAddress, getBase58Address } = require('../transactions/lib/util')

module.exports = createWalletMiddleware

function createWalletMiddleware (opts = {}) {
  const processTransaction = opts.processTransaction
  const processSignMessage = opts.processSignMessage
  const getAccounts = opts.getAccounts
  const getTransactionPublishStatus = opts.getTransactionPublishStatus

  return createScaffoldMiddleware({
    'wallet/gettransactionsign': createAsyncMiddleware(processSign),
    'wallet/broadcasttransaction': createAsyncMiddleware(broadcastTransaction),
  })

  async function processSign (req, res) {
    if (req.params[0].transaction) {
      return await signTransaction(req, res)
    }
    if (req.params[0].message) {
      return await signMessage(req, res)
    }
    throw new Error('WalletMiddleware - neighter transaction or message is provided to sign')
  }

  async function signTransaction (req, res) {
    if (!processTransaction) throw new Error('WalletMiddleware - opts.processTransaction not provided')
    const txParams = req.params[0].transaction || {}
    const fromAddress = getBase58Address(getTxParamsFromAddress(txParams))
    await validateSender(fromAddress, req)
    res.result = await processTransaction(txParams, req)
  }

  async function signMessage (req, res) {
    console.log('MegTron.createWalletSubprovider.signMessage', { req, res })
    if (!processSignMessage) throw new Error('WalletMiddleware - opts.processSignMessage not provided')
    const data = req.params[0].message
    const useTronHeader = req.params[0].useTronHeader || false
    res.result = await processSignMessage({ data, useTronHeader }, req)
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
