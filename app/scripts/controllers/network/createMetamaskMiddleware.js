const mergeMiddleware = require('json-rpc-engine/src/mergeMiddleware')
const createScaffoldMiddleware = require('json-rpc-engine/src/createScaffoldMiddleware')
const createAsyncMiddleware = require('json-rpc-engine/src/createAsyncMiddleware')
const createWalletSubprovider = require('./createWalletSubprovider')

module.exports = createMetamaskMiddleware

function createMetamaskMiddleware ({
  version,
  getAccounts,
  getTransactionPublishStatus,
  processTransaction,
  processSignMessage,
  processEthSignMessage,
  processTypedMessage,
  processPersonalMessage,
  getPendingNonce,
}) {
  const metamaskMiddleware = mergeMiddleware([
    createScaffoldMiddleware({
      // staticSubprovider
      eth_syncing: false,
      web3_clientVersion: `MetaMask/v${version}`,
    }),
    createWalletSubprovider({
      getAccounts,
      getTransactionPublishStatus,
      processTransaction,
      processSignMessage,
      processEthSignMessage,
      processTypedMessage,
      processPersonalMessage,
    }),
    createPendingNonceMiddleware({ getPendingNonce }),
  ])
  return metamaskMiddleware
}

function createPendingNonceMiddleware ({ getPendingNonce }) {
  return createAsyncMiddleware(async (req, res, next) => {
    if (req.method !== 'eth_getTransactionCount') return next()
    const address = req.params[0]
    const blockRef = req.params[1]
    if (blockRef !== 'pending') return next()
    res.result = await getPendingNonce(address)
  })
}
