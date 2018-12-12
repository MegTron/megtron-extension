const ethAbi = require('ethereumjs-abi')
const ethUtil = require('ethereumjs-util')
const { TOKEN_TRANSFER_FUNCTION_SIGNATURE } = require('../send.constants')
const { getHexAddress } = require('../../../helpers/transactions.util')
const BigNumber = require('bignumber.js')

function addHexPrefixToObjectValues (obj) {
  return Object.keys(obj).reduce((newObj, key) => {
    return { ...newObj, [key]: ethUtil.addHexPrefix(obj[key]) }
  }, {})
}

function constructTxParams ({ selectedToken, data, to, amount, from, gas, gasPrice }) {
  const txParams = {
    data,
    from,
    value: '0',
    gas,
    gasPrice,
  }

  if (!selectedToken) {
    txParams.value = amount
    txParams.to = to
  }

  return addHexPrefixToObjectValues(txParams)
}

/* Construct Tron Tx Params
*
* @param {string} to the base58 form of destination address.
* @param {string} amount the hex rep of SUN
* @param {string} from the base58 form of origin address.
* @returns {Object} the Tx Params
*/
function constructTronTxParams ({ to, amount, from }) {
  // TODO: support token
  return {
    to_address: getHexAddress(to),
    owner_address: getHexAddress(from),
    amount: new BigNumber(amount, 16).toNumber(),
  }
}

function constructUpdatedTx ({
  amount,
  data,
  editingTransactionId,
  from,
  gas,
  gasPrice,
  selectedToken,
  to,
  unapprovedTxs,
}) {
  const unapprovedTx = unapprovedTxs[editingTransactionId]
  const txParamsData = unapprovedTx.txParams.data ? unapprovedTx.txParams.data : data
  const editingTx = {
    ...unapprovedTx,
    txParams: Object.assign(
      unapprovedTx.txParams,
      addHexPrefixToObjectValues({
        data: txParamsData,
        to,
        from,
        gas,
        gasPrice,
        value: amount,
      })
    ),
  }

  if (selectedToken) {
    const data = TOKEN_TRANSFER_FUNCTION_SIGNATURE + Array.prototype.map.call(
      ethAbi.rawEncode(['address', 'uint256'], [to, ethUtil.addHexPrefix(amount)]),
      x => ('00' + x.toString(16)).slice(-2)
    ).join('')

    Object.assign(editingTx.txParams, addHexPrefixToObjectValues({
      value: '0',
      to: selectedToken.address,
      data,
    }))
  }

  if (typeof editingTx.txParams.data === 'undefined') {
    delete editingTx.txParams.data
  }

  return editingTx
}

function addressIsNew (toAccounts, newAddress) {
  return !toAccounts.find(({ address }) => newAddress === address)
}

module.exports = {
  addressIsNew,
  constructTxParams,
  constructTronTxParams,
  constructUpdatedTx,
  addHexPrefixToObjectValues,
}
