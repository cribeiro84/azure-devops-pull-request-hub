import {
  CommonServiceIds,
  IHostPageLayoutService
} from "azure-devops-extension-api";
import * as DevOps from "azure-devops-extension-sdk";
import * as React from "react";
import "./index.scss";
import { Surface } from 'azure-devops-ui/Surface';
import { Header, TitleSize } from "azure-devops-ui/Header";
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";
import { Page } from "azure-devops-ui/Page";
import { Tab, TabBar, TabSize } from "azure-devops-ui/Tabs";
import { showRootComponent } from "./common";
import { PullRequestsTab } from "./tabs/PullRequestsTab";
import { addPolyFills } from "./polyfills";

interface IHubContentState {
  selectedTabId: string;
  fullScreenMode: boolean;
  headerDescription?: string;
  useLargeTitle?: boolean;
  useCompactPivots?: boolean;
}

addPolyFills();

export class App extends React.Component<{}, IHubContentState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      selectedTabId: "pull-requests",
      fullScreenMode: false,
      headerDescription: "",
      useCompactPivots: false,
      useLargeTitle: false
    };
  }

  public async componentWillMount() {
    DevOps.init();
  }

  public componentDidMount() {
    this.initializeFullScreenState();
  }

  public render(): JSX.Element {
    const {
      selectedTabId,
      headerDescription,
      useCompactPivots,
      useLargeTitle
    } = this.state;

    return (
      <Surface background={1}>
        <Page className="azure-pull-request-hub flex-grow">
        <Header
          title="Pull Request Manager Hub"
          commandBarItems={this.getCommandBarItems()}
          description={headerDescription}
          titleSize={
            // @ts-ignore
            useLargeTitle ? TitleSize.Large : TitleSize.Medium
          }
        />

        <TabBar
          onSelectedTabChanged={this.onSelectedTabChanged}
          selectedTabId={selectedTabId}
          // @ts-ignore
          tabSize={useCompactPivots ? TabSize.Compact : TabSize.Tall}
        >
          <Tab name="Active" id="pull-requests" />
        </TabBar>

        <div className="page-content-left page-content-right page-content-top page-content-bottom">
          {this.getPageContent()}
        </div>
      </Page>
      </Surface>
    );
  }

  private onSelectedTabChanged = (newTabId: string) => {
    this.setState({
      selectedTabId: newTabId
    });
  };

  private getPageContent() {
    const { selectedTabId } = this.state;
    if (selectedTabId === "pull-requests") {
      return <PullRequestsTab />;
    }

    return null;
  }

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

  private async initializeFullScreenState() {
    const layoutService = await DevOps.getService<IHostPageLayoutService>(
      // @ts-ignore
      CommonServiceIds.HostPageLayoutService
    );
    const fullScreenMode = await layoutService.getFullScreenMode();
    if (fullScreenMode !== this.state.fullScreenMode) {
      this.setState({ fullScreenMode });
    }
  }
}

showRootComponent(<App />);
