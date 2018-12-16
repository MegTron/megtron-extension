import { connect } from 'react-redux'
import TokenBalance from './token-balance.component'
import { getSelectedToken, getSelectedAccount } from '../../selectors'

const mapStateToProps = state => {
  return {
    selectedToken: getSelectedToken(state),
    selectedAccount: getSelectedAccount(state),
  }
}

const getTokenBalance = ( assets, symbol ) => {
  if (!assets) return 0
  const asset = assets.find(token => token.key === symbol)
  if (!asset) return 0
  return asset.value || 0
}

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { selectedToken: { symbol }, selectedAccount: { asset } } = stateProps
  const string = getTokenBalance(asset, symbol).toString()
  return {
    ...stateProps,
    ...dispatchProps,
    ...ownProps,
    string,
    symbol,
  }
}

export default connect(mapStateToProps, null, mergeProps)(TokenBalance)
