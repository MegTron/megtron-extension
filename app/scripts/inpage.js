/*global TronWeb*/
cleanContextForImports()
const log = require('loglevel')
const LocalMessageDuplexStream = require('post-message-stream')
const setupDappAutoReload = require('./lib/auto-reload.js')
const MegtronInpageProvider = require('./lib/megtron-inpage-provider')
const TronWeb = require('tronweb')

restoreContextAfterImports()

log.setDefaultLevel(process.env.METAMASK_DEBUG ? 'debug' : 'warn')

//
// setup plugin communication
//

// setup background connection
var megtronStream = new LocalMessageDuplexStream({
  name: 'inpage',
  target: 'contentscript',
})

// compose the inpage provider
var inpageProvider = new MegtronInpageProvider(megtronStream)
// set a high max listener count to avoid unnecesary warnings
inpageProvider.setMaxListeners(100)

// Augment the provider with its enable method
inpageProvider.enable = function (options = {}) {
  return new Promise((resolve, reject) => {
    if (options.mockRejection) {
      reject('User rejected account access')
    } else {
      inpageProvider.sendAsync({ method: 'eth_accounts', params: [] }, (error, response) => {
        if (error) {
          reject(error)
        } else {
          resolve(response.result)
        }
      })
    }
  })
}

// Work around for tronWeb deleting the bound `sendAsync` but not the unbound
// `sendAsync` method on the prototype, causing `this` reference issues with drizzle
const proxiedInpageProvider = new Proxy(inpageProvider, {
  // straight up lie that we deleted the property so that it doesnt
  // throw an error in strict mode
  deleteProperty: () => true,
})

window.ethereum = proxiedInpageProvider

//
// setup tronWeb
//

if (typeof window.tronWeb !== 'undefined') {
  throw new Error(`MegTron detected another tronWeb.
     MegTron will not work reliably with another tronWeb extension.
     This usually happens if you have two MegTron installed,
     or MegTron and another tronWeb extension. Please remove one
     and try again.`)
}

// TronWeb only allow providers of type HttpProvider at the moment.
// This workaround changed the `isValidProvider` function to support MegtronInpageProvider.
// Because provider is checked in the constructor, we create the tronWeb instance with dummy HttpProivder first,
// then replace providers with MegtronInpageProvider.
const dummyProvider = new TronWeb.providers.HttpProvider('http://127.0.0.1')
var tronWeb = new TronWeb(dummyProvider, dummyProvider)
const originalIsValidProvider = tronWeb.isValidProvider.bind(tronWeb)
const originalSetAddress = tronWeb.setAddress.bind(tronWeb)
const originalSign = tronWeb.trx.sign.bind(tronWeb.trx)
tronWeb.isValidProvider = function (provider) {
  return originalIsValidProvider(provider) || provider instanceof MegtronInpageProvider
}
tronWeb.setFullNode(proxiedInpageProvider)
tronWeb.setSolidityNode(proxiedInpageProvider)
tronWeb.setFullNode = () => new Error('MegTron has disabled this feature')
tronWeb.setSolidityNode = () => new Error('MegTron has disabled this feature')
tronWeb.setEventServer = () => new Error('MegTron has disabled this feature')
tronWeb.setPrivateKey = () => new Error('MegTron has disabled this feature')
tronWeb.setAddress = () => new Error('MegTron has disabled this feature')

const sign = function (transaction, privateKey = false, useTronHeader = true, callback = false) {
  if (tronWeb.utils.isFunction(privateKey)) {
      callback = privateKey
      privateKey = false
  }

  if (tronWeb.utils.isFunction(useTronHeader)) {
      callback = useTronHeader
      useTronHeader = true
  }

  if (!callback) {
    // return promise
    return new Promise((resolve, reject) => {
      sign(transaction, privateKey, useTronHeader, (err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      })
    })
  }

  if (privateKey) {
    return originalSign(transaction, privateKey, useTronHeader, callback)
  }

  if (!transaction) {
    return callback('Invalid transaction provided')
  }

  proxiedInpageProvider.request('wallet/gettransactionsign', { transaction }, 'post'
  ).then(transaction => {
    callback(null, transaction)
  }).catch(err => {
    log.err('Failed to sign transaction:', err)
    callback(err)
  })
}
tronWeb.trx.sign = (...args) => sign(...args)

setupDappAutoReload(tronWeb, inpageProvider.publicConfigStore)

// set tronWeb defaultAccount
inpageProvider.publicConfigStore.subscribe(function (state) {
  const currentAddress = tronWeb.defaultAddress.base58
  const newAddress = state.selectedAddress || false
  if (newAddress && newAddress !== currentAddress) {
    originalSetAddress(state.selectedAddress)
  }
})


// need to make sure we aren't affected by overlapping namespaces
// and that we dont affect the app with our namespace
// mostly a fix for web3's BigNumber if AMD's "define" is defined...
var __define

/**
 * Caches reference to global define object and deletes it to
 * avoid conflicts with other global define objects, such as
 * AMD's define function
 */
function cleanContextForImports () {
  __define = global.define
  try {
    global.define = undefined
  } catch (_) {
    console.warn('MegTron - global.define could not be deleted.')
  }
}

/**
 * Restores global define object from cached reference
 */
function restoreContextAfterImports () {
  try {
    global.define = __define
  } catch (_) {
    console.warn('MegTron - global.define could not be overwritten.')
  }
}
