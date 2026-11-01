import { useCallback } from 'react'
import { formatCurrency } from './formatters.js'
import { useWorkspace } from '../state/WorkspaceContext.js'

export function useCurrencyFormatter() {
  const { organization } = useWorkspace()
  return useCallback((amount, compact = false, maximumFractionDigits = 0) => {
    return formatCurrency(amount, organization.currency, compact, maximumFractionDigits)
  }, [organization.currency])
}
