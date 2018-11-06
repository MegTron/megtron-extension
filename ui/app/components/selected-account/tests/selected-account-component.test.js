import React from 'react'
import assert from 'assert'
import { render } from 'enzyme'
import SelectedAccount from '../selected-account.component'

describe('SelectedAccount Component', () => {
  it('should render checksummed address', () => {
    const wrapper = render(<SelectedAccount
      selectedAddress="TSwZDyupYNUgYB1DJy2wQa6kgw44B7eGnA"
      selectedIdentity={{ name: 'testName' }}
    />, { context: { t: () => {}}})
    // Checksummed version of address is displayed
    assert.equal(wrapper.find('.selected-account__address').text(), 'TSwZDy...eGnA')
    assert.equal(wrapper.find('.selected-account__name').text(), 'testName')
  })
})
