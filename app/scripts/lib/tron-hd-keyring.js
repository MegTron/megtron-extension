/* Tron HD Keyring
 * 
 * A wrapper for github.com/cobowallet/tron-wallet, a HD Wallet for Tron.
 * 
 * Similar to github.com/MetaMask/eth-hd-keyring, this pacakge provides a
 * Keyring Class Protocol, to be used in KeyringController, like is being
 * used in MetaMask.
 */ 

const log = require('loglevel')
const EventEmitter = require('events').EventEmitter
const hdkey = require('ethereumjs-wallet/hdkey')
const bip39 = require('bip39')
const ethUtil = require('ethereumjs-util')
const sigUtil = require('eth-sig-util')
const TronWallet = require('tron-hd-wallet')


// Options:
const hdPathString = `m/44'/195'/0'/0`
const type = 'HD Key Tree'

log.setDefaultLevel(process.env.METAMASK_DEBUG ? 'debug' : 'warn')

class HdKeyring extends EventEmitter {

  /* PUBLIC METHODS */

  constructor (opts = {}) {
    super()
    this.type = type
    this.deserialize(opts)
  }

  serialize () {
    log.debug('tronhd serialize')
    return Promise.resolve({
      mnemonic: this.mnemonic,
      numberOfAccounts: this.wallets.length,
      hdPath: this.hdPath,
    })
  }

  deserialize (opts = {}) {
    log.debug('tronhd deserialize')
    this.opts = opts || {}
    this.wallets = []
    this.mnemonic = null
    this.root = null
    this.hdPath = opts.hdPath || hdPathString
    this.testNet = opts.testNet || false

    if (opts.mnemonic) {
      this._initFromMnemonic(opts.mnemonic)
    }

    if (opts.numberOfAccounts) {
      return this.addAccounts(opts.numberOfAccounts)
    }

    return Promise.resolve([])
  }

  addAccounts (numberOfAccounts = 1) {
    log.debug('tronhd addaccounts')
    if (!this.root) {
      this._initFromMnemonic(bip39.generateMnemonic())
    }

    const oldLen = this.wallets.length
    const newWallets = []
    for (let i = oldLen; i < numberOfAccounts + oldLen; i++) {
      const child = this.root.deriveChild(i)
      // TODO:(need remove HD info and keep only private/public key?)
      // const wallet = child.getWallet()
      const wallet = child
      newWallets.push(wallet)
      this.wallets.push(wallet)
    }
    const hexWallets = newWallets.map((w) => {
      return w.getAddress
    })
    return Promise.resolve(hexWallets)
  }

  getAccounts () {
    log.debug('tronhd getaccounts')
    return Promise.resolve(this.wallets.map((w) => {
      return w.getAddress()
    }))
  }

  // tx is an instance of the ethereumjs-transaction class.
  signTransaction (address, tx) {
    log.debug('tronhd signTX')
    /*
    const wallet = this._getWalletForAccount(address)
    var privKey = wallet.getPrivateKey()
    tx.sign(privKey)
    return Promise.resolve(tx)
    */
  }

  // For eth_sign, we need to sign transactions:
  // hd
  signMessage (withAccount, data) {
    log.debug('tronhd signMSG')
    /*
    const wallet = this._getWalletForAccount(withAccount)
    const message = ethUtil.stripHexPrefix(data)
    var privKey = wallet.getPrivateKey()
    var msgSig = ethUtil.ecsign(new Buffer(message, 'hex'), privKey)
    var rawMsgSig = ethUtil.bufferToHex(sigUtil.concatSig(msgSig.v, msgSig.r, msgSig.s))
    return Promise.resolve(rawMsgSig)
    */
  }

  exportAccount (address) {
    log.debug('tronhd exporthd')
    /*
    const wallet = this._getWalletForAccount(address)
    return Promise.resolve(wallet.getPrivateKey().toString('hex'))
    */
  }

  /* PRIVATE METHODS */

  _initFromMnemonic (mnemonic) {
    log.debug('tronhd _initFromMnemonic')
    this.mnemonic = mnemonic
    this.hdWallet = TronWallet.fromMnemonic(mnemonic, this.testNet)
    this.root = this.hdWallet.derivePath(this.hdPath)
  }
}

HdKeyring.type = type
module.exports = HdKeyring
