module.exports = setupDappAutoReload

function setupDappAutoReload (tronWeb, observable) {
  // export tronWeb as a global, checking for usage
  let reloadInProgress = false
  let lastTimeUsed
  let lastSeenNetwork

  global.tronWeb = new Proxy(tronWeb, {
    get: (_tronWeb, key) => {
      // get the time of use
      lastTimeUsed = Date.now()
      // return value normally
      return _tronWeb[key]
    },
    set: (_tronWeb, key, value) => {
      // set value normally
      _tronWeb[key] = value
    },
  })

  observable.subscribe(function (state) {
    // if reload in progress, no need to check reload logic
    if (reloadInProgress) return

    const currentNetwork = state.networkVersion

    // set the initial network
    if (!lastSeenNetwork) {
      lastSeenNetwork = currentNetwork
      return
    }

    // skip reload logic if tronWeb not used
    if (!lastTimeUsed) return

    // if network did not change, exit
    if (currentNetwork === lastSeenNetwork) return

    // initiate page reload
    reloadInProgress = true
    const timeSinceUse = Date.now() - lastTimeUsed
    // if tronWeb was recently used then delay the reloading of the page
    if (timeSinceUse > 500) {
      triggerReset()
    } else {
      setTimeout(triggerReset, 500)
    }
  })
}

// reload the page
function triggerReset () {
  console.log('MegTron.triggered reload')
  global.location.reload()
}
