import React, { Component } from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import {
  MAINNET_CODE,
  SHASTA_CODE,
} from '../../../../app/scripts/controllers/network/enums'

const networkToClassHash = {
  [MAINNET_CODE]: 'mainnet',
  [SHASTA_CODE]: 'shasta',
}

export default class NetworkDisplay extends Component {
  static propTypes = {
    network: PropTypes.string,
    provider: PropTypes.object,
  }

  static contextTypes = {
    t: PropTypes.func,
  }

  renderNetworkIcon () {
    const { network } = this.props
    const networkClass = networkToClassHash[network]

    return networkClass
      ? <div className={`network-display__icon network-display__icon--${networkClass}`} />
      : <div
          className="i fa fa-question-circle fa-med"
          style={{
            margin: '0 4px',
            color: 'rgb(125, 128, 130)',
          }}
        />
  }

  render () {
    const { network, provider: { type } } = this.props
    const networkClass = networkToClassHash[network]

    return (
      <div className={classnames(
        'network-display__container',
        networkClass && ('network-display__container--' + networkClass)
      )}>
        {
          networkClass
            ? <div className={`network-display__icon network-display__icon--${networkClass}`} />
            : <div
                className="i fa fa-question-circle fa-med"
                style={{
                  margin: '0 4px',
                  color: 'rgb(125, 128, 130)',
                }}
              />
        }
        <div className="network-display__name">
          { this.context.t(type) }
        </div>
      </div>
    )
  }
}
