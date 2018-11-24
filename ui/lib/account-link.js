module.exports = function (address, network, assetKey = '') {
  const net = parseInt(network)
  let link
  switch (net) {
    case 1: // main net
      link = assetKey ? `https://tronscan.org/#/token/${assetKey}/${address}` : `https://tronscan.org/#/address/${address}`
      break
    case 5: // shasta test net
      link = assetKey ? `https://explorer.shasta.trongrid.io/token/${assetKey}/${address}` : `https://explorer.shasta.trongrid.io/address/${address}`
      break
    default:
      link = ''
      break
  }

  return link
}
