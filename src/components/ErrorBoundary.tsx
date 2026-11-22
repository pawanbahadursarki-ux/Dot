import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected application error.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Dot ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-5">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-black text-white">Something went wrong</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                {this.state.errorMessage || 'A browser compatibility or network error occurred while loading the page.'}
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Dot</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
