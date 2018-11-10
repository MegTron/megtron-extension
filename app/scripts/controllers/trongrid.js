const ObservableStore = require('obs-store')
const extend = require('xtend')
const log = require('loglevel')

// every ten minutes
const POLLING_INTERVAL = 10 * 60 * 1000

class TrongridController {

  constructor (opts = {}) {
    const initState = extend({
      trongridNetworkStatus: {},
    }, opts.initState)
    this.store = new ObservableStore(initState)
  }

  //
  // PUBLIC METHODS
  //

  // Responsible for retrieving the status of Trongrid's nodes. Can return either
  // ok, degraded, or down.
  // Since Trongrid does not have status endpoint, will always return ok for now.
  async checkTrongridNetworkStatus () {
    const parsedResponse = {
      'mainnet': 'ok',
      'shasta': 'ok',
    }
    this.store.updateState({
      trongridNetworkStatus: parsedResponse,
    })
    return parsedResponse
  }

  scheduleTrongridNetworkCheck () {
    if (this.conversionInterval) {
      clearInterval(this.conversionInterval)
    }
    this.conversionInterval = setInterval(() => {
      this.checkTrongridNetworkStatus().catch(log.warn)
    }, POLLING_INTERVAL)
  }
}

module.exports = TrongridController
