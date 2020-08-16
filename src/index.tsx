import "./index.scss";

import * as DevOps from "azure-devops-extension-sdk";
import * as React from "react";
import { Surface } from "azure-devops-ui/Surface";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";
import { Page } from "azure-devops-ui/Page";
import { Tab, TabBar, TabSize } from "azure-devops-ui/Tabs";
import {
  showRootComponent,
  UserPreferencesInstance,
  ShowErrorMessage,
  isLocalStorageAvailable,
} from "./common";
import { PullRequestsTab } from "./tabs/PullRequestsTab";
import { addPolyFills } from "./polyfills";
import { PullRequestStatus } from "azure-devops-extension-api/Git/Git";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { Observer } from "azure-devops-ui/Observer";
import { UserPreferencesPanel } from "./components/UserPreferencesPanel";
import { Toast } from "azure-devops-ui/Toast";
import { TeamProjectReference } from "azure-devops-extension-api/Core/Core";
import { CoreRestClient } from "azure-devops-extension-api/Core/CoreClient";
import { getClient } from "azure-devops-extension-api";
import * as Data from "./tabs/PulRequestsTabData";
import { Spinner, SpinnerSize } from "office-ui-fabric-react";

interface IHubContentState {
  errorMessage: string;
  showUserPreferencesPanel: boolean;
  showToastMessage: boolean;
  toastMessageToShow: string;
  projects: TeamProjectReference[];
  loading: boolean;
}

addPolyFills();

export class App extends React.Component<{}, IHubContentState> {
  private toastRef: React.RefObject<Toast> = React.createRef<Toast>();
  private selectedTabId: ObservableValue<string>;
  private activeCount: ObservableValue<number>;
  private completedCount: ObservableValue<number>;
  private abandonedCount: ObservableValue<number>;
  private readonly coreClient: CoreRestClient;

  private onUnload = (e: BeforeUnloadEvent) => {};

  constructor(props: {}) {
    super(props);

    UserPreferencesInstance.load();

    this.coreClient = getClient(CoreRestClient);

    this.selectedTabId = new ObservableValue("active");
    this.activeCount = new ObservableValue(0);
    this.completedCount = new ObservableValue(0);
    this.abandonedCount = new ObservableValue(0);

    this.toggleUserPreferencesPanel = this.toggleUserPreferencesPanel.bind(
      this
    );
    this.showToastMessage = this.showToastMessage.bind(this);

    this.state = {
      errorMessage: "",
      showUserPreferencesPanel: false,
      showToastMessage: false,
      toastMessageToShow: "",
      projects: [],
      loading: true
    };
  }

  public async componentWillMount() {
    try {
      await DevOps.init();

      await this.getTeamProjects();

      this.setState({
        loading: false
      });

    } catch (error) {
      this.handleError(error);
    }
  }

  public componentDidMount() {
    window.addEventListener("beforeunload", this.onUnload);

    if (!isLocalStorageAvailable()) {
      this.setState({
        errorMessage:
          "Your browser is blocking 'localStorage' API. Save current filters and last visit on PR will not work as expected.",
      });
    }
  }

  componentWillUnmount() {
    window.removeEventListener("beforeunload", this.onUnload);
  }

  public render(): JSX.Element {
    const { errorMessage, showToastMessage, toastMessageToShow, loading } = this.state;

    if (loading === true) {
      return (
        <div className="absolute-fill flex-column flex-grow flex-center justify-center">
          <Spinner size={SpinnerSize.large} label="loading..." />
        </div>
      );
    }

    return (
      <Surface background={1}>
        <Page className="azure-pull-request-hub flex-grow">
          <Header
            title="Pull Request Manager Hub"
            commandBarItems={this.getCommandBarItems()}
            titleSize={TitleSize.Medium}
          />

          {showToastMessage && (
            <Toast ref={this.toastRef} message={toastMessageToShow} />
          )}

          <TabBar
            onSelectedTabChanged={this.onSelectedTabChanged}
            selectedTabId={this.selectedTabId}
            tabSize={TabSize.Tall}
          >
            <Tab
              name="Active"
              id="active"
              iconProps={{ iconName: "Inbox" }}
              badgeCount={this.activeCount}
            />
            <Tab
              name="Recently Completed"
              id="completed"
              iconProps={{ iconName: "Completed" }}
              badgeCount={this.completedCount}
            />
            <Tab
              name="Recently Abandoned"
              id="abandoned"
              iconProps={{ iconName: "ErrorBadge" }}
              badgeCount={this.abandonedCount}
            />
          </TabBar>

          <div className="page-content-left page-content-right page-content-top page-content-bottom">
            {errorMessage.length > 0 ? (
              <ShowErrorMessage
                errorMessage={errorMessage}
                onDismiss={() => {
                  this.setState({
                    errorMessage: "",
                  });
                }}
              />
            ) : null}
            <Observer selectedTabId={this.selectedTabId}>
              {(props: { selectedTabId: string }) => {
                if (props.selectedTabId === "active") {
                  return (
                    <PullRequestsTab
                      key="active"
                      prType={PullRequestStatus.Active}
                      onCountChange={this.onCountChangeActive}
                      showToastMessage={this.showToastMessage}
                      projects={this.state.projects}
                    />
                  );
                } else if (props.selectedTabId === "completed") {
                  return (
                    <PullRequestsTab
                      key="completed"
                      prType={PullRequestStatus.Completed}
                      onCountChange={this.onCountChangeCompleted}
                      showToastMessage={this.showToastMessage}
                      projects={this.state.projects}
                    />
                  );
                } else if (props.selectedTabId === "abandoned") {
                  return (
                    <PullRequestsTab
                      key="abandoned"
                      prType={PullRequestStatus.Abandoned}
                      onCountChange={this.onCountChangeAbandoned}
                      showToastMessage={this.showToastMessage}
                      projects={this.state.projects}
                    />
                  );
                }
              }}
            </Observer>

            {this.state.showUserPreferencesPanel && (
              <UserPreferencesPanel
                onDismiss={this.toggleUserPreferencesPanel}
                onSave={this.saveUserPreferences}
                projects={this.state.projects}
              />
            )}
          </div>
        </Page>
      </Surface>
    );
  }

  private getTeamProjects = async (): Promise<void> => {
    const projects = (await this.coreClient.getProjects(undefined, 1000)).sort(
      Data.sortMethod
    );

    this.setState({
      projects
    });
  };

  private showToastMessage = (message: string): void => {
    this.setState({ showToastMessage: true, toastMessageToShow: message });

    setTimeout(() => {
      this.toastRef.current!.fadeOut().promise.then(() => {
        this.setState({ showToastMessage: false, toastMessageToShow: message });
      });
    }, 5000);
  };

  private saveUserPreferences = (): void => {
    this.showToastMessage("User Preferences successfully saved! Please refresh for the changes to take effect.");
  };

  private onCountChangeActive = (count: number): void => {
    this.activeCount.value = count;
  };

  private onCountChangeCompleted = (count: number): void => {
    this.completedCount.value = count;
  };

  private onCountChangeAbandoned = (count: number): void => {
    this.abandonedCount.value = count;
  };

  private onSelectedTabChanged = (newTabId: string) => {
    this.selectedTabId.value = newTabId;
  };

  private handleError = (error: any): void => {
    console.log(error);
    this.setState({
      errorMessage: "There was an error during the extension load: " + error,
    });
  };

  private toggleUserPreferencesPanel = (): void => {
    this.setState({
      showUserPreferencesPanel: !this.state.showUserPreferencesPanel,
    });
  };

  private getCommandBarItems = (): IHeaderCommandBarItem[] => {
    return [
      {
        id: "preferences",
        text: "Preferences",
        onActivate: () => {
          this.toggleUserPreferencesPanel();
        },
        iconProps: {
          iconName: "fabric-icon ms-Icon--Settings",
        },
        isPrimary: true,
        tooltipProps: {
          text: "Open the Pull Request Manager User settings",
        },
      },
    ];
  };
}

showRootComponent(<App />);
