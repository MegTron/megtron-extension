const assert = require('assert')
const nock = require('nock')
const CurrencyController = require('../../../../app/scripts/controllers/currency')

describe('currency-controller', function () {
  var currencyController

  beforeEach(function () {
    currencyController = new CurrencyController()
  })

  describe('currency conversions', function () {
    describe('#setCurrentCurrency', function () {
      it('should return USD as default', function () {
        assert.equal(currencyController.getCurrentCurrency(), 'usd')
      })

      it('should not be able to set to other currency', function () {
        assert.equal(currencyController.getCurrentCurrency(), 'usd')
        assert.throws(function () { currencyController.setCurrentCurrency('JPY') }, Error, 'Only usd is supported')
      })
    })

    describe('#getConversionRate', function () {
      it('should return undefined if non-existent', function () {
        var result = currencyController.getConversionRate()
        assert.ok(!result)
      })
    })

    describe('#updateConversionRate', function () {
      it('should retrieve an update for TRX to USD and set it in memory', function (done) {
        this.timeout(15000)
        nock('https://api.coinmarketcap.com')
          .get('/v2/ticker/1958/')
          .reply(200, '{ "data": { "quotes": { "USD": { "price": 0.023135305 } } }, "metadata": { "timestamp": 1541825513 }}')

        assert.equal(currencyController.getConversionRate(), 0)
        currencyController.setCurrentCurrency('usd')
        currencyController.updateConversionRate()
        .then(function () {
          var result = currencyController.getConversionRate()
          assert.equal(typeof result, 'number')
          assert.equal(result, 0.023135305)
          done()
        }).catch(function (err) {
          done(err)
        })
      })
    })
  })
})
