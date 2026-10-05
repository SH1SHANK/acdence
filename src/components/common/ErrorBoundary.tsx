import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Keep diagnostics available in browser console without leaking into user UI
    if (process.env.NODE_ENV !== "production") {
      console.error("[SectionErrorBoundary]", error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className={`w-full p-4 sm:p-5 rounded-xl border border-destructive/30 bg-surface-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
            this.props.className || ""
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <span className="p-2 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive shrink-0 mt-0.5">
              <AlertTriangle className="size-4" />
            </span>
            <div className="flex flex-col min-w-0">
              <h3 className="font-semibold font-heading text-foreground text-sm">
                {this.props.fallbackTitle || "Unable to render this section"}
              </h3>
              <p className="text-foreground-light mt-0.5 text-pretty">
                {this.props.fallbackMessage ||
                  "A temporary error occurred while rendering academic analytics. Your cached data remains safe."}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="small"
            onClick={this.handleRetry}
            className="shrink-0 gap-1.5 border-border-default hover:bg-surface-200 text-foreground cursor-pointer"
          >
            <RotateCcw className="size-3.5 text-brand" />
            <span>Retry</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[AppErrorBoundary]", error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh w-full bg-studio text-foreground flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl border border-border-default bg-surface-100 flex flex-col items-center gap-4 shadow-xl">
            <div className="size-12 rounded-xl bg-surface-200 border border-border-default flex items-center justify-center text-brand font-bold text-lg">
              <span className="font-heading">A</span>
            </div>
            <div>
              <h1 className="text-lg font-bold font-heading text-foreground">
                Academic Command Center Unavailable
              </h1>
              <p className="text-xs text-foreground-light mt-1.5 leading-relaxed">
                An unexpected error interrupted the dashboard. Local academic state and cached
                records are preserved.
              </p>
            </div>

            <Button
              variant="outline"
              size="default"
              onClick={this.handleReload}
              className="gap-2 border-border-strong hover:bg-surface-200 cursor-pointer"
            >
              <RotateCcw className="size-4 text-brand" />
              <span>Reload Workspace</span>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
