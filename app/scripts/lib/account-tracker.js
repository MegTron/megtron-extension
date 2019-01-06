/* Account Tracker
 *
 * This module is responsible for tracking any number of accounts
 * and caching their current balances & transaction counts.
 *
 * It also tracks transaction hashes, and checks their inclusion status
 * on each new block.
 */

const extend = require('xtend')
const TronQuery = require('./tron-query')
const ObservableStore = require('obs-store')
const log = require('loglevel')
const pify = require('pify')
const { getHexAddress, getBase58Address } = require('../controllers/transactions/lib/util')
const intToHex = require('ethereumjs-util').intToHex


class AccountTracker {

  /**
   * This module is responsible for tracking any number of accounts and caching their current balances & transaction
   * counts.
   *
   * It also tracks transaction hashes, and checks their inclusion status on each new block.
   *
   * @typedef {Object} AccountTracker
   * @param {Object} opts Initialize various properties of the class.
   * @property {Object} store The stored object containing all accounts to track, as well as the current block's gas limit.
   * @property {Object} store.accounts The accounts currently stored in this AccountTracker
   * @property {string} store.currentBlockGasLimit A hex string indicating the gas limit of the current block
   * @property {Object} store.tokens The tokens the curent accounts have
   * @property {Object} _provider A provider needed to create the TronQuery instance used within this AccountTracker.
   * @property {TronQuery} _query An TronQuery instance used to access account information from the blockchain
   * @property {BlockTracker} _blockTracker A BlockTracker instance. Needed to ensure that accounts and their info updates
   * when a new block is created.
   * @property {Object} _currentBlockNumber Reference to a property on the _blockTracker: the number (i.e. an id) of the the current block
   *
   */
  constructor (opts = {}) {
    const initState = {
      accounts: {},
      currentBlockGasLimit: '',
      tokens: [],
    }
    this.store = new ObservableStore(initState)

    this._provider = opts.provider
    this._query = pify(new TronQuery(this._provider))
    this._blockTracker = opts.blockTracker
    // blockTracker.currentBlock may be null
    this._currentBlockNumber = this._blockTracker.getCurrentBlock()
    this._blockTracker.once('latest', blockNumber => {
      this._currentBlockNumber = blockNumber
    })
    // bind function for easier listener syntax
    this._updateForBlock = this._updateForBlock.bind(this)
    this._assetAddressMap = {}
    this._assetInfoMap = {}
  }

  start () {
    // remove first to avoid double add
    this._blockTracker.removeListener('latest', this._updateForBlock)
    // add listener
    this._blockTracker.addListener('latest', this._updateForBlock)
    // fetch account balances
    this._updateAccounts()
  }

  stop () {
    // remove listener
    this._blockTracker.removeListener('latest', this._updateForBlock)
  }

  /**
   * Ensures that the locally stored accounts are in sync with a set of accounts stored externally to this
   * AccountTracker.
   *
   * Once this AccountTracker's accounts are up to date with those referenced by the passed addresses, each
   * of these accounts are given an updated balance via TronQuery.
   *
   * @param {array} address The array of hex addresses for accounts with which this AccountTracker's accounts should be
   * in sync
   *
   */
  syncWithAddresses (addresses) {
    const accounts = this.store.getState().accounts
    const locals = Object.keys(accounts)

    const accountsToAdd = []
    addresses.forEach((upstream) => {
      if (!locals.includes(upstream)) {
        accountsToAdd.push(upstream)
      }
    })

    const accountsToRemove = []
    locals.forEach((local) => {
      if (!addresses.includes(local)) {
        accountsToRemove.push(local)
      }
    })

    this.addAccounts(accountsToAdd)
    this.removeAccount(accountsToRemove)
  }

  /**
   * Adds new addresses to track the balances of
   * given a balance as long this._currentBlockNumber is defined.
   *
   * @param {array} addresses An array of hex addresses of new accounts to track
   *
   */
  addAccounts (addresses) {
    const accounts = this.store.getState().accounts
    // add initial state for addresses
    addresses.forEach(address => {
      accounts[address] = {}
    })
    // save accounts state
    this.store.updateState({ accounts })
    // fetch balances for the accounts if there is block number ready
    if (!this._currentBlockNumber) return
    addresses.forEach(address => this._updateAccount(address))
  }

  /**
   * Removes accounts from being tracked
   *
   * @param {array} an array of hex addresses to stop tracking
   *
   */
  removeAccount (addresses) {
    const accounts = this.store.getState().accounts
    // remove each state object
    addresses.forEach(address => {
      delete accounts[address]
    })
    // save accounts state
    this.store.updateState({ accounts })
  }

  /**
   * Given a block, updates this AccountTracker's currentBlockGasLimit, and then updates each local account's balance
   * via TronQuery
   *
   * @private
   * @param {number} blockNumber the block number to update to.
   * @fires 'block' The updated state, if all account updates are successful
   *
   */
  async _updateForBlock (blockNumber) {
    this._currentBlockNumber = blockNumber

    try {
      await this._updateAccounts()
    } catch (err) {
      log.error(err)
    }
  }

  /**
   * Calls this._updateAccount for each account in this.store
   *
   * @returns {Promise} after all account balances updated
   *
   */
  async _updateAccounts () {
    this._assetInfoMap = {}
    const accounts = this.store.getState().accounts
    const addresses = Object.keys(accounts)
    await Promise.all(addresses.map(this._updateAccount.bind(this)))
  }

  async _getAssetAddress (assetKey) {
    if (!this._assetAddressMap[assetKey]) {
      const value = Buffer.from(assetKey).toString('hex')
      const assetInfoResult = await this._query.assetIssueByName({ value })
      this._assetAddressMap[assetKey] = getBase58Address(assetInfoResult.owner_address)
    }
    return this._assetAddressMap[assetKey]
  }

  async _getAssetInfo (assetID) {
    if (!this._assetInfoMap[assetID]) {
      const assetInfo = await this._query.getAssetIssueByID({ value: assetID })
      if (assetInfo.name) {
        assetInfo.symbol = new Buffer(assetInfo.name, 'hex').toString()
      }
      if (assetInfo.owner_address) {
        assetInfo.address = getBase58Address(assetInfo.owner_address)
      }
      this._assetInfoMap[assetID] = assetInfo
    }
    return this._assetInfoMap[assetID]
  }

  /**
   * Updates the current balance of an account.
   *
   * @private
   * @param {string} address A base58 address of a the account to be updated
   * @returns {Promise} after the account balance is updated
   *
   */
  async _updateAccount (address) {
    // query balance
    const balanceResult = await this._query.getBalance({ address: getHexAddress(address) })
    const balanceNum = balanceResult.balance || 0
    const balance = intToHex(balanceNum)
    const asset = (balanceResult.assetV2 || [])
    for (var i = 0; i < asset.length; i++) {
      const info = await this._getAssetInfo(asset[i].key)
      console.log('MegTron.account-tracker.updateAccount', { info })
      asset[i] = extend(asset[i], info)
      console.log('MegTron.account-tracker.updateAccount', asset[i])
    }
    console.log('MegTron.account-tracker.updateAccount', 'done')
    const result = { address, balance, asset }
    // update accounts state
    const { accounts } = this.store.getState()
    // only populate if the entry is still present
    if (!accounts[address]) return
    accounts[address] = result
    const tokens = Object.keys(this._assetInfoMap).map(k => this._assetInfoMap[k])
    this.store.updateState({ accounts, tokens })
  }
}

module.exports = AccountTracker
