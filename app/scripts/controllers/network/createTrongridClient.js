const mergeMiddleware = require('json-rpc-engine/src/mergeMiddleware')
const providerFromMiddleware = require('eth-json-rpc-middleware/providerFromMiddleware')
const createTronMiddleware = require('./tron-json-rpc-trongrid')
const BlockTracker = require('./tronPollingBlockTracker')

module.exports = createTrongridClient

function createTrongridClient ({ network }) {
  const trongridMiddleware = createTronMiddleware({ network })
  const trongridProvider = providerFromMiddleware(trongridMiddleware)
  const blockTracker = new BlockTracker({ provider: trongridProvider })

  const networkMiddleware = mergeMiddleware([
    /*
    createBlockCacheMiddleware({ blockTracker }),
    createInflightMiddleware(),
    createBlockReRefMiddleware({ blockTracker, provider: trongridProvider }),
    createRetryOnEmptyMiddleware({ blockTracker, provider: trongridProvider }),
    createBlockTrackerInspectorMiddleware({ blockTracker }),
    */
    trongridMiddleware,
  ])
  return { networkMiddleware, blockTracker }
}
