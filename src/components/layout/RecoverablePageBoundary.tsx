import { Component, ErrorInfo, PropsWithChildren } from "react";

interface RecoverablePageBoundaryProps extends PropsWithChildren {
  pageLabel: string;
  storageKeysToClear?: string[];
  autoRepairKey?: string;
}

interface RecoverablePageBoundaryState {
  hasError: boolean;
}

export class RecoverablePageBoundary extends Component<
  RecoverablePageBoundaryProps,
  RecoverablePageBoundaryState
> {
  componentDidMount() {
    this.clearAutoRepairMarker();
  }

  componentDidUpdate() {
    if (!this.state.hasError) {
      this.clearAutoRepairMarker();
    }
  }

  state: RecoverablePageBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Failed to render ${this.props.pageLabel}.`, error, errorInfo);

    if (typeof window === "undefined" || !this.props.autoRepairKey) {
      return;
    }

    const repairMarkerKey = this.getAutoRepairMarkerKey();

    if (!repairMarkerKey || window.sessionStorage.getItem(repairMarkerKey) === "done") {
      return;
    }

    window.sessionStorage.setItem(repairMarkerKey, "done");
    (this.props.storageKeysToClear ?? []).forEach((storageKey) => {
      window.localStorage.removeItem(storageKey);
    });

    window.location.reload();
  }

  private getAutoRepairMarkerKey() {
    return this.props.autoRepairKey
      ? `recoverable-boundary:${this.props.autoRepairKey}`
      : null;
  }

  private clearAutoRepairMarker() {
    if (typeof window === "undefined") {
      return;
    }

    const repairMarkerKey = this.getAutoRepairMarkerKey();

    if (!repairMarkerKey) {
      return;
    }

    window.sessionStorage.removeItem(repairMarkerKey);
  }

  private handleClearAndReload = () => {
    if (typeof window === "undefined") {
      return;
    }

    (this.props.storageKeysToClear ?? []).forEach((storageKey) => {
      window.localStorage.removeItem(storageKey);
    });

    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section className="shell section-stack page-reveal">
        <div className="empty-state">
          <h2>{`${this.props.pageLabel} could not open.`}</h2>
          <p>
            The page hit broken saved browser data. Clear the saved community cache and reload to
            recover it.
          </p>
          <button type="button" className="cta-link" onClick={this.handleClearAndReload}>
            Repair this page
          </button>
        </div>
      </section>
    );
  }
}
