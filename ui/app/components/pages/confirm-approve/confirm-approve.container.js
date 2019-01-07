import { connect } from 'react-redux'
import ConfirmApprove from './confirm-approve.component'
import { tokenAmountAndToAddressSelector } from '../../../selectors/confirm-transaction'

const mapStateToProps = state => {
  const { tokenAmount, tokenSymbol} = tokenAmountAndToAddressSelector(state)

  if (tokenSymbol) {
    return {
      tokenAmount,
      tokenSymbol,
    }
  }
  return {
    tokenAmount: tokenAmount / 1000000.0,
    tokenSymbol: 'TRX',
  }
}

export default connect(mapStateToProps)(ConfirmApprove)
