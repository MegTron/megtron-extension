import ethUtil from 'ethereumjs-util'
import MethodRegistry from 'eth-method-registry'
import abi from 'human-standard-token-abi'
import abiDecoder from 'abi-decoder'
import TronWeb from 'tronweb'

import {
  SEND_ETHER_ACTION_KEY,
  DEPLOY_CONTRACT_ACTION_KEY,
  APPROVE_ACTION_KEY,
  SEND_TOKEN_ACTION_KEY,
  SIGNATURE_REQUEST_KEY,
  CANCEL_ATTEMPT_ACTION_KEY,
  CONTRACT_TYPE_SEND_TRX,
  CONTRACT_TYPE_SEND_TOKEN,
  CONTRACT_TYPE_CREATE_SMART_CONTRACT,
  CONTRACT_TYPE_TRIGGER_SMART_CONTRACT,
} from '../constants/transactions'

import { addCurrencies } from '../conversion-util'

abiDecoder.addABI(abi)

export function getTokenData (data = '') {
  return abiDecoder.decodeMethod(data)
}

const registry = new MethodRegistry({ provider: global.ethereumProvider })

export async function getMethodData (data = '') {
  const prefixedData = ethUtil.addHexPrefix(data)
  const fourBytePrefix = prefixedData.slice(0, 10)
  const sig = await registry.lookup(fourBytePrefix)
  const parsedResult = registry.parse(sig)

  return {
    name: parsedResult.name,
    params: parsedResult.args,
  }
}

export function getBase58Address (address) {
  if (!address) {
    return address
  }
  return TronWeb.address.fromHex(address)
}

export function getHexAddress (address) {
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

export function getTxParamsValue (txParams) {
  if (!txParams || !txParams.raw_data || !txParams.raw_data.contract || !txParams.raw_data.contract[0] || !txParams.raw_data.contract[0].parameter) {
    return null
  }
  return txParams.raw_data.contract[0].parameter.value
}

export function getTxParamsFromAddress (txParams) {
  const value = getTxParamsValue(txParams)
  if (!value) {
    return null
  }
  return value.owner_address
}

export function getTxParamsToAddress (txParams) {
  const value = getTxParamsValue(txParams)
  if (!value) {
    return null
  }
  return value.to_address || value.contract_address
}

export function getTxParamsContractType (txParams) {
  return txParams.raw_data.contract[0].type
}

export function getTxParamsAmount (txParams) {
  const value = getTxParamsValue(txParams)
  if (!value) {
    return 0
  }
  return value.amount || value.call_value || 0
}

export function getTxParamsAssetName (txParams) {
  const value = getTxParamsValue(txParams)
  if (!value) {
    return null
  }
  return value.asset_name
}

/**
 * Returns the action of a transaction as a key to be passed into the translator.
 * @param {Object} transaction - txData object
 * @param {Object} methodData - Data returned from eth-method-registry
 * @returns {string|undefined}
 */
export async function getTransactionActionKey (transaction, methodData) {
  const { txParams, msgParams, type } = transaction

  if (type === 'cancel') {
    return CANCEL_ATTEMPT_ACTION_KEY
  }

  if (msgParams) {
    return SIGNATURE_REQUEST_KEY
  }

  const contractType = getTxParamsContractType(txParams)
  switch (contractType) {
    case CONTRACT_TYPE_CREATE_SMART_CONTRACT: {
      return DEPLOY_CONTRACT_ACTION_KEY
    }
    case CONTRACT_TYPE_SEND_TRX: {
      return SEND_ETHER_ACTION_KEY
    }
    case CONTRACT_TYPE_SEND_TOKEN: {
      return SEND_TOKEN_ACTION_KEY
    }
    case CONTRACT_TYPE_TRIGGER_SMART_CONTRACT: {
      return APPROVE_ACTION_KEY
    }
    default: {
      return SEND_ETHER_ACTION_KEY
    }
  }
}

export function getLatestSubmittedTxWithNonce (transactions = [], nonce = '0x0') {
  if (!transactions.length) {
    return {}
  }

  return transactions.reduce((acc, current) => {
    const { submittedTime, txParams: { nonce: currentNonce } = {} } = current

    if (currentNonce === nonce) {
      return acc.submittedTime
        ? submittedTime > acc.submittedTime ? current : acc
        : current
    } else {
      return acc
    }
  }, {})
}

export async function isSmartContractAddress (address) {
  const code = await global.eth.getCode(address)
  return code && code !== '0x'
}

export function sumHexes (...args) {
  const total = args.reduce((acc, base) => {
    return addCurrencies(acc, base, {
      toNumericBase: 'hex',
    })
  })

  return ethUtil.addHexPrefix(total)
}

/**
 * Returns a status key for a transaction. Requires parsing the txMeta.txReceipt on top of
 * txMeta.status because txMeta.status does not reflect on-chain errors.
 * @param {Object} transaction - The txMeta object of a transaction.
 * @param {Object} transaction.txReceipt - The transaction receipt.
 * @returns {string}
 */
export function getStatusKey (transaction) {
  const { txReceipt: { status } = {} } = transaction

  // There was an on-chain failure
  if (status === '0x0') {
    return 'failed'
  }

  return transaction.status
}
