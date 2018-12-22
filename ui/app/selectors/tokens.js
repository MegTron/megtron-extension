import { createSelector } from 'reselect'

export const selectedTokenAddressSelector = state => state.metamask.selectedTokenAddress
export const tokenSelector = state => state.metamask.tokens
export const selectedTokenSelector = createSelector(
  selectedTokenAddressSelector,
  (selectedTokenAddress = '') => {
    return selectedTokenAddress && { address: selectedTokenAddress, decimal: 0, symbol: selectedTokenAddress}
  }
)
