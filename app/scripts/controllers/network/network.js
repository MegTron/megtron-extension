const assert = require('assert')
const EventEmitter = require('events')
const ObservableStore = require('obs-store')
const ComposedStore = require('obs-store/lib/composed')
const JsonRpcEngine = require('json-rpc-engine')
const providerFromEngine = require('eth-json-rpc-middleware/providerFromEngine')
const log = require('loglevel')
const createMetamaskMiddleware = require('./createMetamaskMiddleware')
const createJsonRpcClient = require('./createJsonRpcClient')
const createLocalhostClient = require('./createLocalhostClient')
const createTrongridClient = require('./createTrongridClient')
const { createSwappableProxy, createEventEmitterProxy } = require('swappable-obj-proxy')
const { getNetworkCode } = require('./util')

const {
  MAINNET,
  SHASTA,
  LOCALHOST,
} = require('./enums')
const TRONGRID_PROVIDER_TYPES = [MAINNET, SHASTA]

const env = process.env.METAMASK_ENV
const METAMASK_DEBUG = process.env.METAMASK_DEBUG
const testMode = (METAMASK_DEBUG || env === 'test')

const defaultProviderConfig = {
  type: testMode ? SHASTA : MAINNET,
}

module.exports = class NetworkController extends EventEmitter {

  constructor (opts = {}) {
    super()

    // parse options
    const providerConfig = opts.provider || defaultProviderConfig
    // create stores
    this.providerStore = new ObservableStore(providerConfig)
    this.networkStore = new ObservableStore('loading')
    this.store = new ComposedStore({ provider: this.providerStore, network: this.networkStore })
    this.on('networkDidChange', this.lookupNetwork)
    // provider and block tracker
    this._provider = null
    this._blockTracker = null
    // provider and block tracker proxies - because the network changes
    this._providerProxy = null
    this._blockTrackerProxy = null
  }

  initializeProvider (providerParams) {
    this._baseProviderParams = providerParams
    const { type, rpcTarget } = this.providerStore.getState()
    this._configureProvider({ type, rpcTarget })
    this.lookupNetwork()
  }

  // return the proxies so the references will always be good
  getProviderAndBlockTracker () {
    const provider = this._providerProxy
    const blockTracker = this._blockTrackerProxy
    return { provider, blockTracker }
  }

  verifyNetwork () {
    // Check network when restoring connectivity:
    if (this.isNetworkLoading()) this.lookupNetwork()
  }

  getNetworkState () {
    return this.networkStore.getState()
  }

  setNetworkState (network) {
    return this.networkStore.putState(network)
  }

  isNetworkLoading () {
    return this.getNetworkState() === 'loading'
  }

  lookupNetwork () {
    // Prevent firing when provider is not defined.
    if (!this._provider) {
      return log.warn('NetworkController - lookupNetwork aborted due to missing provider')
    }
    const { type } = this.getProviderConfig()
    this.setNetworkState(getNetworkCode(type).toString())
  }

  setRpcTarget (rpcTarget) {
    const providerConfig = {
      type: 'rpc',
      rpcTarget,
    }
    this.providerConfig = providerConfig
  }

  async setProviderType (type) {
    console.log('MegTron.network.setProviderType', { type })
    assert.notEqual(type, 'rpc', `NetworkController - cannot call "setProviderType" with type 'rpc'. use "setRpcTarget"`)
    assert(TRONGRID_PROVIDER_TYPES.includes(type) || type === LOCALHOST, `NetworkController - Unknown rpc type "${type}"`)
    const providerConfig = { type }
    this.providerConfig = providerConfig
  }

  resetConnection () {
    this.providerConfig = this.getProviderConfig()
  }

  set providerConfig (providerConfig) {
    this.providerStore.updateState(providerConfig)
    this._switchNetwork(providerConfig)
  }

  getProviderConfig () {
    return this.providerStore.getState()
  }

  //
  // Private
  //

  _switchNetwork (opts) {
    this.setNetworkState('loading')
    this._configureProvider(opts)
    this.emit('networkDidChange')
  }

  _configureProvider (opts) {
    const { type, rpcTarget } = opts
    // trongrid type-based endpoints
    const isTrongrid = TRONGRID_PROVIDER_TYPES.includes(type)
    if (isTrongrid) {
      this._configureTrongridProvider(opts)
    // other type-based rpc endpoints
    } else if (type === LOCALHOST) {
      this._configureLocalhostProvider()
    // url-based rpc endpoints
    } else if (type === 'rpc') {
      this._configureStandardProvider({ rpcUrl: rpcTarget })
    } else {
      throw new Error(`NetworkController - _configureProvider - unknown type "${type}"`)
    }
  }

  _configureTrongridProvider ({ type }) {
    log.info('NetworkController - configureTrongridProvider', type)
    const networkClient = createTrongridClient({ network: type })
    this._setNetworkClient(networkClient)
  }

  _configureLocalhostProvider () {
    log.info('NetworkController - configureLocalhostProvider')
    const networkClient = createLocalhostClient()
    this._setNetworkClient(networkClient)
  }

  _configureStandardProvider ({ rpcUrl }) {
    log.info('NetworkController - configureStandardProvider', rpcUrl)
    const networkClient = createJsonRpcClient({ rpcUrl })
    this._setNetworkClient(networkClient)
  }

  _setNetworkClient ({ networkMiddleware, blockTracker }) {
    const metamaskMiddleware = createMetamaskMiddleware(this._baseProviderParams)
    const engine = new JsonRpcEngine()
    engine.push(metamaskMiddleware)
    engine.push(networkMiddleware)
    const provider = providerFromEngine(engine)
    this._setProviderAndBlockTracker({ provider, blockTracker })
  }

  _setProviderAndBlockTracker ({ provider, blockTracker }) {
    // update or intialize proxies
    if (this._providerProxy) {
      this._providerProxy.setTarget(provider)
    } else {
      this._providerProxy = createSwappableProxy(provider)
    }
    if (this._blockTrackerProxy) {
      this._blockTrackerProxy.setTarget(blockTracker)
    } else {
      this._blockTrackerProxy = createEventEmitterProxy(blockTracker, { eventFilter: 'skipInternal' })
    }
    // set new provider and blockTracker
    this._provider = provider
    this._blockTracker = blockTracker
  }

  _logBlock (block) {
    log.info(`BLOCK CHANGED: #${block.number.toString('hex')} 0x${block.hash.toString('hex')}`)
    this.verifyNetwork()
  }
}
