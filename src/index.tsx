
import * as DevOps from "azure-devops-extension-sdk";
import * as React from "react";
import "./index.scss";
import { Surface } from "azure-devops-ui/Surface";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";
import { Page } from "azure-devops-ui/Page";
import { Tab, TabBar, TabSize } from "azure-devops-ui/Tabs";
import { showRootComponent } from "./common";
import { PullRequestsTab } from "./tabs/PullRequestsTab";
import { addPolyFills } from "./polyfills";
import { PullRequestStatus } from "azure-devops-extension-api/Git/Git";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { Observer } from "azure-devops-ui/Observer";

interface IHubContentState {

}

addPolyFills();

export class App extends React.Component<{}, IHubContentState> {
  private selectedTabId: ObservableValue<string>;

  constructor(props: {}) {
    super(props);

    this.selectedTabId = new ObservableValue("active");

    this.state = {

    };
  }

  public async componentWillMount() {
    DevOps.init();
  }

  public componentDidMount() {
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
            <Tab name="Active" id="active" iconProps={{ iconName: "Inbox" }} />
            <Tab name="Completed" id="completed" iconProps={{ iconName: "Completed" }} />
            <Tab name="Abandoned" id="abandoned" iconProps={{ iconName: "ErrorBadge" }} />
          </TabBar>

          <div className="page-content-left page-content-right page-content-top page-content-bottom">
            <Observer selectedTabId={this.selectedTabId}>
              {(props: { selectedTabId: string }) => {
                if (props.selectedTabId === "active") {
                  return <PullRequestsTab key="active" prType={PullRequestStatus.Active} />;
                } else if (props.selectedTabId === "completed") {
                  return <PullRequestsTab  key="completed" prType={PullRequestStatus.Completed} />;
                } else if (props.selectedTabId === "abandoned") {
                  return <PullRequestsTab  key="abandoned" prType={PullRequestStatus.Abandoned} />;
                }
              }}
            </Observer>
          </div>
        </Page>
      </Surface>
    );
  }

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
