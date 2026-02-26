import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-6 max-w-2xl">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Une erreur est survenue</h1>
            <pre className="text-sm text-red-200 overflow-auto bg-black/30 p-4 rounded">
              {this.state.error && this.state.error.toString()}
            </pre>
            <pre className="text-xs text-red-300 mt-4 overflow-auto bg-black/30 p-4 rounded max-h-64">
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Recharger la page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
