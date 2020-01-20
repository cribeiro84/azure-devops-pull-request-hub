import "./PullRequestTab.scss";

import * as React from "react";
import { produce } from "immer";

import {
  AZDEVOPS_CLOUD_API_ORGANIZATION,
  AZDEVOPS_API_ORGANIZATION_RESOURCE,
  AZDEVOPS_CLOUD_API_ORGANIZATION_OLD,
  getCommonServiceIdsValue,
  getZeroDataActionTypeValue,
  getStatusSizeValue
} from "../models/constants";

import { Spinner, SpinnerSize } from "office-ui-fabric-react";

// Custom
import * as Data from "./PulRequestsTabData";

// Azure DevOps SDK
import * as DevOps from "azure-devops-extension-sdk";

// Azure DevOps API
import { IProjectPageService, getClient } from "azure-devops-extension-api";
import { CoreRestClient } from "azure-devops-extension-api/Core/CoreClient";
import { GitRestClient } from "azure-devops-extension-api/Git/GitClient";
import {
  IdentityRefWithVote,
  GitRepository
} from "azure-devops-extension-api/Git/Git";

// Azure DevOps UI
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";
import { ListSelection } from "azure-devops-ui/List";
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";
import { Observer } from "azure-devops-ui/Observer";
import { Dialog } from "azure-devops-ui/Dialog";
import {
  Filter,
  FILTER_CHANGE_EVENT,
  IFilterItemState
} from "azure-devops-ui/Utilities/Filter";
import {
  DropdownMultiSelection,
  DropdownSelection
} from "azure-devops-ui/Utilities/DropdownSelection";
import {
  ObservableArray,
  IReadonlyObservableValue
} from "azure-devops-ui/Core/Observable";
import { Card } from "azure-devops-ui/Card";
import { Status, Statuses } from "azure-devops-ui/Status";
import { Table } from "azure-devops-ui/Table";
import { ZeroData } from "azure-devops-ui/ZeroData";
import { IdentityRef } from "azure-devops-extension-api/WebApi/WebApi";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { IProjectInfo } from "azure-devops-extension-api/Common/CommonServices";
import {
  TeamProjectReference,
  ProjectInfo
} from "azure-devops-extension-api/Core/Core";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { getPullRequestDetailsAsync } from "./PulRequestsTabData";
import { FilterBarHub } from "../components/FilterBarHub";
import { hasPullRequestFailure } from "../models/constants";

export class PullRequestsTab extends React.Component<
  {},
  Data.IPullRequestsTabState
> {
  private baseUrl: string = "";
  private prRowSelecion = new ListSelection({
    selectOnFocus: true,
    multiSelect: false
  });
  private isDialogOpen = new ObservableValue<boolean>(false);
  private filter: Filter;
  private selectedProject = new DropdownSelection();
  private selectedAuthors = new DropdownMultiSelection();
  private selectedRepos = new DropdownMultiSelection();
  private selectedSourceBranches = new DropdownMultiSelection();
  private selectedTargetBranches = new DropdownMultiSelection();
  private selectedReviewers = new DropdownMultiSelection();
  private selectedMyApprovalStatuses = new DropdownMultiSelection();
  private selectedAlternateStatusPr = new DropdownMultiSelection();
  private pullRequestItemProvider = new ObservableArray<
    | Data.PullRequestModel
    | IReadonlyObservableValue<Data.PullRequestModel | undefined>
  >();

  private readonly gitClient: GitRestClient;
  private readonly coreClient: CoreRestClient;

  constructor(props: {}) {
    super(props);

    this.selectedProjectChanged = this.selectedProjectChanged.bind(this);

    this.gitClient = getClient(GitRestClient);
    this.coreClient = getClient(CoreRestClient);

    this.state = {
      projects: [],
      pullRequests: [],
      repositories: [],
      currentProject: { id: "", name: "" },
      createdByList: [],
      sourceBranchList: [],
      targetBranchList: [],
      reviewerList: [],
      loading: true,
      errorMessage: "",
      pullRequestCount: 0
    };

    this.filter = new Filter();
  }

  public async componentDidMount() {
    DevOps.init().then(async () => {
      this.initializeState();
      this.setupFilter();
      await this.initializePage();
    });
  }

  componentWillUnmount() {
    this.filter.unsubscribe(() => {
      this.filterPullRequests();
    }, FILTER_CHANGE_EVENT);
  }

  private setupFilter() {
    this.filter.subscribe(() => {
      this.filterPullRequests();
    }, FILTER_CHANGE_EVENT);
  }

  private async initializeState() {
    this.setState({
      pullRequests: []
    });
  }

  private async initializePage() {
    this.getOrganizationBaseUrl()
      .then(async () => {
        const projectService = await DevOps.getService<IProjectPageService>(
          getCommonServiceIdsValue("ProjectPageService")
        );

        const currentProject = await projectService.getProject();

        this.getTeamProjects()
          .then(projects => {
            this.setState({
              projects
            });

            this.selectedProject.select(
              projects.findIndex(p => {
                return p.id === currentProject!.id;
              })
            );

            this.getRepositories(currentProject!)
              .then(() => {
                this.getAllPullRequests().catch(error =>
                  this.handleError(error)
                );
              })
              .catch(error => {
                this.handleError(error);
              });
          })
          .catch(error => {
            this.handleError(error);
          });
      })
      .catch(error => {
        this.handleError(error);
      });
  }

  private handleError(error: any): void {
    console.log(error);
    this.setState({
      loading: false,
      errorMessage: "There was an error during the extension load: " + error
    });
  }

  private async getRepositories(project: IProjectInfo | TeamProjectReference) {
    this.setState({
      currentProject: project
    });

    this.setState({
      repositories: (
        await this.gitClient.getRepositories(project.name, true)
      ).sort((a: GitRepository, b: GitRepository) => {
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      })
    });
  }

  private async getOrganizationBaseUrl() {
    const oldOrgUrlFormat = AZDEVOPS_CLOUD_API_ORGANIZATION_OLD.replace(
      "[org]",
      DevOps.getHost().name
    );
    const url = new URL(document.referrer);

    console.log("Base URL reference: " + url.toString());

    if (
      url.origin !== AZDEVOPS_CLOUD_API_ORGANIZATION &&
      url.origin !== oldOrgUrlFormat
    ) {
      if (url.pathname.split("/")[1] === "tfs") {
        const collectionName = url.pathname.split("/")[2];
        this.baseUrl = `${url.origin}/tfs/${collectionName}/`;
      } else {
        const collectionName = url.pathname.split("/")[1];
        this.baseUrl = `${url.origin}/${collectionName}/`;
      }
    } else {
      const baseUrlFormat = `${AZDEVOPS_CLOUD_API_ORGANIZATION}/${AZDEVOPS_API_ORGANIZATION_RESOURCE}/?accountName=${
        DevOps.getHost().name
      }&api-version=5.0-preview.1`;

      await fetch(baseUrlFormat)
        .then(res => res.json())
        .then(result => {
          this.baseUrl = result.locationUrl;
        })
        .catch(error => {
          this.handleError(
            "Unable to fetch Organization's URL. Details: " + error
          );
        });
    }

    console.log("Set base URL: " + this.baseUrl);
  }

  private reloadPullRequestItemProvider(newList: Data.PullRequestModel[]) {
    this.pullRequestItemProvider.splice(0, this.pullRequestItemProvider.length);
    this.pullRequestItemProvider.push(...newList);
    this.setState({
      pullRequestCount: newList.length
    });
  }

  private async getTeamProjects(): Promise<TeamProjectReference[]> {
    return (await this.coreClient.getProjects()).sort(
      (a: TeamProjectReference, b: TeamProjectReference) => {
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      }
    );
  }

  private async getAllPullRequests() {
    this.setState({ loading: true });
    const { repositories, pullRequests } = this.state;

    let newPullRequestList = Object.assign([], pullRequests);

    // clear the pull request list to be reloaded...
    newPullRequestList.splice(0, newPullRequestList.length - 1);
    this.pullRequestItemProvider = new ObservableArray<
      | Data.PullRequestModel
      | IReadonlyObservableValue<Data.PullRequestModel | undefined>
    >([]);

    Promise.all(
      repositories.map(async r => {
        const criteria = Object.assign({}, Data.pullRequestCriteria);

        const loadedPullRequests = await this.gitClient.getPullRequests(
          r.id,
          criteria
        );

        return loadedPullRequests;
      })
    )
      .then(loadedPullRequests => {
        loadedPullRequests.map(pr => {
          if (!pr || pr.length === 0) {
            return pr;
          }

          newPullRequestList.push(
            ...Data.PullRequestModel.getModels(
              pr,
              this.state.currentProject!.name,
              this.baseUrl
            )
          );
          return pr;
        });
      })
      .catch(error => {
        this.handleError(error);
      })
      .finally(() => {
        if (newPullRequestList.length > 0) {
          newPullRequestList = newPullRequestList.sort(
            (a: Data.PullRequestModel, b: Data.PullRequestModel) => {
              return (
                a.gitPullRequest.creationDate.getTime() -
                b.gitPullRequest.creationDate.getTime()
              );
            }
          );

          this.setState({
            pullRequests: newPullRequestList
          });
        }

        this.loadLists();

        getPullRequestDetailsAsync(newPullRequestList)
          .then(updated => {
            this.setState(
              produce<Data.IPullRequestsTabState>(
                (draftObject: { pullRequests: Data.PullRequestModel[] }) => {
                  draftObject.pullRequests = updated;
                }
              )
            );

            setTimeout(() => {
              this.filterPullRequests();
            }, 500);
          })
          .catch(error => {
            console.log(
              "There was an error fetching addtional details for the PRs. Details: " +
                error
            );
          });
      });
  }

  private loadLists() {
    const { pullRequests } = this.state;

    this.reloadPullRequestItemProvider([]);

    this.pullRequestItemProvider.push(...pullRequests);

    this.populateFilterBarFields(pullRequests);
    this.setState({ loading: false });
    this.filterPullRequests();
  }

  private filterPullRequests() {
    const { pullRequests } = this.state;

    const filterPullRequestTitle = this.filter.getFilterItemValue<string>(
      "pullRequestTitle"
    );
    const repositoriesFilter = this.filter.getFilterItemValue<string[]>(
      "selectedRepos"
    );
    const sourceBranchFilter = this.filter.getFilterItemValue<string[]>(
      "selectedSourceBranches"
    );
    const targetBranchFilter = this.filter.getFilterItemValue<string[]>(
      "selectedTargetBranches"
    );
    const createdByFilter = this.filter.getFilterItemValue<string[]>(
      "selectedAuthors"
    );
    const reviewersFilter = this.filter.getFilterItemValue<string[]>(
      "selectedReviewers"
    );

    const myApprovalStatusFilter = this.filter.getFilterItemValue<string[]>(
      "selectedMyApprovalStatuses"
    );

    const selectedAlternateStatusPrFilter = this.filter.getFilterItemValue<number[]>(
      "selectedAlternateStatusPr"
    );

    let filteredPullRequest = pullRequests;

    if (filterPullRequestTitle && filterPullRequestTitle.length > 0) {
      filteredPullRequest = pullRequests.filter(pr => {
        const found =
          pr
            .title!.toLocaleLowerCase()
            .indexOf(filterPullRequestTitle.toLocaleLowerCase()) > -1;
        return found;
      });
    }

    if (repositoriesFilter && repositoriesFilter.length > 0) {
      filteredPullRequest = filteredPullRequest.filter(pr => {
        const found = repositoriesFilter.some(r => {
          return pr.gitPullRequest.repository.id === r;
        });

        return found;
      });
    }

    if (sourceBranchFilter && sourceBranchFilter.length > 0) {
      filteredPullRequest = filteredPullRequest.filter(pr => {
        const found = sourceBranchFilter.some(r => {
          return pr.sourceBranch!.displayName === r;
        });

        return found;
      });
    }

    if (targetBranchFilter && targetBranchFilter.length > 0) {
      filteredPullRequest = filteredPullRequest.filter(pr => {
        const found = targetBranchFilter.some(r => {
          return pr.targetBranch!.displayName === r;
        });

        return found;
      });
    }

    if (createdByFilter && createdByFilter.length > 0) {
      filteredPullRequest = filteredPullRequest.filter(pr => {
        const found = createdByFilter.some(r => {
          return pr.gitPullRequest.createdBy.id === r;
        });

        return found;
      });
    }

    if (reviewersFilter && reviewersFilter.length > 0) {
      filteredPullRequest = filteredPullRequest.filter(pr => {
        const found = reviewersFilter.some(r => {
          return pr.gitPullRequest.reviewers.some(rv => {
            return rv.id === r;
          });
        });
        return found;
      });
    }

    if (myApprovalStatusFilter && myApprovalStatusFilter.length > 0) {
      filteredPullRequest = filteredPullRequest.filter(pr => {
        const found = myApprovalStatusFilter.some(vote => {
          return (
            pr.myApprovalStatus ===
            (parseInt(vote, 10) as Data.ReviewerVoteOption)
          );
        });
        return found;
      });
    }

    if (selectedAlternateStatusPrFilter && selectedAlternateStatusPrFilter.length > 0) {
      filteredPullRequest = filteredPullRequest.filter(pr => {
        const found = selectedAlternateStatusPrFilter.some(item => {
          // tslint:disable-next-line:triple-equals
          return (pr.gitPullRequest.isDraft === true && (item == 0))
            // tslint:disable-next-line:triple-equals
            || (hasPullRequestFailure(pr) === true && (item == 1))
            // tslint:disable-next-line:triple-equals
            || (pr.isAutoCompleteSet === true && (item == 2));
        });
        return found;
      });
    }

    this.reloadPullRequestItemProvider(filteredPullRequest);
  }

  private hasFilterValue(
    list: Array<Data.BranchDropDownItem | IdentityRef | IdentityRefWithVote>,
    value: any
  ): boolean {
    return list.some(item => {
      if (item.hasOwnProperty("id")) {
        const convertedValue = item as IdentityRef;
        return convertedValue.id.localeCompare(value) === 0;
      } else if (item.hasOwnProperty("branchName")) {
        const convertedValue = item as Data.BranchDropDownItem;
        return convertedValue.displayName.localeCompare(value) === 0;
      } else {
        return item === value;
      }
    });
  }

  private populateFilterBarFields = (pullRequests: Data.PullRequestModel[]) => {
    let {
      sourceBranchList,
      targetBranchList,
      createdByList,
      reviewerList
    } = this.state;

    sourceBranchList = [];
    targetBranchList = [];
    createdByList = [];
    reviewerList = [];

    pullRequests.map(pr => {
      let found = this.hasFilterValue(
        createdByList,
        pr.gitPullRequest.createdBy.id
      );

      if (found === false) {
        createdByList.push(pr.gitPullRequest.createdBy);
      }

      found = this.hasFilterValue(
        sourceBranchList,
        pr.sourceBranch!.displayName
      );

      if (found === false) {
        sourceBranchList.push(pr.sourceBranch!);
      }

      found = this.hasFilterValue(
        targetBranchList,
        pr.targetBranch!.displayName
      );

      if (found === false) {
        targetBranchList.push(pr.targetBranch!);
      }

      if (
        pr.gitPullRequest.reviewers &&
        pr.gitPullRequest.reviewers.length > 0
      ) {
        pr.gitPullRequest.reviewers.map(r => {
          found = this.hasFilterValue(reviewerList, r.id);

          if (found === false) {
            reviewerList.push(r);
          }

          return r;
        });
      }

      return pr;
    });

    sourceBranchList = sourceBranchList.sort(Data.sortMethod);
    targetBranchList = targetBranchList.sort(Data.sortMethod);
    createdByList = createdByList.sort(Data.sortMethod);
    reviewerList = reviewerList.sort(Data.sortMethod);

    const selectionObjectList = [
      "selectedAuthors",
      "selectedReviewers",
      "selectedSourceBranches",
      "selectedTargetBranches"
    ];
    const selectionFilterObjects = [
      this.selectedAuthors,
      this.selectedReviewers,
      this.selectedSourceBranches,
      this.selectedTargetBranches
    ];
    const selectedItemsObjectList = [
      createdByList,
      reviewerList,
      sourceBranchList,
      targetBranchList
    ];

    selectionObjectList.forEach((objectKey, index) => {
      const filterItemState = this.filter.getFilterItemState(objectKey);

      if (!filterItemState) {
        return;
      }

      const filterStateValueList: string[] = (filterItemState as IFilterItemState)
        .value;

      filterStateValueList.map((item, itemIndex) => {
        const found = this.hasFilterValue(selectedItemsObjectList[index], item);

        if (!found) {
          filterStateValueList.splice(itemIndex, 1);
          selectionFilterObjects[index].clear();
        }

        return found;
      });

      this.filter.setFilterItemState(objectKey, filterItemState);
    });

    this.setState({
      sourceBranchList,
      targetBranchList,
      createdByList,
      reviewerList
    });
  };

  refresh = async () => {
    await this.getAllPullRequests().catch(error => this.handleError(error));
  };

  onHelpDismiss = () => {
    this.isDialogOpen.value = false;
  };

  public render(): JSX.Element {
    const {
      projects,
      repositories,
      createdByList,
      sourceBranchList,
      targetBranchList,
      reviewerList,
      loading,
      errorMessage
    } = this.state;

    if (loading === true) {
      return (
        <div className="absolute-fill flex-column flex-grow flex-center justify-center">
          <Spinner size={SpinnerSize.large} />
          <div>Loading...</div>
        </div>
      );
    }

    return (
      <div className="flex-column">
        <FilterBarHub
          filter={this.filter}
          selectedProjectChanged={this.selectedProjectChanged}
          selectedProject={this.selectedProject}
          projects={projects}
          repositories={repositories}
          selectedRepos={this.selectedRepos}
          sourceBranchList={sourceBranchList}
          selectedSourceBranches={this.selectedSourceBranches}
          targetBranchList={targetBranchList}
          selectedTargetBranches={this.selectedTargetBranches}
          createdByList={createdByList}
          selectedAuthors={this.selectedAuthors}
          reviewerList={reviewerList}
          selectedReviewers={this.selectedReviewers}
          selectedMyApprovalStatuses={this.selectedMyApprovalStatuses}
          selectedAlternateStatusPr={this.selectedAlternateStatusPr} />

        {errorMessage.length > 0 ? (
          <ShowErrorMessage
            errorMessage={errorMessage}
            onDismiss={this.resetErrorMessage}
          />
        ) : null}

        <div className="margin-top-8">
          <br />
          {this.getRenderContent()}
        </div>
      </div>
    );
  }

  resetErrorMessage() {
    this.setState({
      errorMessage: ""
    });
  }

  async selectedProjectChanged (
    event: React.SyntheticEvent<HTMLElement, Event>,
    item: IListBoxItem<TeamProjectReference | ProjectInfo>
  ) {
    const { projects } = this.state;
    const projectIndex = projects.findIndex(p => {
      return p.id === item.id;
    });

    await this.getRepositories(projects[projectIndex]);
    this.refresh();
  }

  getRenderContent() {
    const { pullRequestCount } = this.state;
    if (pullRequestCount === 0) {
      return (
        <ZeroData
          primaryText="Yeah! No Pull Request to be reviewed. Well done!"
          secondaryText={
            <span>
              Enjoy your free time to code and raise PRs for your team/project!
            </span>
          }
          imageAltText="No PRs!"
          imagePath={require("../images/emptyPRList.png")}
          actionText="Refresh"
          actionType={getZeroDataActionTypeValue("ctaButton")}
          onActionClick={this.refresh}
        />
      );
    } else {
      return (
        <Card
          className="flex-grow bolt-table-card"
          contentProps={{ contentPadding: false }}
          titleProps={{
            text: `Pull Requests (${this.pullRequestItemProvider.value.length})`
          }}
          headerCommandBarItems={this.listHeaderColumns}
        >
          <React.Fragment>
            <Table<Data.PullRequestModel>
              columns={Data.columns}
              itemProvider={this.pullRequestItemProvider}
              showLines={true}
              selection={this.prRowSelecion}
              singleClickActivation={true}
              role="table"
            />
          </React.Fragment>

          <Observer isDialogOpen={this.isDialogOpen}>
            {(props: { isDialogOpen: boolean }) => {
              return props.isDialogOpen ? (
                <Dialog
                  titleProps={{ text: "Help" }}
                  footerButtonProps={[
                    {
                      text: "Close",
                      onClick: this.onHelpDismiss
                    }
                  ]}
                  onDismiss={this.onHelpDismiss}
                >
                  <strong>Statuses legend:</strong>
                  <div className="flex-column" style={{ minWidth: "120px" }}>
                    <div className="body-m secondary-text">
                      <Status
                        {...Statuses.Waiting}
                        key="waiting"
                        size={getStatusSizeValue("m")}
                        className="status-example flex-self-center "
                      />
                      &nbsp;No one has voted yet.
                    </div>
                    <div className="body-m secondary-text">
                      <Status
                        {...Statuses.Running}
                        key="running"
                        size={getStatusSizeValue("m")}
                        className="status-example flex-self-center "
                      />
                      &nbsp;Review in progress, not all required reviwers have
                      approved.
                    </div>
                    <div className="body-m secondary-text">
                      <Status
                        {...Statuses.Success}
                        key="success"
                        size={getStatusSizeValue("m")}
                        className="status-example flex-self-center "
                      />
                      &nbsp;Ready for completion.
                    </div>
                    <div className="body-m secondary-text">
                      <Status
                        {...Statuses.Warning}
                        key="warning"
                        size={getStatusSizeValue("m")}
                        className="status-example flex-self-center "
                      />
                      &nbsp;At least one reviewer is Waiting For Author.
                    </div>
                    <div className="body-m secondary-text">
                      <Status
                        {...Statuses.Failed}
                        key="failed"
                        size={getStatusSizeValue("m")}
                        className="status-example flex-self-center "
                      />
                      &nbsp;One or more members has rejected.
                    </div>
                  </div>
                </Dialog>
              ) : null;
            }}
          </Observer>
        </Card>
      );
    }
  }

  private listHeaderColumns: IHeaderCommandBarItem[] = [
    {
      id: "refresh",
      text: "Refresh",
      isPrimary: true,
      onActivate: () => {
        this.refresh();
      },
      iconProps: {
        iconName: "fabric-icon ms-Icon--Refresh"
      }
    },
    {
      id: "help",
      text: "Help",
      isPrimary: true,
      onActivate: () => {
        this.isDialogOpen.value = true;
      },
      iconProps: {
        iconName: "fabric-icon ms-Icon--Help"
      }
    }
  ];
}

function ShowErrorMessage(props: any) {
  return (
    <div className="flex-grow margin-top-8">
      <br />
      <MessageCard
        className="flex-self-stretch"
        severity={"Error" as MessageCardSeverity}
        onDismiss={props.onDismiss}
      >
        {props.errorMessage}
      </MessageCard>
    </div>
  );
}
