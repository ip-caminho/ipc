"use client";

import * as React from "react";

interface Props {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary genérico que captura exceções de render dos filhos
 * e renderiza um fallback. Útil para tornar opcional uma query/feature
 * que pode estar indisponível (ex: função Convex ainda não publicada).
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (this.props.onError) this.props.onError(error);
    // eslint-disable-next-line no-console
    console.warn("[ErrorBoundary] capturou erro de render:", error);
  }

  render() {
    if (this.state.hasError) return <>{this.props.fallback}</>;
    return <>{this.props.children}</>;
  }
}
