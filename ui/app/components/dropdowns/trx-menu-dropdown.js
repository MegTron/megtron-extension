const Component = require('react').Component
const PropTypes = require('prop-types')
const h = require('react-hyperscript')
const inherits = require('util').inherits
const connect = require('react-redux').connect
const actions = require('../../actions')
const genAccountLink = require('../../../lib/account-link')
const { Menu, Item, CloseArea } = require('./components/menu')

TRXMenuDropdown.contextTypes = {
  t: PropTypes.func,
}

module.exports = connect(mapStateToProps, mapDispatchToProps)(TRXMenuDropdown)

function mapStateToProps (state) {
  return {
    network: state.metamask.network,
  }
}

function mapDispatchToProps (dispatch) {
  return {
    showHideTokenConfirmationModal: (token) => {
      dispatch(actions.showModal({ name: 'HIDE_TOKEN_CONFIRMATION', token }))
    },
  }
}


inherits(TRXMenuDropdown, Component)
function TRXMenuDropdown () {
  Component.call(this)

  this.onClose = this.onClose.bind(this)
}

TRXMenuDropdown.prototype.onClose = function (e) {
  e.stopPropagation()
  this.props.onClose()
}

TRXMenuDropdown.prototype.render = function () {
  const { showHideTokenConfirmationModal } = this.props

  return h(Menu, { className: 'token-menu-dropdown', isShowing: true }, [
    h(CloseArea, {
      onClick: this.onClose,
    }),
    false && h(Item, {
      onClick: (e) => {
        e.stopPropagation()
        showHideTokenConfirmationModal(this.props.token)
        this.props.onClose()
      },
      text: this.context.t('hideToken'),
    }),
    h(Item, {
      onClick: (e) => {
        e.stopPropagation()
        const url = genAccountLink(this.props.token.address, this.props.network, this.props.token.symbol)
        global.platform.openWindow({ url })
        this.props.onClose()
      },
      text: this.context.t('viewOnTronscan'),
    }),
  ])
}
