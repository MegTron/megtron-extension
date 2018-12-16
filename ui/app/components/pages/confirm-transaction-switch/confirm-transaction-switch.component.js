import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Redirect } from 'react-router-dom'
import Loading from '../../loading-screen'
import {
  CONFIRM_TRANSACTION_ROUTE,
  CONFIRM_DEPLOY_CONTRACT_PATH,
  CONFIRM_SEND_ETHER_PATH,
  CONFIRM_SEND_TOKEN_PATH,
  CONFIRM_APPROVE_PATH,
  CONFIRM_TRANSFER_FROM_PATH,
  CONFIRM_TOKEN_METHOD_PATH,
  SIGNATURE_REQUEST_PATH,
} from '../../../routes'
import { getTxParamsContractType } from '../../../helpers/transactions.util'
import {
  CONTRACT_TYPE_SEND_TRX,
  CONTRACT_TYPE_SEND_TOKEN,
  CONTRACT_TYPE_CREATE_SMART_CONTRACT,
  CONTRACT_TYPE_TRIGGER_SMART_CONTRACT,
} from '../../../constants/transactions'

export default class ConfirmTransactionSwitch extends Component {
  static propTypes = {
    txData: PropTypes.object,
    methodData: PropTypes.object,
    fetchingData: PropTypes.bool,
    isEtherTransaction: PropTypes.bool,
  }

  redirectToTransaction () {
    const {
      txData,
      fetchingData,
    } = this.props
    const { id, txParams } = txData

    if (fetchingData) {
      return <Loading />
    }

    const contractType = getTxParamsContractType(txParams)

    switch (contractType) {
      case CONTRACT_TYPE_CREATE_SMART_CONTRACT: {
        const pathname = `${CONFIRM_TRANSACTION_ROUTE}/${id}${CONFIRM_DEPLOY_CONTRACT_PATH}`
        return <Redirect to={{ pathname }} />
      }
      case CONTRACT_TYPE_SEND_TRX: {
        const pathname = `${CONFIRM_TRANSACTION_ROUTE}/${id}${CONFIRM_SEND_ETHER_PATH}`
        return <Redirect to={{ pathname }} />
      }
      case CONTRACT_TYPE_SEND_TOKEN: {
        const pathname = `${CONFIRM_TRANSACTION_ROUTE}/${id}${CONFIRM_SEND_TOKEN_PATH}`
        return <Redirect to={{ pathname }} />
      }
      case CONTRACT_TYPE_TRIGGER_SMART_CONTRACT: {
        const pathname = `${CONFIRM_TRANSACTION_ROUTE}/${id}${CONFIRM_APPROVE_PATH}`
        return <Redirect to={{ pathname }} />
      }
      default: {
        const pathname = `${CONFIRM_TRANSACTION_ROUTE}/${id}${CONFIRM_SEND_ETHER_PATH}`
        return <Redirect to={{ pathname }} />
      }
    }
  }

  render () {
    const { txData } = this.props

    if (txData.txParams) {
      return this.redirectToTransaction()
    } else if (txData.msgParams) {
      const pathname = `${CONFIRM_TRANSACTION_ROUTE}/${txData.id}${SIGNATURE_REQUEST_PATH}`
      return <Redirect to={{ pathname }} />
    }

    return <Loading />
  }
}
