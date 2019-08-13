import {
  CommonServiceIds,
  IHostPageLayoutService
} from "azure-devops-extension-api";
import * as DevOps from "azure-devops-extension-sdk";
import * as React from "react";
import "./index.scss";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";
import { Page } from "azure-devops-ui/Page";
import { Tab, TabBar, TabSize } from "azure-devops-ui/Tabs";
import { showRootComponent } from "./common";
import { PullRequestsTab } from "./tabs/PullRequestsTab";

interface IHubContentState {
  selectedTabId: string;
  fullScreenMode: boolean;
  headerDescription?: string;
  useLargeTitle?: boolean;
  useCompactPivots?: boolean;
}

export class App extends React.Component<{}, IHubContentState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      selectedTabId: "pull-requests",
      fullScreenMode: false
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
          <Tab name="All Active Pull Requests" id="pull-requests" />
        </TabBar>

        <div className="page-content">{this.getPageContent()}</div>
      </Page>
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

  private async onMessagePromptClick(): Promise<void> {
    const dialogService = await DevOps.getService<IHostPageLayoutService>(
      // @ts-ignore
      CommonServiceIds.HostPageLayoutService
    );
    dialogService.openMessageDialog("Use large title?", {
      showCancel: true,
      title: "Message dialog",
      onClose: result => {
        this.setState({ useLargeTitle: result });
      }
    });
  }

  private async onCustomPromptClick(): Promise<void> {
    const dialogService = await DevOps.getService<IHostPageLayoutService>(
      // @ts-ignore
      CommonServiceIds.HostPageLayoutService
    );
    dialogService.openCustomDialog<boolean | undefined>(
      DevOps.getExtensionContext().id + ".panel-content",
      {
        title: "Custom dialog",
        configuration: {
          message: "Use compact pivots?",
          initialValue: this.state.useCompactPivots
        },
        onClose: result => {
          if (result !== undefined) {
            this.setState({ useCompactPivots: result });
          }
        }
      }
    );
  }

  private async onPanelClick(): Promise<void> {
    const panelService = await DevOps.getService<IHostPageLayoutService>(
      // @ts-ignore
      CommonServiceIds.HostPageLayoutService
    );
    panelService.openPanel<boolean | undefined>(
      DevOps.getExtensionContext().id + ".panel-content",
      {
        title: "My Panel",
        description: "Description of my panel",
        configuration: {
          message: "Show header description?",
          initialValue: !!this.state.headerDescription
        },
        onClose: result => {
          if (result !== undefined) {
            this.setState({
              headerDescription: result
                ? "This is a header description"
                : undefined
            });
          }
        }
      }
    );
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

  private async onToggleFullScreenMode(): Promise<void> {
    const fullScreenMode = !this.state.fullScreenMode;
    this.setState({ fullScreenMode });

    const layoutService = await DevOps.getService<IHostPageLayoutService>(
      // @ts-ignore
      CommonServiceIds.HostPageLayoutService
    );
    layoutService.setFullScreenMode(fullScreenMode);
  }
}

showRootComponent(<App />);
