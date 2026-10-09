import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Spinner } from './Spinner';
import { forceReload, isChunkLoadError, reloadOnceForChunkError } from '../../utils/chunkRecovery';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  // The failure was a lazy-chunk load (stale build after a deploy) rather
  // than an error thrown while rendering.
  chunk: boolean;
  // True while the automatic one-shot refresh is in flight; flipped to false
  // in componentDidCatch when the refresh cooldown already fired moments ago.
  autoReload: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '', chunk: false, autoReload: false };

  static getDerivedStateFromError(error: Error): State {
    const chunk = isChunkLoadError(error);
    return {
      hasError: true,
      message: error.message || 'Something went wrong.',
      chunk,
      // Assume the refresh starts; componentDidCatch corrects this when the
      // cooldown guard blocks it (i.e. we already refreshed very recently).
      autoReload: chunk,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error boundary:', error, info);
    if (this.state.chunk && !reloadOnceForChunkError()) {
      // An automatic refresh was already attempted within the cooldown and
      // the page is still failing — stop and offer an explicit reload button
      // so the tab can never end up in a refresh loop.
      this.setState({ autoReload: false });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '', chunk: false, autoReload: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.state.chunk && this.state.autoReload) {
        // The current index.html references chunks from a previous deploy.
        // A refresh picks up the new build — show progress instead of an error.
        return (
          <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            <Spinner size={36} />
            <p className="mt-4 text-sm text-slate-500">Updating to the latest version…</p>
          </div>
        );
      }
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500" aria-hidden="true">
            <span className="text-xl font-bold">!</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            {this.state.chunk ? 'Update required' : 'Something went wrong'}
          </h2>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            {this.state.chunk
              ? 'This page was updated while it was open. Reload to continue with the latest version.'
              : this.state.message}
          </p>
          <button
            onClick={this.state.chunk ? forceReload : this.handleReset}
            className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            {this.state.chunk ? 'Reload page' : 'Try again'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
