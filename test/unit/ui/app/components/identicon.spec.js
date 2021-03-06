import React from 'react'
import assert from 'assert'
import thunk from 'redux-thunk'
import configureMockStore from 'redux-mock-store'
import { mount } from 'enzyme'

import IdenticonComponent from '../../../../../ui/app/components/identicon'

describe('Identicon Component', () => {

  const state = {
    metamask: {
      useBlockie: false,
    },
  }

  const middlewares = [thunk]
  const mockStore = configureMockStore(middlewares)
  const store = mockStore(state)

  it('renders default identicon with no props', () => {
    const wrapper = mount(<IdenticonComponent store={store}/>)
    assert.equal(wrapper.find('img.balance-icon').prop('src'), './images/icon-128.png')
  })

  it('renders custom image and add className props', () => {
    const wrapper = mount(<IdenticonComponent store={store} className={'test-image'} image={'test-image'} />)
    assert.equal(wrapper.find('img.test-image').prop('className'), 'test-image identicon')
    assert.equal(wrapper.find('img.test-image').prop('src'), 'test-image')
  })

  it('renders div with address prop', () => {
    const wrapper = mount(<IdenticonComponent store={store} className={'test-address'} address={'0xTest'} />)
    assert.equal(wrapper.find('div.test-address').prop('className'), 'test-address identicon')
  })
})
