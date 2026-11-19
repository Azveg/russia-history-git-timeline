import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isModuleImportError } from '../utils/lazyWithRetry';

interface ErrorBoundaryProps {
  children: ReactNode;
  variant?: 'page' | 'modal';
  resetKey?: string;
  onClose?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleClose = (): void => {
    this.setState({ error: null });
    this.props.onClose?.();
  };

  private handleResetToTimeline = (): void => {
    try {
      const cleanUrl = window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
    } catch {
      // Игнорируем возможный SecurityError от History API
    }
    this.setState({ error: null });
    this.props.onClose?.();
  };

  override render(): ReactNode {
    const { error } = this.state;
    const { children, variant = 'page' } = this.props;

    if (!error) {
      return children;
    }

    const isModuleError = isModuleImportError(error);
    const title = isModuleError
      ? 'Не удалось загрузить модуль интерфейса'
      : 'Произошла ошибка отображения';
    const description = isModuleError
      ? 'Браузер не смог подгрузить динамический скрипт модуля — обычно это происходит после обновления версии или кратковременного разрыва соединения.'
      : 'Во время отображения раздела возникла непредвиденная ошибка. Вы можете обновить страницу или вернуться к ленте времени.';
    const errorSummary = `${error.name || 'Error'}: ${error.message || 'Неизвестная ошибка выполнения'}`;

    if (variant === 'modal') {
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#050811]/80 p-4 backdrop-blur-xs"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="modal-error-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#0b1220] p-6 text-slate-100 shadow-2xl">
            <h2 id="modal-error-title" className="text-base font-semibold text-rose-200">
              {title}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">{description}</p>
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 font-mono text-[11px] text-rose-300/90 break-words">
              {errorSummary}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={this.handleClose}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 cursor-pointer"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-lg border border-amber-500/40 bg-amber-500/20 px-3.5 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/30 cursor-pointer"
              >
                Обновить страницу
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050811] p-6 text-slate-100">
        <div
          className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-[#0b1220] p-7 shadow-2xl"
          role="alert"
        >
          <h1 className="text-lg font-semibold text-rose-200">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{description}</p>
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/85 px-3.5 py-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Техническая сводка
            </div>
            <div className="mt-1 font-mono text-xs text-rose-300/90 break-words">
              {errorSummary}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={this.handleResetToTimeline}
              className="rounded-lg border border-amber-500/50 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 cursor-pointer"
            >
              Сбросить окно и вернуться к ленте
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 cursor-pointer"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      </div>
    );
  }
}
