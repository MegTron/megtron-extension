import { connect } from 'react-redux'
import {
  addToAddressBook,
  clearSend,
  signTokenTx,
  signTx,
  updateTransaction,
} from '../../../actions'
import SendFooter from './send-footer.component'
import {
  getGasLimit,
  getGasPrice,
  getGasTotal,
  getSelectedToken,
  getSendAmount,
  getSendEditingTransactionId,
  getSendFromObject,
  getSendTo,
  getSendToAccounts,
  getSendHexData,
  getTokenBalance,
  getUnapprovedTxs,
} from '../send.selectors'
import {
  isSendFormInError,
} from './send-footer.selectors'
import {
  addressIsNew,
  constructUpdatedTx,
} from './send-footer.utils'

import { getHexAddress } from '../../../helpers/transactions.util'

export default connect(mapStateToProps, mapDispatchToProps)(SendFooter)

function mapStateToProps (state) {
  return {
    amount: getSendAmount(state),
    data: getSendHexData(state),
    editingTransactionId: getSendEditingTransactionId(state),
    from: getSendFromObject(state),
    gasLimit: getGasLimit(state),
    gasPrice: getGasPrice(state),
    gasTotal: getGasTotal(state),
    inError: isSendFormInError(state),
    selectedToken: getSelectedToken(state),
    to: getSendTo(state),
    toAccounts: getSendToAccounts(state),
    tokenBalance: getTokenBalance(state),
    unapprovedTxs: getUnapprovedTxs(state),
  }
}

function mapDispatchToProps (dispatch) {
  return {
    clearSend: () => dispatch(clearSend()),
    sign: async ({ selectedToken, to, amount, from }) => {
      let txParams
      const ownerAddress = getHexAddress(from)
      const toAddress = getHexAddress(to)
      if (selectedToken) {
        const assetName = new Buffer(selectedToken.symbol).toString('hex')
        txParams = await global.tronQuery.transferAsset({
          amount: parseInt(amount, 16),
          owner_address: ownerAddress,
          to_address: toAddress,
          asset_name: assetName,
        })
      } else {
        txParams = await global.tronQuery.createTransaction({
          amount: parseInt(amount, 16),
          owner_address: ownerAddress,
          to_address: toAddress,
        })
      }
      dispatch(signTx(txParams))
    },
    update: ({
      amount,
      data,
      editingTransactionId,
      from,
      gas,
      gasPrice,
      selectedToken,
      to,
      unapprovedTxs,
    }) => {
      const editingTx = constructUpdatedTx({
        amount,
        data,
        editingTransactionId,
        from,
        gas,
        gasPrice,
        selectedToken,
        to,
        unapprovedTxs,
      })

      return dispatch(updateTransaction(editingTx))
    },
    addToAddressBookIfNew: (newAddress, toAccounts, nickname = '') => {
      if (addressIsNew(toAccounts)) {
        // TODO: nickname, i.e. addToAddressBook(recipient, nickname)
        dispatch(addToAddressBook(newAddress, nickname))
      }
    },
  }
}
