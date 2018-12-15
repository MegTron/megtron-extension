const {
  MAINNET,
  MAINNET_CODE,
  SHASTA,
  SHASTA_CODE,
  MAINNET_DISPLAY_NAME,
  SHASTA_DISPLAY_NAME,
} = require('./enums')

const networkToNameMap = {
  [MAINNET]: MAINNET_DISPLAY_NAME,
  [MAINNET_CODE]: MAINNET_DISPLAY_NAME,
  [SHASTA]: SHASTA_DISPLAY_NAME,
  [SHASTA_CODE]: SHASTA_DISPLAY_NAME,
}

const networkToCodeMap = {
  [MAINNET]: MAINNET_CODE,
  [SHASTA]: SHASTA_CODE,
}

const getNetworkDisplayName = key => networkToNameMap[key]
const getNetworkCode = key => networkToCodeMap[key]

module.exports = {
  getNetworkDisplayName,
  getNetworkCode,
}
