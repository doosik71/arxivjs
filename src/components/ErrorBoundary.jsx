import React from 'react';

/**
 * ErrorBoundary component to catch JavaScript errors in its child component tree.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Update state so the next render will show the fallback UI.
   * @param {Error} error - The error that was thrown.
   * @returns {object} - The new state.
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * You can also log the error to an error reporting service.
   * @param {Error} error - The error that was thrown.
   * @param {object} errorInfo - An object with a componentStack key.
   */
  componentDidCatch(error, errorInfo) {
    // You can log the error to a service like Sentry, LogRocket, etc.
    console.error("Uncaught error in component:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <p>An error occurred while rendering this content. Please check the console for details.</p>
          {this.state.error && (
            <pre>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
