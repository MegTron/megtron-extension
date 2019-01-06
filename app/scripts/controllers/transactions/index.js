const EventEmitter = require('events')
const ObservableStore = require('obs-store')
const ethUtil = require('ethereumjs-util')
const Transaction = require('ethereumjs-tx')
const TronQuery = require('../../lib/tron-query')
const TransactionStateManager = require('./tx-state-manager')
const PendingTransactionTracker = require('./pending-tx-tracker')
const NonceTracker = require('./nonce-tracker')
const txUtils = require('./lib/util')
const pify = require('pify')
const cleanErrorStack = require('../../lib/cleanErrorStack')
const log = require('loglevel')
const recipientBlacklistChecker = require('./lib/recipient-blacklist-checker')
const {
  TRANSACTION_TYPE_CANCEL,
  TRANSACTION_TYPE_RETRY,
  TRANSACTION_TYPE_STANDARD,
  TRANSACTION_STATUS_APPROVED,
} = require('./enums')

const { hexToBn, bnToHex, BnMultiplyByFraction } = require('../../lib/util')

/**
  Transaction Controller is an aggregate of sub-controllers and trackers
  composing them in a way to be exposed to the metamask controller
    <br>- txStateManager
      responsible for the state of a transaction and
      storing the transaction
    <br>- pendingTxTracker
      watching blocks for transactions to be include
      and emitting confirmed events
    <br>- nonceTracker
      calculating nonces


  @class
  @param {object} - opts
  @param {object}  opts.initState - initial transaction list default is an empty array
  @param {Object}  opts.networkStore - an observable store for network number
  @param {Object}  opts.blockTracker - An instance of eth-blocktracker
  @param {Object}  opts.provider - A network provider.
  @param {Function}  [opts.getGasPrice] - optional gas price calculator
  @param {Function}  opts.signTransaction - ethTx signer that returns a rawTx
  @param {Number}  [opts.txHistoryLimit] - number *optional* for limiting how many transactions are in state
  @param {Object}  opts.preferencesStore
*/

class TransactionController extends EventEmitter {
  constructor (opts) {
    super()
    this.networkStore = opts.networkStore || new ObservableStore({})
    this.preferencesStore = opts.preferencesStore || new ObservableStore({})
    this.provider = opts.provider
    this.blockTracker = opts.blockTracker
    this.signTransaction = opts.signTransaction
    this.getGasPrice = opts.getGasPrice

    this.memStore = new ObservableStore({})
    this.query = pify(new TronQuery(this.provider))

    this._mapMethods()
    this.txStateManager = new TransactionStateManager({
      initState: opts.initState,
      txHistoryLimit: opts.txHistoryLimit,
      getNetwork: this.getNetwork.bind(this),
    })
    this._onBootCleanUp()

    this.store = this.txStateManager.store
    this.nonceTracker = new NonceTracker({
      provider: this.provider,
      blockTracker: this.blockTracker,
      getPendingTransactions: this.txStateManager.getPendingTransactions.bind(this.txStateManager),
      getConfirmedTransactions: this.txStateManager.getConfirmedTransactions.bind(this.txStateManager),
    })

    this.pendingTxTracker = new PendingTransactionTracker({
      provider: this.provider,
      nonceTracker: this.nonceTracker,
      publishTransaction: (rawTx) => this.query.broadcastTransaction({...rawTx}),
      getPendingTransactions: this.txStateManager.getPendingTransactions.bind(this.txStateManager),
      getCompletedTransactions: this.txStateManager.getConfirmedTransactions.bind(this.txStateManager),
    })

    this.txStateManager.store.subscribe(() => this.emit('update:badge'))
    this._setupListeners()
    // memstore is computed from a few different stores
    this._updateMemstore()
    this.txStateManager.store.subscribe(() => this._updateMemstore())
    this.networkStore.subscribe(() => this._updateMemstore())
    this.preferencesStore.subscribe(() => this._updateMemstore())

    // request state update to finalize initialization
    this._updatePendingTxsAfterFirstBlock()
    const l = this.txStateManager.getTxList()
    console.log('MegTron.TransactionController.ctor', { l })
  }

  /** @returns {number} the chainId*/
  getChainId () {
    const networkState = this.networkStore.getState()
    const getChainId = parseInt(networkState)
    if (Number.isNaN(getChainId)) {
      return 0
    } else {
      return getChainId
    }
  }

/**
  Adds a tx to the txlist
  @emits ${txMeta.id}:unapproved
*/
  addTx (txMeta) {
    this.txStateManager.addTx(txMeta)
    this.emit(`${txMeta.id}:unapproved`, txMeta)
  }

  /**
  Wipes the transactions for a given account
  @param {string} address - hex string of the from address for txs being removed
  */
  wipeTransactions (address) {
    this.txStateManager.wipeTransactions(address)
  }

  /**
  add a new unapproved transaction to the pipeline

  @returns {Promise<string>} the hash of the transaction after being submitted to the network
  @param txParams {object} - txParams for the transaction
  @param opts {object} - with the key origin to put the origin on the txMeta
  */

  async newUnapprovedTransaction (txParams, opts = {}) {
    log.debug(`MegTronController newUnapprovedTransaction ${JSON.stringify(txParams)}`)
    log.debug(`MegTron.txController.newUnapprovedTransaction`, {txParams})
    const initialTxMeta = await this.addUnapprovedTransaction(txParams)
    initialTxMeta.origin = opts.origin
    this.txStateManager.updateTx(initialTxMeta, '#newUnapprovedTransaction - adding the origin')
    // listen for tx completion (success, fail)
    return new Promise((resolve, reject) => {
      this.txStateManager.once(`${initialTxMeta.id}:finished`, (finishedTxMeta) => {
        console.log('MegTron.transaction.index.js.newUnapprovedTransaction', { finishedTxMeta })
        switch (finishedTxMeta.status) {
          case 'submitted':
            return resolve(finishedTxMeta.rawTx)
          case 'rejected':
            return reject(cleanErrorStack(new Error('MetaMask Tx Signature: User denied transaction signature.')))
          case 'failed':
            return reject(cleanErrorStack(new Error(finishedTxMeta.err.message)))
          default:
            return reject(cleanErrorStack(new Error(`MetaMask Tx Signature: Unknown problem: ${JSON.stringify(finishedTxMeta.txParams)}`)))
        }
      })
    })
  }

  /**
  Validates and generates a txMeta with defaults and puts it in txStateManager
  store

  @returns {txMeta}
  */

  async addUnapprovedTransaction (txParams) {
    console.log('MegTron.TransactionController.index.addUnapprovedTransaction', { txParams })
    // Assert the from address is the selected address
    if (txUtils.getTxParamsFromAddress(txParams) !== txUtils.getHexAddress(this.getSelectedAddress())) {
      console.error(`Transaction from address isn't valid for this account`)
      throw new Error(`Transaction from address isn't valid for this account`)
    }
    txUtils.validateTxParams(txParams)
    // construct txMeta
    let txMeta = this.txStateManager.generateTxMeta({
      txParams: txParams,
      type: TRANSACTION_TYPE_STANDARD,
    })
    this.addTx(txMeta)
    this.emit('newUnapprovedTx', txMeta)

    txMeta.loadingDefaults = false
    // save txMeta
    this.txStateManager.updateTx(txMeta)

    return txMeta
  }
/**
  adds the tx gas defaults: gas && gasPrice
  @param txMeta {Object} - the txMeta object
  @returns {Promise<object>} resolves with txMeta
*/
  async addTxGasDefaults (txMeta) {
    return {}
    /*
    const txParams = txMeta.txParams
    // ensure value
    txParams.value = txParams.value ? ethUtil.addHexPrefix(txParams.value) : '0x0'
    txMeta.gasPriceSpecified = Boolean(txParams.gasPrice)
    let gasPrice = txParams.gasPrice
    if (!gasPrice) {
      gasPrice = this.getGasPrice ? this.getGasPrice() : await this.query.gasPrice()
    }
    txParams.gasPrice = ethUtil.addHexPrefix(gasPrice.toString(16))
    return {}
    */
  }

  /**
    Creates a new txMeta with the same txParams as the original
    to allow the user to resign the transaction with a higher gas values
    @param  originalTxId {number} - the id of the txMeta that
    you want to attempt to retry
    @return {txMeta}
  */

  async retryTransaction (originalTxId) {
    const originalTxMeta = this.txStateManager.getTx(originalTxId)
    const lastGasPrice = originalTxMeta.txParams.gasPrice
    const txMeta = this.txStateManager.generateTxMeta({
      txParams: originalTxMeta.txParams,
      lastGasPrice,
      loadingDefaults: false,
      type: TRANSACTION_TYPE_RETRY,
    })
    this.addTx(txMeta)
    this.emit('newUnapprovedTx', txMeta)
    return txMeta
  }

  /**
   * Creates a new approved transaction to attempt to cancel a previously submitted transaction. The
   * new transaction contains the same nonce as the previous, is a basic ETH transfer of 0x value to
   * the sender's address, and has a higher gasPrice than that of the previous transaction.
   * @param {number} originalTxId - the id of the txMeta that you want to attempt to cancel
   * @param {string=} customGasPrice - the hex value to use for the cancel transaction
   * @returns {txMeta}
   */
  async createCancelTransaction (originalTxId, customGasPrice) {
    const originalTxMeta = this.txStateManager.getTx(originalTxId)
    const { txParams } = originalTxMeta
    const { gasPrice: lastGasPrice, from, nonce } = txParams

    const newGasPrice = customGasPrice || bnToHex(BnMultiplyByFraction(hexToBn(lastGasPrice), 11, 10))
    const newTxMeta = this.txStateManager.generateTxMeta({
      txParams: {
        from,
        to: from,
        nonce,
        gas: '0x5208',
        value: '0x0',
        gasPrice: newGasPrice,
      },
      lastGasPrice,
      loadingDefaults: false,
      status: TRANSACTION_STATUS_APPROVED,
      type: TRANSACTION_TYPE_CANCEL,
    })

    this.addTx(newTxMeta)
    await this.approveTransaction(newTxMeta.id)
    return newTxMeta
  }

  /**
  updates the txMeta in the txStateManager
  @param txMeta {Object} - the updated txMeta
  */
  async updateTransaction (txMeta) {
    console.log('MegTron.transaction.index.updateTransaction', {txMeta})
    this.txStateManager.updateTx(txMeta, 'confTx: user updated transaction')
  }

  /**
  updates and approves the transaction
  @param txMeta {Object}
  */
  async updateAndApproveTransaction (txMeta) {
    this.txStateManager.updateTx(txMeta, 'confTx: user approved transaction')
    await this.approveTransaction(txMeta.id)
  }

  /**
  sets the tx status to approved
  signs the transaction
  publishes the transaction
  if any of these steps fails the tx status will be set to failed
    @param txId {number} - the tx's Id
  */
  async approveTransaction (txId) {
    console.log('MegTron.transaction.index.approveTransactions', {txId})
    try {
      console.log('MegTron.transaction.index.approveTransactions', 'start')
      // approve
      this.txStateManager.setTxStatusApproved(txId)
      console.log('MegTron.transaction.index.approveTransactions', 'after set approved')
      // get next nonce
      const txMeta = this.txStateManager.getTx(txId)
      this.txStateManager.updateTx(txMeta, 'transactions#approveTransaction')
      // sign transaction
      console.log('MegTron.transaction.index.approveTransactions', 'before sign')
      const rawTx = await this.signTx(txId)
      console.log('MegTron.transaction.index.approveTransactions', 'before publish')
      await this.publishTransaction(txId, rawTx)
      console.log('MegTron.transaction.index.approveTransactions', 'after publish')
    } catch (err) {
      // this is try-catch wrapped so that we can guarantee that the nonceLock is released
      try {
        this.txStateManager.setTxStatusFailed(txId, err)
      } catch (err) {
        log.error(err)
      }
      // continue with error chain
      throw err
    }
  }
  /**
    adds the chain id and signs the transaction and set the status to signed
    @param txId {number} - the tx's Id
    @returns - rawTx {string}
  */
  async signTx(txId) {
    console.log('MegTron.transaction.index.signTransaction', { txId })
    const txMeta = this.txStateManager.getTx(txId)
    const txParams = Object.assign({}, txMeta.txParams)
    console.log('MegTron.transaction.index.signTransaction', { txMeta, txParams })
    // sign tx
    const fromAddress = txUtils.getBase58Address(txUtils.getTxParamsFromAddress(txParams))
    const ethTx = txParams
    console.log('MegTron.transaction.index.signTransaction.beforeSign', { ethTx, fromAddress })
    const tx = await this.signTransaction(ethTx, fromAddress)
    // set state to signed
    this.txStateManager.setTxStatusSigned(txMeta.id)
    console.log('MegTron.transaction.index.signTransaction.signed', { tx })
    return tx
  }

  /**
    publishes the raw tx and sets the txMeta to submitted
    @param txId {number} - the tx's Id
    @param rawTx {string} - the hex string of the serialized signed transaction
    @returns {Promise<void>}
  */
  async publishTransaction (txId, rawTx) {
    const txMeta = this.txStateManager.getTx(txId)
    txMeta.rawTx = rawTx
    this.txStateManager.updateTx(txMeta, 'transactions#publishTransaction')
    const txHash = await this.query.broadcastTransaction({...rawTx})
    this.setTxPublishStatus(txId, txHash)
    this.setTxHash(txId, txHash)
    this.txStateManager.setTxStatusSubmitted(txId)
    if (txHash.code) {
      throw new Error(txHash.code)
    }
  }

  /**
   * Sets the status of the transaction to confirmed and sets the status of nonce duplicates as
   * dropped if the txParams have data it will fetch the txReceipt
   * @param {number} txId - The tx's ID
   * @returns {Promise<void>}
   */
  async confirmTransaction (txId) {
    // get the txReceipt before marking the transaction confirmed
    // to ensure the receipt is gotten before the ui revives the tx
    const txMeta = this.txStateManager.getTx(txId)

    if (!txMeta) {
      return
    }
    this.txStateManager.updateTx(txMeta, 'transactions#confirmTransaction - add txReceipt')
    this.txStateManager.setTxStatusConfirmed(txId)
  }

  /**
    Convenience method for the ui thats sets the transaction to rejected
    @param txId {number} - the tx's Id
    @returns {Promise<void>}
  */
  async cancelTransaction (txId) {
    this.txStateManager.setTxStatusRejected(txId)
  }

  /**
    Sets the txHas on the txMeta
    @param txId {number} - the tx's Id
    @param txHash {string} - the hash for the txMeta
  */
  setTxHash (txId, txHash) {
    // Add the tx hash to the persisted meta-tx object
    const txMeta = this.txStateManager.getTx(txId)
    txMeta.hash = txHash
    this.txStateManager.updateTx(txMeta, 'transactions#setTxHash')
  }

  /**
    Sets the tx publish result on the txMeta
    @param txId {number} - the tx's Id
    @param status {object} - the publish status for the txMeta
  */
  setTxPublishStatus (txId, status) {
    // Add the tx hash to the persisted meta-tx object
    const txMeta = this.txStateManager.getTx(txId)
    txMeta.publish = status
    this.txStateManager.updateTx(txMeta, 'transactions#setTxPublishStatus')
  }

//
//           PRIVATE METHODS
//
  /** maps methods for convenience*/
  _mapMethods () {
    /** @returns the state in transaction controller */
    this.getState = () => this.memStore.getState()
    /** @returns the network number stored in networkStore */
    this.getNetwork = () => this.networkStore.getState()
    /** @returns the user selected address */
    this.getSelectedAddress = () => this.preferencesStore.getState().selectedAddress
    /** Returns an array of transactions whos status is unapproved */
    this.getUnapprovedTxCount = () => Object.keys(this.txStateManager.getUnapprovedTxList()).length
    /**
      @returns a number that represents how many transactions have the status submitted
      @param account {String} - hex prefixed account
    */
    this.getPendingTxCount = (account) => this.txStateManager.getPendingTransactions(account).length
    /** see txStateManager */
    this.getFilteredTxList = (opts) => this.txStateManager.getFilteredTxList(opts)
  }

  // called once on startup
  async _updatePendingTxsAfterFirstBlock () {
    // wait for first block so we know we're ready
    await this.blockTracker.getLatestBlock()
    // get status update for all pending transactions (for the current network)
    await this.pendingTxTracker.updatePendingTxs()
  }

  /**
    If transaction controller was rebooted with transactions that are uncompleted
    in steps of the transaction signing or user confirmation process it will either
    transition txMetas to a failed state or try to redo those tasks.
  */

  _onBootCleanUp () {
    this.txStateManager.getFilteredTxList({
      status: 'unapproved',
      loadingDefaults: true,
    }).forEach((tx) => {
      this.addTxGasDefaults(tx)
      .then((txMeta) => {
        txMeta.loadingDefaults = false
        this.txStateManager.updateTx(txMeta, 'transactions: gas estimation for tx on boot')
      }).catch((error) => {
        this.txStateManager.setTxStatusFailed(tx.id, error)
      })
    })

    this.txStateManager.getFilteredTxList({
      status: TRANSACTION_STATUS_APPROVED,
    }).forEach((txMeta) => {
      const txSignError = new Error('Transaction found as "approved" during boot - possibly stuck during signing')
      this.txStateManager.setTxStatusFailed(txMeta.id, txSignError)
    })
  }

  /**
    is called in constructor applies the listeners for pendingTxTracker txStateManager
    and blockTracker
  */
  _setupListeners () {
    this.txStateManager.on('tx:status-update', this.emit.bind(this, 'tx:status-update'))
    this._setupBlockTrackerListener()
    this.pendingTxTracker.on('tx:warning', (txMeta) => {
      this.txStateManager.updateTx(txMeta, 'transactions/pending-tx-tracker#event: tx:warning')
    })
    this.pendingTxTracker.on('tx:failed', this.txStateManager.setTxStatusFailed.bind(this.txStateManager))
    this.pendingTxTracker.on('tx:confirmed', (txId) => this.confirmTransaction(txId))
    this.pendingTxTracker.on('tx:block-update', (txMeta, latestBlockNumber) => {
      if (!txMeta.firstRetryBlockNumber) {
        txMeta.firstRetryBlockNumber = latestBlockNumber
        this.txStateManager.updateTx(txMeta, 'transactions/pending-tx-tracker#event: tx:block-update')
      }
    })
    this.pendingTxTracker.on('tx:retry', (txMeta) => {
      if (!('retryCount' in txMeta)) txMeta.retryCount = 0
      txMeta.retryCount++
      this.txStateManager.updateTx(txMeta, 'transactions/pending-tx-tracker#event: tx:retry')
    })
  }

  _setupBlockTrackerListener () {
    let listenersAreActive = false
    const latestBlockHandler = this._onLatestBlock.bind(this)
    const blockTracker = this.blockTracker
    const txStateManager = this.txStateManager

    txStateManager.on('tx:status-update', updateSubscription)
    updateSubscription()

    function updateSubscription () {
      const pendingTxs = txStateManager.getPendingTransactions()
      if (!listenersAreActive && pendingTxs.length > 0) {
        blockTracker.on('latest', latestBlockHandler)
        listenersAreActive = true
      } else if (listenersAreActive && !pendingTxs.length) {
        blockTracker.removeListener('latest', latestBlockHandler)
        listenersAreActive = false
      }
    }
  }

  async _onLatestBlock (blockNumber) {
    try {
      await this.pendingTxTracker.updatePendingTxs()
    } catch (err) {
      log.error(err)
    }
    try {
      await this.pendingTxTracker.resubmitPendingTxs(blockNumber)
    } catch (err) {
      log.error(err)
    }
  }

  /**
    Updates the memStore in transaction controller
  */
  _updateMemstore () {
    this.pendingTxTracker.updatePendingTxs()
    const unapprovedTxs = this.txStateManager.getUnapprovedTxList()
    const before = this.txStateManager.getTxList()
    console.log('MegTron.TransactionController.updateMemstore', { before })
    const selectedAddressTxList = this.txStateManager.getFilteredTxList({
      owner_address: txUtils.getHexAddress(this.getSelectedAddress()),
      metamaskNetworkId: this.getNetwork(),
    })
    console.log('MegTron.TransactionController.updateMemstore', { before, selectedAddressTxList })
    this.memStore.updateState({ unapprovedTxs, selectedAddressTxList })
  }
}

module.exports = TransactionController
