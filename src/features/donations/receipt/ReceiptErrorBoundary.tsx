import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback: ReactNode
}
interface State {
  hasError: boolean
}

/** Belt-and-suspenders alongside useDonationReceipt's own try/catch+retry —
 * that hook covers every async PDF-build failure (a bad logo/banner URL,
 * etc.) already; this catches anything that instead throws during
 * react-pdf's own render (e.g. inside <PDFViewer>), so a receipt failure
 * can never take down the whole success screen / dialog around it. See
 * requirement: a receipt failure must never look like the donation itself
 * was lost. */
export class ReceiptErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[receipt] render failed', error)
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}
