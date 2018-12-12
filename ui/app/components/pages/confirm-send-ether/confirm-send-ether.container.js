import { connect } from 'react-redux'
import { compose } from 'recompose'
import { withRouter } from 'react-router-dom'
import { updateSend } from '../../../actions'
import { clearConfirmTransaction } from '../../../ducks/confirm-transaction.duck'
import ConfirmSendEther from './confirm-send-ether.component'
import { getBase58Address, getTxParamsToAddress, getTxParamsAmount } from '../../../helpers/transactions.util'

const mapStateToProps = state => {
  const { confirmTransaction: { txData: { txParams } = {} } } = state

  return {
    txParams,
  }
}

const mapDispatchToProps = dispatch => {
  return {
    editTransaction: txData => {
      const { id, txParams } = txData
      const {
        gas: gasLimit,
        gasPrice,
      } = txParams

      dispatch(updateSend({
        gasLimit,
        gasPrice,
        gasTotal: null,
        to: getBase58Address(getTxParamsToAddress(txParams)),
        amount: getTxParamsAmount(txParams).toString(16),
        errors: { to: null, amount: null },
        editingTransactionId: id && id.toString(),
      }))

      dispatch(clearConfirmTransaction())
    },
  }
}

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps)
)(ConfirmSendEther)
