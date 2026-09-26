import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Something went wrong.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error boundary:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500" aria-hidden="true">
            <span className="text-xl font-bold">!</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500">{this.state.message}</p>
          <button
            onClick={this.handleReset}
            className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
