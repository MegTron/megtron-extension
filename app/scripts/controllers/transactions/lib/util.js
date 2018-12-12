const {
  addHexPrefix,
} = require('ethereumjs-util')
const TronWeb = require('tronweb')

/**
@module
*/
module.exports = {
  normalizeTxParams,
  validateTxParams,
  validateFrom,
  validateRecipient,
  getFinalStates,
  getTxParamsFromAddress,
  getTxParamsToAddress,
  getBase58Address,
  getHexAddress,
}


// functions that handle normalizing of that key in txParams
const normalizers = {
  from: from => addHexPrefix(from).toLowerCase(),
  to: to => addHexPrefix(to).toLowerCase(),
  nonce: nonce => addHexPrefix(nonce),
  value: value => addHexPrefix(value),
  data: data => addHexPrefix(data),
  gas: gas => addHexPrefix(gas),
  gasPrice: gasPrice => addHexPrefix(gasPrice),
}

 /**
  normalizes txParams
  @param txParams {object}
  @returns {object} normalized txParams
 */
function normalizeTxParams (txParams) {
  console.error('MegTron.deprecated.normalizeTxParams', { txParams })
  console.trace()
  // apply only keys in the normalizers
  const normalizedTxParams = {}
  for (const key in normalizers) {
    if (txParams[key]) normalizedTxParams[key] = normalizers[key](txParams[key])
  }
  return normalizedTxParams
}

function getBase58Address (address) {
  if (!address) {
    return address
  }
  return TronWeb.address.fromHex(address)
}

function getHexAddress (address) {
  if (!address) {
    return address
  }
  if (address.length === 44 && address.indexOf('0x') === 0) {
    address = address.slice(2)
  }
  if (address.length === 42 && address.indexOf('41') === 0) {
    return address
  }
  return TronWeb.address.toHex(address)
}

/**
 * Get the from address
 * @param {object} txParams
 * @returns {string} from address
 */
function getTxParamsFromAddress (txParams) {
  if (txParams.owner_address) {
    return txParams.owner_address
  }
  if (txParams.raw_data) {
    return txParams.raw_data.contract[0].parameter.value.owner_address
  }
}

/**
 * Get the to address
 * @param {object} txParams
 * @returns {string} from address
 */
function getTxParamsToAddress (txParams) {
  console.log('xxxxxxxxx getTxParamsToAddress', {txParams})
  if (txParams.to_address) {
    return txParams.to_address
  }
  if (txParams.raw_data) {
    return txParams.raw_data.contract[0].parameter.value.to_address
  }
}

 /**
  validates txParams
  @param txParams {object}
 */
function validateTxParams (txParams) {
  validateFrom(txParams)
  validateRecipient(txParams)
}

 /**
  validates the from field in txParams
  @param txParams {object}
 */
function validateFrom (txParams) {
  const fromAddress = getTxParamsFromAddress(txParams)
  if (!(typeof fromAddress === 'string')) throw new Error(`Invalid from address ${fromAddress} not a string`)
  if (!isValidHexAddress(fromAddress)) throw new Error('Invalid owner_address')
}

 /**
  validates the to field in txParams
  @param txParams {object}
 */
function validateRecipient (txParams) {
  const toAddress = getTxParamsToAddress(txParams)
  if (toAddress !== undefined && !isValidHexAddress(toAddress)) {
    throw new Error('Invalid recipient address')
  }
  return txParams
}

  /**
    @returns an {array} of states that can be considered final
  */
function getFinalStates () {
  return [
    'rejected', // the user has responded no!
    'confirmed', // the tx has been included in a block.
    'failed', // the tx failed for some reason, included on tx data.
    'dropped', // the tx nonce was already used
  ]
}

function isValidHexAddress (address) {
  if (address.length !== 42) {
    throw new Error(`Invalid address ${address}: length should be 42`)
  }
  if (address.slice(0, 2) !== '41')  {
    throw new Error(`Invalid address ${address}: should start with 0x41`)
  }
  return true
}

