const Component = require('react').Component
const PropTypes = require('prop-types')
const h = require('react-hyperscript')
const inherits = require('util').inherits
const TokenCell = require('./token-cell.js')
const connect = require('react-redux').connect
const selectors = require('../selectors')

function mapStateToProps (state) {
  return {
    network: state.metamask.network,
    tokens: state.metamask.tokens,
    userAddress: selectors.getSelectedAddress(state),
    userAsset: selectors.getSelectedAccount(state).asset || [],
    assetImages: state.metamask.assetImages,
  }
}

TokenList.contextTypes = {
  t: PropTypes.func,
}

module.exports = connect(mapStateToProps)(TokenList)


inherits(TokenList, Component)
function TokenList () {
  this.state = {
    tokens: [],
    network: null,
  }
  Component.call(this)
}

TokenList.prototype.render = function () {
  const { assetImages, userAsset } = this.props

  // TODO(MegTron): control what token to show.
  return h('div', userAsset.map((assetInfo) => {
    const tokenInfo = {
      image: assetImages[assetInfo.key],
      string: assetInfo.value.toString(),
      balance: assetInfo.value.toString(),
      decimals: 0,
      symbol: assetInfo.key,
    }
    return h(TokenCell, tokenInfo)
  }))

}

TokenList.prototype.message = function (body) {
  return h('div', {
    style: {
      display: 'flex',
      height: '250px',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '30px',
    },
  }, body)
}
