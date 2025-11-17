import React from "react";

/**
 * PUBLIC_INTERFACE
 * ErrorBoundary captures runtime errors and renders a fallback UI.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(error, info) {
    // log as needed
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div role="alert" style={{ padding: 24 }}>
          <h1>Something went wrong</h1>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.err?.message || this.state.err)}
          </pre>
          <button onClick={() => this.setState({ err: null })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}
