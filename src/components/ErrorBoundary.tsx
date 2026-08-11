import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-4xl mx-auto my-12 p-8 bg-white rounded-3xl border border-rose-200 shadow-xl dir-rtl text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900">
            {this.props.fallbackTitle || 'حدث خطأ غير متوقع أثناء عرض هذا القسم'}
          </h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
            {this.state.error?.message || 'تعذر تحميل هذه الصفحة بسبب استجابة غير متوقعة. يرجى إعادة المحاولة.'}
          </p>
          {this.state.errorInfo && (
            <details className="text-left dir-ltr bg-gray-50 p-3 rounded-xl border border-gray-200 text-[11px] font-mono text-gray-700 max-h-40 overflow-auto">
              <summary className="cursor-pointer font-bold text-gray-900 mb-1">تفاصيل الخطأ التقني (Console Details)</summary>
              {this.state.error?.toString()}
              <br />
              {this.state.errorInfo.componentStack}
            </details>
          )}
          <button
            onClick={this.handleReset}
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة تحميل الصفحة</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
