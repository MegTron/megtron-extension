module.exports = function (address, network) {
  const net = parseInt(network)
  let link
  switch (net) {
    case 1: // main net
      link = `https://tronscan.org/#/address/${address}`
      break
    case 5: // shasta test net
      link = `https://explorer.shasta.trongrid.io/address/${address}`
      break
    default:
      link = ''
      break
  }

  return link
}
