import assert from 'assert'
import proxyquire from 'proxyquire'

let mapStateToProps, mergeProps

proxyquire('../currency-display.container.js', {
  'react-redux': {
    connect: (ms, md, mp) => {
      mapStateToProps = ms
      mergeProps = mp
      return () => ({})
    },
  },
})

describe('CurrencyDisplay container', () => {
  describe('mapStateToProps()', () => {
    it('should return the correct props', () => {
      const mockState = {
        metamask: {
          conversionRate: 280.45,
          currentCurrency: 'usd',
        },
      }

      assert.deepEqual(mapStateToProps(mockState), {
        conversionRate: 280.45,
        currentCurrency: 'usd',
      })
    })
  })

  describe('mergeProps()', () => {
    it('should return the correct props', () => {
      const mockStateProps = {
        conversionRate: 280.45,
        currentCurrency: 'usd',
      }

      const tests = [
        {
          props: {
            value: '0x2710', // 1e4
            numberOfDecimals: 2,
            currency: 'usd',
          },
          result: {
            displayValue: '$2.80 USD',
          },
        },
        {
          props: {
            value: '0x2710',
          },
          result: {
            displayValue: '$2.80 USD',
          },
        },
        {
          props: {
            value: '0x135301',
            currency: 'TRX',
            numberOfDecimals: 3,
          },
          result: {
            displayValue: '1.266 TRX',
          },
        },
        {
          props: {
            value: '0x135301',
            currency: 'TRX',
            numberOfDecimals: 3,
            hideLabel: true,
          },
          result: {
            displayValue: '1.266',
          },
        },
        {
          props: {
            value: '0xf4240',
            currency: 'TRX',
            denomination: 'SUN',
            hideLabel: true,
          },
          result: {
            displayValue: '1000000',
          },
        },
      ]

      tests.forEach(({ props, result }) => {
        assert.deepEqual(mergeProps(mockStateProps, {}, { ...props }), result)
      })
    })
  })
})
