const assert = require('assert')
const { fetchConfigFromReq } = require('../../../../app/scripts/controllers/network/tron-json-rpc-trongrid')

describe('TronJsonRpcTrongrid', () => {
  describe('fetchConfigFromReq', () => {
    it('should return correct param', () => {
      const network = 'mainnet'
      const req = {
        method: 'walletsolidity/getnowblock',
        params: {},
      }
      const { fetchUrl, fetchParams } = fetchConfigFromReq({ network, req })
      assert.strictEqual(fetchUrl, 'https://api.trongrid.io/walletsolidity/getnowblock?params=%7B%7D')
      assert.deepEqual(fetchParams, { method: 'GET' })
    })

    it('should return correct param for shasta network', () => {
      const network = 'shasta'
      const req = {
        method: 'walletsolidity/getnowblock',
        params: {},
      }
      const { fetchUrl, fetchParams } = fetchConfigFromReq({ network, req })
      assert.strictEqual(fetchUrl, 'https://api.shasta.trongrid.io/walletsolidity/getnowblock?params=%7B%7D')
      assert.deepEqual(fetchParams, { method: 'GET' })
    })

    it('should return correct param for post method', () => {
      const network = 'mainnet'
      const req = {
        method: 'wallet/getnowblock',
        params: {},
      }
      const { fetchUrl, fetchParams } = fetchConfigFromReq({ network, req })
      assert.strictEqual(fetchUrl, 'https://api.trongrid.io/wallet/getnowblock')
      assert.deepEqual(fetchParams, { method: 'POST', body: '{}', headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }})
    })

    it('should return correct param for post method with param', () => {
      const network = 'mainnet'
      const req = {
        method: 'wallet/getaccount',
        params: {
          address: '41E552F6487585C2B58BC2C9BB4492BC1F17132CD0',
        },
      }
      const { fetchUrl, fetchParams } = fetchConfigFromReq({ network, req })
      assert.strictEqual(fetchUrl, 'https://api.trongrid.io/wallet/getaccount')
      assert.deepEqual(fetchParams, { method: 'POST', body: '{"address":"41E552F6487585C2B58BC2C9BB4492BC1F17132CD0"}', headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }})
    })
  })
})
