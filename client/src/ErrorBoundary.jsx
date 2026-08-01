import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#f8fafc',
          color: '#0f172a',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 32,
            maxWidth: 640,
            width: '100%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.04)'
          }}>
            <span style={{ fontSize: 40 }}>⚠️</span>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginTop: 16, marginBottom: 8, color: '#be123c' }}>
              Application Render Crash
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
              CareerPath encountered a client-side JavaScript crash during rendering.
            </p>
            
            <div style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
              overflowX: 'auto',
              maxHeight: 200
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                Error: {this.state.error?.message || String(this.state.error)}
              </p>
              <pre style={{ fontSize: 11, color: '#475569', margin: 0, whiteSpace: 'pre-wrap' }}>
                {this.state.errorInfo?.componentStack || this.state.error?.stack}
              </pre>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  background: '#2d2b6e',
                  color: '#fff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🔄 Reload Page
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🧹 Clear Session & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
