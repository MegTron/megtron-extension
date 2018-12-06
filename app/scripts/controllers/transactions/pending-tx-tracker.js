const EventEmitter = require('events')
const log = require('loglevel')
const pify = require('pify')
const TronQuery = require('../../lib/tron-query')

/**

  Event emitter utility class for tracking the transactions as they<br>
  go from a pending state to a confirmed (mined in a block) state<br>
<br>
  As well as continues broadcast while in the pending state
<br>
@param config {object} - non optional configuration object consists of:
    @param {Object} config.provider - A network provider.
    @param {function} config.getPendingTransactions a function for getting an array of transactions,
    @param {function} config.publishTransaction a async function for publishing raw transactions,
@class
*/

class PendingTransactionTracker extends EventEmitter {
  constructor (config) {
    super()
    this.query = pify(new TronQuery(config.provider))
    this.getPendingTransactions = config.getPendingTransactions
    this.publishTransaction = config.publishTransaction
  }

  /**
    checks the network for signed txs
  */
  async updatePendingTxs () {
    console.log('MegTron.pending-tx-tracerk.updatePendingTxs')
    try {
      const pendingTxs = this.getPendingTransactions()
      console.log('MegTron.pending-tx-tracerk.updatePendingTxs', { pendingTxs })
      await Promise.all(pendingTxs.map((txMeta) => this._checkPendingTx(txMeta)))
    } catch (err) {
      log.error('PendingTransactionTracker - Error updating pending transactions')
      log.error(err)
    }
  }

  /**
    Will resubmit any transactions who have not been confirmed in a block
    @param blockNumber {number} - a block number
    @emits tx:warning
  */
  resubmitPendingTxs (blockNumber) {
    console.log('MegTron.pending-tx-tracker.resubmitPendingTxs', { blockNumber })
    const pending = this.getPendingTransactions()
    // only try resubmitting if their are transactions to resubmit
    if (!pending.length) return
    pending.forEach((txMeta) => this._resubmitTx(txMeta, blockNumber).catch((err) => {
      /*
      Dont marked as failed if the error is a "known" transaction warning
      "there is already a transaction with the same sender-nonce
      but higher/same gas price"

      Also don't mark as failed if it has ever been broadcast successfully.
      A successful broadcast means it may still be mined.
      */
      const errorMessage = err.message.toLowerCase()
      const isKnownTx = (
        // geth
        errorMessage.includes('replacement transaction underpriced') ||
        errorMessage.includes('known transaction') ||
        // parity
        errorMessage.includes('gas price too low to replace') ||
        errorMessage.includes('transaction with the same hash was already imported') ||
        // other
        errorMessage.includes('gateway timeout') ||
        errorMessage.includes('nonce too low')
      )
      // ignore resubmit warnings, return early
      if (isKnownTx) return
      // encountered real error - transition to error state
      txMeta.warning = {
        error: errorMessage,
        message: 'There was an error when resubmitting this transaction.',
      }
      this.emit('tx:warning', txMeta, err)
    }))
  }

  /**
    resubmits the individual txMeta used in resubmitPendingTxs
    @param txMeta {Object} - txMeta object
    @param latestBlockNumber {number} - the latest block number
    @emits tx:retry
    @returns txHash {string}
  */
  async _resubmitTx (txMeta, latestBlockNumber) {
    console.log('MegTron.pending-tx-tracker.resubmitTx', { txMeta, latestBlockNumber })
    if (!txMeta.firstRetryBlockNumber) {
      this.emit('tx:block-update', txMeta, latestBlockNumber)
    }

    const firstRetryBlockNumber = txMeta.firstRetryBlockNumber || latestBlockNumber
    const txBlockDistance = latestBlockNumber - firstRetryBlockNumber
    const retryCount = txMeta.retryCount || 0

    // Exponential backoff to limit retries at publishing
    if (txBlockDistance <= Math.pow(2, retryCount) - 1) return

    // Only auto-submit already-signed txs:
    if (!('rawTx' in txMeta)) return

    const rawTx = txMeta.rawTx
    const txHash = await this.publishTransaction(rawTx)

    // Increment successful tries:
    this.emit('tx:retry', txMeta)
    return txHash
  }

  /**
    Ask the network for the transaction to see if it has been include in a block
    @param txMeta {Object} - the txMeta object
    @emits tx:failed
    @emits tx:confirmed
    @emits tx:warning
  */
  async _checkPendingTx (txMeta) {
    console.log('MegTron.pendingtxtracker.checkPendingTx', { txMeta })
    const txHash = txMeta.txParams.txID
    const txId = txMeta.id

    // extra check in case there was an uncaught error during the
    // signature and submission process
    if (!txHash) {
      const noTxHashErr = new Error('We had an error while submitting this transaction, please try again.')
      noTxHashErr.name = 'NoTxHashError'
      this.emit('tx:failed', txId, noTxHashErr)
      return
    }

    // get latest transaction status
    try {
      const txInfo = await this.query.getTransactionInfoByID({ value: txHash })
      if (!txInfo) return
      if (txInfo.blockNumber) {
        this.emit('tx:confirmed', txId)
      }
    } catch (err) {
      console.log('MegTron.pendingtxtracker.checkPendingTx', { err })
      txMeta.warning = {
        error: err.message,
        message: 'There was a problem loading this transaction.',
      }
      this.emit('tx:warning', txMeta, err)
    }
  }
}

module.exports = PendingTransactionTracker
