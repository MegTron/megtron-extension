import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import TransactionBreakdownRow from './transaction-breakdown-row'
import Card from '../card'
import UserPreferencedCurrencyDisplay from '../user-preferenced-currency-display'
import { PRIMARY, SECONDARY } from '../../constants/common'
import { getTxParamsAmount } from '../../helpers/transactions.util'

export default class TransactionBreakdown extends PureComponent {
  static contextTypes = {
    t: PropTypes.func,
  }

  static propTypes = {
    transaction: PropTypes.object,
    className: PropTypes.string,
  }

  static defaultProps = {
    transaction: {},
  }

  render () {
    const { t } = this.context
    const { transaction, className } = this.props
    const { txParams } = transaction
    const value = '0x' + getTxParamsAmount(txParams).toString(16)
    const totalInHex = value

    return (
      <div className={classnames('transaction-breakdown', className)}>
        <Card
          title={t('transaction')}
          className="transaction-breakdown__card"
        >
          <TransactionBreakdownRow title={t('amount')}>
            <UserPreferencedCurrencyDisplay
              className="transaction-breakdown__value"
              type={PRIMARY}
              value={value}
            />
          </TransactionBreakdownRow>
          <TransactionBreakdownRow title={t('total')}>
            <div>
              <UserPreferencedCurrencyDisplay
                className="transaction-breakdown__value transaction-breakdown__value--eth-total"
                type={PRIMARY}
                value={totalInHex}
              />
              <UserPreferencedCurrencyDisplay
                className="transaction-breakdown__value"
                type={SECONDARY}
                value={totalInHex}
              />
            </div>
          </TransactionBreakdownRow>
        </Card>
      </div>
    )
  }
}
