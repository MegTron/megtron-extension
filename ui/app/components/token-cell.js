const Component = require('react').Component
const h = require('react-hyperscript')
const inherits = require('util').inherits
const connect = require('react-redux').connect
const Identicon = require('./identicon')
const selectors = require('../selectors')
const actions = require('../actions')
const { conversionUtil, multiplyCurrencies } = require('../conversion-util')

const TokenMenuDropdown = require('./dropdowns/token-menu-dropdown.js')

function mapStateToProps (state) {
  return {
    network: state.metamask.network,
    currentCurrency: state.metamask.currentCurrency,
    selectedTokenAddress: state.metamask.selectedTokenAddress,
    userAddress: selectors.getSelectedAddress(state),
    contractExchangeRates: state.metamask.contractExchangeRates,
    conversionRate: state.metamask.conversionRate,
    sidebarOpen: state.appState.sidebar.isOpen,
  }
}

function mapDispatchToProps (dispatch) {
  return {
    setSelectedToken: address => dispatch(actions.setSelectedToken(address)),
    hideSidebar: () => dispatch(actions.hideSidebar()),
  }
}

module.exports = connect(mapStateToProps, mapDispatchToProps)(TokenCell)

inherits(TokenCell, Component)
function TokenCell () {
  Component.call(this)

  this.state = {
    tokenMenuOpen: false,
  }
}

TokenCell.prototype.render = function () {
  const { tokenMenuOpen } = this.state
  const props = this.props
  const {
    address,
    symbol,
    string,
    network,
    setSelectedToken,
    selectedTokenAddress,
    contractExchangeRates,
    conversionRate,
    hideSidebar,
    sidebarOpen,
    currentCurrency,
    // userAddress,
    image,
    assetKey,
  } = props
  let currentTokenToFiatRate
  let currentTokenInFiat
  let formattedFiat = ''

  if (contractExchangeRates[assetKey]) {
    currentTokenToFiatRate = multiplyCurrencies(
      contractExchangeRates[assetKey],
      conversionRate
    )
    currentTokenInFiat = conversionUtil(string, {
      fromNumericBase: 'dec',
      fromCurrency: symbol,
      toCurrency: currentCurrency.toUpperCase(),
      numberOfDecimals: 2,
      conversionRate: currentTokenToFiatRate,
    })
    formattedFiat = currentTokenInFiat.toString() === '0'
      ? ''
      : `${currentTokenInFiat} ${currentCurrency.toUpperCase()}`
  }

  const showFiat = Boolean(currentTokenInFiat) && currentCurrency.toUpperCase() !== symbol

  return (
    h('div.token-list-item', {
      className: `token-list-item ${selectedTokenAddress === assetKey ? 'token-list-item--active' : ''}`,
      onClick: () => {
        setSelectedToken(assetKey)
        selectedTokenAddress !== assetKey && sidebarOpen && hideSidebar()
      },
    }, [

      h(Identicon, {
        className: 'token-list-item__identicon',
        diameter: 50,
        address: assetKey, // Use asset key instead of issuer's address. Otherwise the token will have same image as issuer account.
        network,
        image,
      }),

      h('div.token-list-item__balance-ellipsis', null, [
        h('div.token-list-item__balance-wrapper', null, [
          h('div.token-list-item__token-balance', `${string || 0}`),
          h('div.token-list-item__token-symbol', symbol),
          showFiat && h('div.token-list-item__fiat-amount', {
            style: {},
          }, formattedFiat),
        ]),

        h('i.fa.fa-ellipsis-h.fa-lg.token-list-item__ellipsis.cursor-pointer', {
          onClick: (e) => {
            e.stopPropagation()
            this.setState({ tokenMenuOpen: true })
          },
        }),

      ]),

      tokenMenuOpen && h(TokenMenuDropdown, {
        onClose: () => this.setState({ tokenMenuOpen: false }),
        token: { symbol, address },
      }),
    ])
  )
}
