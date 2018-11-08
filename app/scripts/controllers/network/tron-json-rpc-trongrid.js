// Inspired by eth-json-rpc-infura
const createAsyncMiddleware = require('json-rpc-engine/src/createAsyncMiddleware')
const JsonRpcError = require('json-rpc-error')

const GET_METHODS = [
  'walletsolidity/getnowblock',
]
const RETRIABLE_ERRORS = [
  // ignore server overload errors
  'Gateway timeout',
  'ETIMEDOUT',
  // ignore server sent html error pages
  // or truncated json responses
  'SyntaxError',
]

module.exports = createTrongridMiddleware
module.exports.fetchConfigFromReq = fetchConfigFromReq

function createTrongridMiddleware ({ network = 'mainnet', maxAttempts = 5 }) {
  // validate options
  if (!maxAttempts) throw new Error(`Invalid value for 'maxAttempts': "${maxAttempts}" (${typeof maxAttempts})`)

  return createAsyncMiddleware(async (req, res, next) => {
    // retry MAX_ATTEMPTS times, if error matches filter
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // attempt request
        await performFetch(network, req, res)
        // request was succesful
        break
      } catch (err) {
        // an error was caught while performing the request
        // if not retriable, resolve with the encountered error
        if (!isRetriableError(err)) {
          // abort with error
          throw err
        }
        // if no more attempts remaining, throw an error
        const remainingAttempts = maxAttempts - attempt
        if (!remainingAttempts) {
          const errMsg = `TrongridProvider - cannot complete request. All retries exhausted.\nOriginal Error:\n${err.toString()}\n\n`
          const retriesExhaustedErr = new Error(errMsg)
          throw retriesExhaustedErr
        }
        // otherwise, ignore error and retry again after timeout
        await timeout(1000)
      }
    }
    // request was handled correctly, end
  })
}

function timeout (length) {
  return new Promise((resolve) => {
    setTimeout(resolve, length)
  })
}

function isRetriableError (err) {
  const errMessage = err.toString()
  return RETRIABLE_ERRORS.some(phrase => errMessage.includes(phrase))
}

async function performFetch (network, req, res) {
  const { fetchUrl, fetchParams } = fetchConfigFromReq({ network, req })
  const response = await fetch(fetchUrl, fetchParams)
  const rawData = await response.text()
  // handle errors
  if (!response.ok) {
    switch (response.status) {
      case 405:
        throw new JsonRpcError.MethodNotFound()

      case 418:
        throw createRatelimitError()

      case 503:
      case 504:
        throw createTimeoutError()

      default:
        throw createInternalError(rawData)
    }
  }

  // special case for now
  if (req.method === 'eth_getBlockByNumber' && rawData === 'Not Found') {
    res.result = null
    return
  }

  // parse JSON
  const data = JSON.parse(rawData)

  // finally return result
  res.result = data.result
  res.error = data.error
}

function fetchConfigFromReq ({ network, req }) {
  const { method, params } = req

  const fetchParams = {}
  let fetchUrl = network === 'mainnet' ? `https://api.trongrid.io` : `https://api.${network}.trongrid.io`
  const isPostMethod = !GET_METHODS.includes(method)
  if (isPostMethod) {
    fetchParams.method = 'POST'
    fetchParams.headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
    fetchParams.body = JSON.stringify(params)
    fetchUrl += `/${method}`
  } else {
    fetchParams.method = 'GET'
    const paramsString = encodeURIComponent(JSON.stringify(params))
    fetchUrl += `/${method}?params=${paramsString}`
  }

  return { fetchUrl, fetchParams }
}

function createRatelimitError () {
  const msg = `Request is being rate limited.`
  return createInternalError(msg)
}

function createTimeoutError () {
  let msg = `Gateway timeout. The request took too long to process. `
  msg += `This can happen when querying logs over too wide a block range.`
  return createInternalError(msg)
}

function createInternalError (msg) {
  const err = new Error(msg)
  return new JsonRpcError.InternalError(err)
}
