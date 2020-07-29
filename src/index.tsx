import * as DevOps from "azure-devops-extension-sdk";
import * as React from "react";
import "./index.scss";
import { Surface } from "azure-devops-ui/Surface";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";
import { Page } from "azure-devops-ui/Page";
import { Tab, TabBar, TabSize } from "azure-devops-ui/Tabs";
import { showRootComponent, UsertSettingsInstance } from "./common";
import { PullRequestsTab } from "./tabs/PullRequestsTab";
import { addPolyFills } from "./polyfills";
import { PullRequestStatus } from "azure-devops-extension-api/Git/Git";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { Observer } from "azure-devops-ui/Observer";

interface IHubContentState {}

addPolyFills();

export class App extends React.Component<{}, IHubContentState> {
  private selectedTabId: ObservableValue<string>;
  private activeCount: ObservableValue<number>;
  private completedCount: ObservableValue<number>;
  private abandonedCount: ObservableValue<number>;

  private onUnload = (e: BeforeUnloadEvent) => {

  };

  constructor(props: {}) {
    super(props);

    this.selectedTabId = new ObservableValue("active");
    this.activeCount = new ObservableValue(0);
    this.completedCount = new ObservableValue(0);
    this.abandonedCount = new ObservableValue(0);

    this.state = {};
  }

  public async componentWillMount() {
    UsertSettingsInstance.load();
    DevOps.init();
  }

  public componentDidMount() {
    window.addEventListener("beforeunload", this.onUnload);
  }

  componentWillUnmount() {
    window.removeEventListener("beforeunload", this.onUnload);
  }

  public render(): JSX.Element {
    return (
      <Surface background={1}>
        <Page className="azure-pull-request-hub flex-grow">
          <Header
            title="Pull Request Manager Hub"
            commandBarItems={this.getCommandBarItems()}
            titleSize={TitleSize.Medium}
          />

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
            <Observer selectedTabId={this.selectedTabId}>
              {(props: { selectedTabId: string }) => {
                if (props.selectedTabId === "active") {
                  return (
                    <PullRequestsTab
                      key="active"
                      prType={PullRequestStatus.Active}
                      onCountChange={this.onCountChangeActive}
                    />
                  );
                } else if (props.selectedTabId === "completed") {
                  return (
                    <PullRequestsTab
                      key="completed"
                      prType={PullRequestStatus.Completed}
                      onCountChange={this.onCountChangeCompleted}
                    />
                  );
                } else if (props.selectedTabId === "abandoned") {
                  return (
                    <PullRequestsTab
                      key="abandoned"
                      prType={PullRequestStatus.Abandoned}
                      onCountChange={this.onCountChangeAbandoned}
                    />
                  );
                }
              }}
            </Observer>
          </div>
        </Page>
      </Surface>
    );
  }

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

  private getCommandBarItems(): IHeaderCommandBarItem[] {
    return [
      // {
      //   id: "configuration",
      //   text: "Configuration",
      //   onActivate: () => {
      //     this.onPanelClick();
      //   },
      //   iconProps: {
      //     iconName: "fabric-icon ms-Icon--Settings"
      //   },
      //   isPrimary: true,
      //   tooltipProps: {
      //     text: "Open the Pull Request Manager tab"
      //   }
      // }
    ];
  }
}

showRootComponent(<App />);
