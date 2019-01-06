import { createSelector } from 'reselect'
import txHelper from '../../lib/tx-helper'
import { getBase58Address, getTxParamsToAddress, getTxParamsAmount, getTxParamsAssetName } from '../helpers/transactions.util'

const unapprovedTxsSelector = state => state.metamask.unapprovedTxs
const unapprovedMsgsSelector = state => state.metamask.unapprovedMsgs
const unapprovedPersonalMsgsSelector = state => state.metamask.unapprovedPersonalMsgs
const unapprovedTypedMessagesSelector = state => state.metamask.unapprovedTypedMessages
const networkSelector = state => state.metamask.network
const tokensSelector = state => state.metamask.tokens

export const unconfirmedTransactionsListSelector = createSelector(
  unapprovedTxsSelector,
  unapprovedMsgsSelector,
  unapprovedPersonalMsgsSelector,
  unapprovedTypedMessagesSelector,
  networkSelector,
  (
    unapprovedTxs = {},
    unapprovedMsgs = {},
    unapprovedPersonalMsgs = {},
    unapprovedTypedMessages = {},
    network
  ) => txHelper(
    unapprovedTxs,
    unapprovedMsgs,
    unapprovedPersonalMsgs,
    unapprovedTypedMessages,
    network
  ) || []
)

export const unconfirmedTransactionsHashSelector = createSelector(
  unapprovedTxsSelector,
  unapprovedMsgsSelector,
  unapprovedPersonalMsgsSelector,
  unapprovedTypedMessagesSelector,
  networkSelector,
  (
    unapprovedTxs = {},
    unapprovedMsgs = {},
    unapprovedPersonalMsgs = {},
    unapprovedTypedMessages = {},
    network
  ) => {
    const filteredUnapprovedTxs = Object.keys(unapprovedTxs).reduce((acc, address) => {
      const { metamaskNetworkId } = unapprovedTxs[address]
      const transactions = { ...acc }

      if (metamaskNetworkId === network) {
        transactions[address] = unapprovedTxs[address]
      }

      return transactions
    }, {})

    return {
      ...filteredUnapprovedTxs,
      ...unapprovedMsgs,
      ...unapprovedPersonalMsgs,
      ...unapprovedTypedMessages,
    }
  }
)

const unapprovedMsgCountSelector = state => state.metamask.unapprovedMsgCount
const unapprovedPersonalMsgCountSelector = state => state.metamask.unapprovedPersonalMsgCount
const unapprovedTypedMessagesCountSelector = state => state.metamask.unapprovedTypedMessagesCount

export const unconfirmedTransactionsCountSelector = createSelector(
  unapprovedTxsSelector,
  unapprovedMsgCountSelector,
  unapprovedPersonalMsgCountSelector,
  unapprovedTypedMessagesCountSelector,
  networkSelector,
  (
    unapprovedTxs = {},
    unapprovedMsgCount = 0,
    unapprovedPersonalMsgCount = 0,
    unapprovedTypedMessagesCount = 0,
    network
  ) => {
    const filteredUnapprovedTxIds = Object.keys(unapprovedTxs).filter(txId => {
      const { metamaskNetworkId } = unapprovedTxs[txId]
      return metamaskNetworkId === network
    })

    return filteredUnapprovedTxIds.length + unapprovedTypedMessagesCount + unapprovedMsgCount +
      unapprovedPersonalMsgCount
  }
)


export const currentCurrencySelector = state => state.metamask.currentCurrency
export const conversionRateSelector = state => state.metamask.conversionRate

const txDataSelector = state => state.confirmTransaction.txData
const contractExchangeRatesSelector = state => state.metamask.contractExchangeRates

const txParamsSelector = createSelector(
  txDataSelector,
  txData => txData && txData.txParams || {}
)

export const tokenAddressSelector = createSelector(
  txParamsSelector,
  txParams => txParams && txParams.to
)

export const tokenAmountAndToAddressSelector = createSelector(
  txDataSelector,
  tokensSelector,
  (txData, tokens) => {
    const { txParams } = txData
    const tokenAmount = getTxParamsAmount(txParams)
    const tokenIDHex = getTxParamsAssetName(txParams)
    const tokenID = tokenIDHex ? new Buffer(tokenIDHex, 'hex').toString() : undefined
    const tokenSymbol = tokenID ? tokens.find(t => t.id === tokenID).symbol : undefined
    const toAddress = getBase58Address(getTxParamsToAddress(txParams))
    return {
      tokenAddress: tokenID,
      tokenID,
      tokenAmount,
      tokenSymbol,
      toAddress,
    }
  }
)

// TODO(MegTron): deprecated
export const approveTokenAmountAndToAddressSelector = tokenAmountAndToAddressSelector

// TODO(MegTron): deprecated
export const sendTokenTokenAmountAndToAddressSelector = tokenAmountAndToAddressSelector

export const contractExchangeRateSelector = createSelector(
  contractExchangeRatesSelector,
  tokenAddressSelector,
  (contractExchangeRates, tokenAddress) => contractExchangeRates[tokenAddress]
)
