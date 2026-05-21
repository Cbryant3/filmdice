"use client"

import { Component, type ReactNode } from "react"

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-center px-6">
          <div className="text-5xl">⚠️</div>
          <p className="text-white font-semibold text-lg">Something went wrong</p>
          <p className="text-zinc-400 text-sm max-w-sm">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-2 bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-2 rounded-full text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
