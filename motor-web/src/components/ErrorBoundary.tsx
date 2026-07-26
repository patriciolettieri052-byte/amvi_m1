'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Ocurrió un error inesperado al procesar la solicitud.'
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: '32px 24px', textAlign: 'center', background: '#FFF0F2', border: '1px solid #FECDD3', borderRadius: '16px', margin: '20px 0' }}>
          <h3 style={{ color: '#9F1239', margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700 }}>
            Algo no salió como esperábamos
          </h3>
          <p style={{ color: '#BE123C', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.5' }}>
            {this.state.errorMessage || 'Tuvimos un inconveniente al conectar con nuestros servicios. Por favor volvé a intentar.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '12px 24px',
              background: 'var(--coral, #FF4F4F)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(255, 79, 79, 0.25)'
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
