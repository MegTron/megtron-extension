module.exports = function (tx, network) {
  const net = parseInt(network)
  let link
  switch (net) {
    case 11111: // main net
      link = `https://tronscan.org/#/transaction/${tx}`
      break
    case 1: // shasta test net
      link = `https://explorer.shasta.trongrid.io/#/transaction/${tx}`
      break
    default:
      link = ''
      break
  }
  return link
}
