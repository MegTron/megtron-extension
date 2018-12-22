import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import CurrencyDisplay from '../currency-display/currency-display.component'

export default class TokenCurrencyDisplay extends PureComponent {
  static propTypes = {
    amount: PropTypes.number,
    token: PropTypes.object,
  }
  render () {
    const { amount, token: { symbol } } = this.props
    const displayValue = `${amount} ${symbol}`
    return (
      <CurrencyDisplay
        {...this.props}
        displayValue={displayValue}
      />
    )
  }
}
