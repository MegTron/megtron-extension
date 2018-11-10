import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import { TRX, SUN } from '../../constants/common'

export default class CurrencyDisplay extends PureComponent {
  static propTypes = {
    className: PropTypes.string,
    displayValue: PropTypes.string,
    prefix: PropTypes.string,
    prefixComponent: PropTypes.node,
    style: PropTypes.object,
    // Used in container
    currency: PropTypes.oneOf([TRX]),
    denomination: PropTypes.oneOf([SUN]),
    value: PropTypes.string,
    numberOfDecimals: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    hideLabel: PropTypes.bool,
  }

  render () {
    const { className, displayValue, prefix, prefixComponent, style } = this.props
    const text = `${prefix || ''}${displayValue}`

    return (
      <div
        className={classnames('currency-display-component', className)}
        style={style}
        title={text}
      >
        { prefixComponent}
        <span className="currency-display-component__text">{ text }</span>
      </div>
    )
  }
}
