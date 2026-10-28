import { Component, type ErrorInfo, type ReactNode, useState } from "react";
import "./crash.css";

/**
 * Crash protection (Release 1.0): an error while drawing the game shows a calm screen with
 * Reload instead of an empty page. The save game is written after every action
 * (`useGame`), so the Heir is safe; the error text can be copied for a bug report.
 */
export class CrashGuard extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: unknown): { error: Error } {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("Emberheir crashed", error, info.componentStack);
  }

  override render(): ReactNode {
    return this.state.error ? <CrashScreen error={this.state.error} /> : this.props.children;
  }
}

/** The text a bug report needs: version, build and where it broke. */
export function crashReport(error: Error): string {
  return [
    `Emberheir ${__APP_VERSION__} (${__BUILD_COMMIT__})`,
    `${error.name}: ${error.message}`,
    error.stack ?? "",
  ]
    .join("\n")
    .trim();
}

function CrashScreen(props: { error: Error }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard
      ?.writeText(crashReport(props.error))
      .then(() => setCopied(true))
      .catch(() => {});
  };
  return (
    <main className="crash-screen" role="alert" aria-label="The fire flickered">
      <div className="crash-card">
        <h1>The fire flickered</h1>
        <p>Something broke. Your Heir is safe: the game saves after every step.</p>
        <code className="crash-error">{props.error.message}</code>
        <div className="crash-buttons">
          <button type="button" className="crash-main" onClick={() => window.location.reload()}>
            Reload
          </button>
          <button type="button" onClick={copy}>
            {copied ? "Copied" : "Copy error"}
          </button>
        </div>
        <small>Emberheir {__APP_VERSION__}</small>
      </div>
    </main>
  );
}
