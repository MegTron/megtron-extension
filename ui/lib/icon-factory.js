var iconFactory
const isValidAddress = require('ethereumjs-util').isValidAddress
const { checksumAddress } = require('../app/util')
const contractMap = require('eth-contract-metadata')
const { getHexAddress } = require('../app/helpers/transactions.util')

module.exports = function (jazzicon) {
  if (!iconFactory) {
    iconFactory = new IconFactory(jazzicon)
  }
  return iconFactory
}

function IconFactory (jazzicon) {
  this.jazzicon = jazzicon
  this.cache = {}
}

IconFactory.prototype.iconForAddress = function (address, diameter) {
  const addr = checksumAddress(address)
  if (iconExistsFor(addr)) {
    return imageElFor(addr)
  }

  return this.generateIdenticonSvg(address, diameter)
}

// returns svg dom element
IconFactory.prototype.generateIdenticonSvg = function (address, diameter) {
  var cacheId = `${address}:${diameter}`
  // check cache, lazily generate and populate cache
  var identicon = this.cache[cacheId] || (this.cache[cacheId] = this.generateNewIdenticon(address, diameter))
  // create a clean copy so you can modify it
  var cleanCopy = identicon.cloneNode(true)
  return cleanCopy
}

// creates a new identicon
IconFactory.prototype.generateNewIdenticon = function (address, diameter) {
  var numericRepresentation = jsNumberForAddress(address)
  var identicon = this.jazzicon(diameter, numericRepresentation)
  return identicon
}

// util

function iconExistsFor (address) {
  return contractMap[address] && isValidAddress(address) && contractMap[address].logo
}

function imageElFor (address) {
  const contract = contractMap[address]
  const fileName = contract.logo
  const path = `images/contract/${fileName}`
  const img = document.createElement('img')
  img.src = path
  img.style.width = '100%'
  return img
}

function jsNumberForAddress (address) {
  if (!address) {
    return 0
  }
  let addr = address
  if (addr.length === 34 && addr[0] === 'T') {
    try {
      // Assuming Base58 Address, convert to hex first
      addr = getHexAddress(address)
      // Remove first byte, which is always 0x41 for Tron
      addr = addr.slice(2, 10)
    } catch (e) {
      addr = address
    }
  }
  if (new Buffer(addr, 'hex').toString('hex') !== addr) {
    // If not already a hex value, convert to hex.
    addr = new Buffer(addr).toString('hex')
  }
  var seed = parseInt(addr, 16)
  return seed
}

