import {
  conversionRateSelector,
  currentCurrencySelector,
  unconfirmedTransactionsHashSelector,
} from '../selectors/confirm-transaction'

import {
  getValueFromSun,
  increaseLastGasPrice,
  hexGreaterThan,
} from '../helpers/confirm-transaction/util'

import {
  getTokenData,
  getMethodData,
  getTxParamsAmount,
  isSmartContractAddress,
} from '../helpers/transactions.util'

import { getSymbolAndDecimals } from '../token-util'
import { conversionUtil } from '../conversion-util'

// Actions
const createActionType = action => `metamask/confirm-transaction/${action}`

const UPDATE_TX_DATA = createActionType('UPDATE_TX_DATA')
const CLEAR_TX_DATA = createActionType('CLEAR_TX_DATA')
const UPDATE_TOKEN_DATA = createActionType('UPDATE_TOKEN_DATA')
const CLEAR_TOKEN_DATA = createActionType('CLEAR_TOKEN_DATA')
const UPDATE_METHOD_DATA = createActionType('UPDATE_METHOD_DATA')
const CLEAR_METHOD_DATA = createActionType('CLEAR_METHOD_DATA')
const CLEAR_CONFIRM_TRANSACTION = createActionType('CLEAR_CONFIRM_TRANSACTION')
const UPDATE_TRANSACTION_AMOUNTS = createActionType('UPDATE_TRANSACTION_AMOUNTS')
const UPDATE_TRANSACTION_FEES = createActionType('UPDATE_TRANSACTION_FEES')
const UPDATE_TRANSACTION_TOTALS = createActionType('UPDATE_TRANSACTION_TOTALS')
const UPDATE_TOKEN_PROPS = createActionType('UPDATE_TOKEN_PROPS')
const UPDATE_NONCE = createActionType('UPDATE_NONCE')
const UPDATE_TO_SMART_CONTRACT = createActionType('UPDATE_TO_SMART_CONTRACT')
const FETCH_DATA_START = createActionType('FETCH_DATA_START')
const FETCH_DATA_END = createActionType('FETCH_DATA_END')

// Initial state
const initState = {
  txData: {},
  tokenData: {},
  methodData: {},
  tokenProps: {
    tokenDecimals: '',
    tokenSymbol: '',
  },
  fiatTransactionAmount: '',
  fiatTransactionFee: '',
  fiatTransactionTotal: '',
  ethTransactionAmount: '',
  ethTransactionFee: '',
  ethTransactionTotal: '',
  hexTransactionAmount: '',
  hexTransactionFee: '',
  hexTransactionTotal: '',
  nonce: '',
  toSmartContract: false,
  fetchingData: false,
}

// Reducer
export default function reducer ({ confirmTransaction: confirmState = initState }, action = {}) {
  switch (action.type) {
    case UPDATE_TX_DATA:
      return {
        ...confirmState,
        txData: {
          ...action.payload,
        },
      }
    case CLEAR_TX_DATA:
      return {
        ...confirmState,
        txData: {},
      }
    case UPDATE_TOKEN_DATA:
      return {
        ...confirmState,
        tokenData: {
          ...action.payload,
        },
      }
    case CLEAR_TOKEN_DATA:
      return {
        ...confirmState,
        tokenData: {},
      }
    case UPDATE_METHOD_DATA:
      return {
        ...confirmState,
        methodData: {
          ...action.payload,
        },
      }
    case CLEAR_METHOD_DATA:
      return {
        ...confirmState,
        methodData: {},
      }
    case UPDATE_TRANSACTION_AMOUNTS:
      const { fiatTransactionAmount, ethTransactionAmount, hexTransactionAmount } = action.payload
      return {
        ...confirmState,
        fiatTransactionAmount: fiatTransactionAmount || confirmState.fiatTransactionAmount,
        ethTransactionAmount: ethTransactionAmount || confirmState.ethTransactionAmount,
        hexTransactionAmount: hexTransactionAmount || confirmState.hexTransactionAmount,
      }
    case UPDATE_TRANSACTION_FEES:
      const { fiatTransactionFee, ethTransactionFee, hexTransactionFee } = action.payload
      return {
        ...confirmState,
        fiatTransactionFee: fiatTransactionFee || confirmState.fiatTransactionFee,
        ethTransactionFee: ethTransactionFee || confirmState.ethTransactionFee,
        hexTransactionFee: hexTransactionFee || confirmState.hexTransactionFee,
      }
    case UPDATE_TRANSACTION_TOTALS:
      const { fiatTransactionTotal, ethTransactionTotal, hexTransactionTotal } = action.payload
      return {
        ...confirmState,
        fiatTransactionTotal: fiatTransactionTotal || confirmState.fiatTransactionTotal,
        ethTransactionTotal: ethTransactionTotal || confirmState.ethTransactionTotal,
        hexTransactionTotal: hexTransactionTotal || confirmState.hexTransactionTotal,
      }
    case UPDATE_TOKEN_PROPS:
      const { tokenSymbol = '', tokenDecimals = '' } = action.payload
      return {
        ...confirmState,
        tokenProps: {
          ...confirmState.tokenProps,
          tokenSymbol,
          tokenDecimals,
        },
      }
    case UPDATE_NONCE:
      return {
        ...confirmState,
        nonce: action.payload,
      }
    case UPDATE_TO_SMART_CONTRACT:
      return {
        ...confirmState,
        toSmartContract: action.payload,
      }
    case FETCH_DATA_START:
      return {
        ...confirmState,
        fetchingData: true,
      }
    case FETCH_DATA_END:
      return {
        ...confirmState,
        fetchingData: false,
      }
    case CLEAR_CONFIRM_TRANSACTION:
      return initState
    default:
      return confirmState
  }
}

// Action Creators
export function updateTxData (txData) {
  return {
    type: UPDATE_TX_DATA,
    payload: txData,
  }
}

export function clearTxData () {
  return {
    type: CLEAR_TX_DATA,
  }
}

export function updateTokenData (tokenData) {
  return {
    type: UPDATE_TOKEN_DATA,
    payload: tokenData,
  }
}

export function clearTokenData () {
  return {
    type: CLEAR_TOKEN_DATA,
  }
}

export function updateMethodData (methodData) {
  return {
    type: UPDATE_METHOD_DATA,
    payload: methodData,
  }
}

export function clearMethodData () {
  return {
    type: CLEAR_METHOD_DATA,
  }
}

export function updateTransactionAmounts (amounts) {
  return {
    type: UPDATE_TRANSACTION_AMOUNTS,
    payload: amounts,
  }
}

export function updateTransactionFees (fees) {
  return {
    type: UPDATE_TRANSACTION_FEES,
    payload: fees,
  }
}

export function updateTransactionTotals (totals) {
  return {
    type: UPDATE_TRANSACTION_TOTALS,
    payload: totals,
  }
}

export function updateTokenProps (tokenProps) {
  return {
    type: UPDATE_TOKEN_PROPS,
    payload: tokenProps,
  }
}

export function updateNonce (nonce) {
  return {
    type: UPDATE_NONCE,
    payload: nonce,
  }
}

export function updateToSmartContract (toSmartContract) {
  return {
    type: UPDATE_TO_SMART_CONTRACT,
    payload: toSmartContract,
  }
}

export function setFetchingData (isFetching) {
  return {
    type: isFetching ? FETCH_DATA_START : FETCH_DATA_END,
  }
}

export function updateGasAndCalculate ({ gasLimit, gasPrice }) {
  return (dispatch, getState) => {
    const { confirmTransaction: { txData } } = getState()
    const newTxData = {
      ...txData,
      txParams: {
        ...txData.txParams,
        gas: gasLimit,
        gasPrice,
      },
    }

    dispatch(updateTxDataAndCalculate(newTxData))
  }
}

function increaseFromLastGasPrice (txData) {
  const { lastGasPrice, txParams: { gasPrice: previousGasPrice } = {} } = txData

  // Set the minimum to a 10% increase from the lastGasPrice.
  const minimumGasPrice = increaseLastGasPrice(lastGasPrice)
  const gasPriceBelowMinimum = hexGreaterThan(minimumGasPrice, previousGasPrice)
  const gasPrice = (!previousGasPrice || gasPriceBelowMinimum) ? minimumGasPrice : previousGasPrice

  return {
    ...txData,
    txParams: {
      ...txData.txParams,
      gasPrice,
    },
  }
}

export function updateTxDataAndCalculate (txData) {
  return (dispatch, getState) => {
    const state = getState()
    const currentCurrency = currentCurrencySelector(state)
    const conversionRate = conversionRateSelector(state)

    dispatch(updateTxData(txData))

    const amount = getTxParamsAmount(txData.txParams)
    const amountDec = amount.toString()

    const fiatTransactionAmount = getValueFromSun({
      value: amountDec, toCurrency: currentCurrency, conversionRate, numberOfDecimals: 2,
    })
    const ethTransactionAmount = getValueFromSun({
      value: amountDec, toCurrency: 'TRX', conversionRate, numberOfDecimals: 6,
    })
    const hexTransactionAmount = '0x' + amount.toString(16)

    dispatch(updateTransactionAmounts({
      fiatTransactionAmount,
      ethTransactionAmount,
      hexTransactionAmount,
    }))
    dispatch(updateTransactionTotals({
      fiatTransactionTotal: fiatTransactionAmount,
      ethTransactionTotal: ethTransactionAmount,
      hexTransactionTotal: hexTransactionAmount,
    }))
  }
}

export function setTransactionToConfirm (transactionId) {
  return async (dispatch, getState) => {
    const state = getState()
    const unconfirmedTransactionsHash = unconfirmedTransactionsHashSelector(state)
    const transaction = unconfirmedTransactionsHash[transactionId]

    if (!transaction) {
      console.error(`Transaction with id ${transactionId} not found`)
      return
    }

    if (transaction.txParams) {
      const { lastGasPrice } = transaction
      const txData = lastGasPrice ? increaseFromLastGasPrice(transaction) : transaction
      dispatch(updateTxDataAndCalculate(txData))

      const { txParams } = transaction
      const { to } = txParams

      if (txParams.data) {
        const { tokens: existingTokens } = state
        const { data, to: tokenAddress } = txParams

        try {
          dispatch(setFetchingData(true))
          const methodData = await getMethodData(data)
          dispatch(updateMethodData(methodData))
          const toSmartContract = await isSmartContractAddress(to)
          dispatch(updateToSmartContract(toSmartContract))
          dispatch(setFetchingData(false))
        } catch (error) {
          dispatch(updateMethodData({}))
          dispatch(setFetchingData(false))
        }

        const tokenData = getTokenData(data)
        dispatch(updateTokenData(tokenData))

        try {
          const tokenSymbolData = await getSymbolAndDecimals(tokenAddress, existingTokens) || {}
          const { symbol: tokenSymbol = '', decimals: tokenDecimals = '' } = tokenSymbolData
          dispatch(updateTokenProps({ tokenSymbol, tokenDecimals }))
        } catch (error) {
          dispatch(updateTokenProps({ tokenSymbol: '', tokenDecimals: '' }))
        }
      }

      if (txParams.nonce) {
        const nonce = conversionUtil(txParams.nonce, {
          fromNumericBase: 'hex',
          toNumericBase: 'dec',
        })

        dispatch(updateNonce(nonce))
      }
    } else {
      dispatch(updateTxData(transaction))
    }
  }
}

export function clearConfirmTransaction () {
  return {
    type: CLEAR_CONFIRM_TRANSACTION,
  }
}
