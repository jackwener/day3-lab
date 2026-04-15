import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <p className="text-5xl mb-4">😵</p>
          <h2 className="text-xl font-bold text-[var(--fg)] mb-2">页面出错了</h2>
          <p className="text-[var(--fg-muted)] mb-6 max-w-md">{this.state.error.message}</p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}
            className="cursor-pointer px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] hover:bg-[var(--primary-hover)] transition-colors"
          >
            返回首页
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
