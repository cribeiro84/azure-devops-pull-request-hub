import "./PullRequestTab.scss";

import * as React from "react";

import {
  AZDEVOPS_CLOUD_API_ORGANIZATION,
  AZDEVOPS_API_ORGANIZATION_RESOURCE,
  AZDEVOPS_CLOUD_API_ORGANIZATION_OLD,
  getCommonServiceIdsValue,
  getZeroDataActionTypeValue,
  getStatusSizeValue,
  FILTER_STORE_KEY_NAME,
} from "../models/constants";

import { Spinner, SpinnerSize } from "office-ui-fabric-react";

// Custom
import * as Data from "./PulRequestsTabData";
import * as PullRequestModel from "../models/PullRequestModel";

// Azure DevOps SDK
import * as DevOps from "azure-devops-extension-sdk";

// Azure DevOps API
import { IProjectPageService, getClient } from "azure-devops-extension-api";
import { CoreRestClient } from "azure-devops-extension-api/Core/CoreClient";
import { GitRestClient } from "azure-devops-extension-api/Git/GitClient";
import {
  IdentityRefWithVote,
  GitRepository,
  PullRequestStatus,
} from "azure-devops-extension-api/Git/Git";

// Azure DevOps UI
import { Toast } from "azure-devops-ui/Toast";
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";
import { ListSelection } from "azure-devops-ui/List";
import { Observer } from "azure-devops-ui/Observer";
import { Dialog } from "azure-devops-ui/Dialog";
import {
  Filter,
  FILTER_CHANGE_EVENT,
  IFilterItemState,
} from "azure-devops-ui/Utilities/Filter";
import {
  DropdownMultiSelection,
  DropdownSelection,
} from "azure-devops-ui/Utilities/DropdownSelection";
import {
  ObservableArray,
  IReadonlyObservableValue,
} from "azure-devops-ui/Core/Observable";
import { Card } from "azure-devops-ui/Card";
import { Status, Statuses } from "azure-devops-ui/Status";
import {
  Table,
  ColumnSorting,
  SortOrder,
  sortItems,
} from "azure-devops-ui/Table";
import { ZeroData } from "azure-devops-ui/ZeroData";
import { IdentityRef } from "azure-devops-extension-api/WebApi/WebApi";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { IProjectInfo } from "azure-devops-extension-api/Common/CommonServices";
import {
  TeamProjectReference,
  ProjectInfo,
  WebApiTagDefinition,
} from "azure-devops-extension-api/Core/Core";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { FilterBarHub } from "../components/FilterBarHub";
import { hasPullRequestFailure } from "../models/constants";
import { ContentSize } from "azure-devops-ui/Callout";
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";

export interface IPullRequestTabProps {
  prType: PullRequestStatus;
  onCountChange: (count: number) => void;
}

export class PullRequestsTab extends React.Component<
  IPullRequestTabProps,
  Data.IPullRequestsTabState
> {
  private toastRef: React.RefObject<Toast> = React.createRef<Toast>();
  private baseUrl: string = "";
  private prRowSelecion = new ListSelection({
    selectOnFocus: true,
    multiSelect: false,
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
  private selectedTags = new DropdownMultiSelection();
  private pullRequestItemProvider = new ObservableArray<
    | PullRequestModel.PullRequestModel
    | IReadonlyObservableValue<PullRequestModel.PullRequestModel | undefined>
  >();

  private readonly gitClient: GitRestClient;
  private readonly coreClient: CoreRestClient;

  constructor(props: IPullRequestTabProps) {
    super(props);

    console.log(props.prType.toString());

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
      tagList: [],
      loading: true,
      errorMessage: "",
      pullRequestCount: 0,
      showToastMessage: false,
      toastMessageToShow: "",
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
    this.unloadFilter();
  }

  private unloadFilter() {
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
      pullRequests: [],
    });
  }

  private showToastMessage(message: string) {
    this.setState({ showToastMessage: true, toastMessageToShow: message });

    setTimeout(() => {
      this.toastRef.current!.fadeOut().promise.then(() => {
        this.setState({ showToastMessage: false, toastMessageToShow: message });
      });
    }, 5000);
  }

  private getCurrentFilterNameKey(projectId?: string): string {
    const { currentProject } = this.state;
    const currentProjectId =
      projectId !== undefined ? projectId : currentProject!.id;
    const filterKey = `${currentProjectId}_${FILTER_STORE_KEY_NAME}`;

    return filterKey;
  }

  private saveCurrentFilters() {
    const { currentProject } = this.state;
    const filterKey = this.getCurrentFilterNameKey();
    const currentFilter = this.filter.getState();
    localStorage.setItem(FILTER_STORE_KEY_NAME, currentProject!.id);
    localStorage.setItem(filterKey, JSON.stringify(currentFilter));
    this.showToastMessage(`Current selected filters have been saved - ${
      currentProject!.name
    }.`);
  }

  private clearSavedFilter() {
    const { currentProject } = this.state;
    const filterKey = this.getCurrentFilterNameKey();
    this.showToastMessage(
      `Saved filters have been removed of selected project - ${
        currentProject!.name
      }.`
    );
    localStorage.removeItem(FILTER_STORE_KEY_NAME);
    localStorage.removeItem(filterKey);
    this.filter.reset();
    this.refresh();
  }

  private loadSavedFilter(storedSavedCurrentProjectId: string | null): void {
    if (storedSavedCurrentProjectId != null) {
      const saveFilterKeyName = this.getCurrentFilterNameKey(
        storedSavedCurrentProjectId
      );
      const storedSavedFilter = localStorage.getItem(saveFilterKeyName);

      if (storedSavedFilter && storedSavedFilter.length > 0) {
        const savedFilterState = JSON.parse(storedSavedFilter);
        this.filter.setState(savedFilterState);
      }
    }
  }


  private async initializePage() {
    const self = this;
    this.getOrganizationBaseUrl()
      .then(async () => {
        const projectService = await DevOps.getService<IProjectPageService>(
          getCommonServiceIdsValue("ProjectPageService")
        );

        const currentProjectId = localStorage.getItem(
          FILTER_STORE_KEY_NAME
        );

        this.loadSavedFilter(currentProjectId);

        this.getTeamProjects()
          .then(async (projects) => {
            this.setState({
              projects,
            });

            const currentProject =
              currentProjectId && currentProjectId !== null && currentProjectId.length > 0
                ? currentProjectId
                : (await projectService.getProject())!.id;

            const projectIndex = self.changeProjectSelectionTo(currentProject);

            this.getRepositories(projects[projectIndex])
              .then(() => {
                this.getAllPullRequests().catch((error) =>
                  this.handleError(error)
                );
              })
              .catch((error) => {
                this.handleError(error);
              });
          })
          .catch((error) => {
            this.handleError(error);
          });
      })
      .catch((error) => {
        this.handleError(error);
      });
  }

  private handleError(error: any): void {
    console.log(error);
    this.setState({
      loading: false,
      errorMessage: "There was an error during the extension load: " + error,
    });
  }

  private async getRepositories(
    project: IProjectInfo | TeamProjectReference
  ): Promise<GitRepository[]> {
    this.setState({
      currentProject: project,
    });

    this.loadSavedFilter(project.id);

    const repos = (
      await this.gitClient.getRepositories(project.name, true)
    ).sort(Data.sortMethod);

    this.setState({
      repositories: repos,
    });

    return repos;
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
        .then((res) => res.json())
        .then((result) => {
          this.baseUrl = result.locationUrl;
        })
        .catch((error) => {
          this.handleError(
            "Unable to fetch Organization's URL. Details: " + error
          );
        });
    }

    console.log("Set base URL: " + this.baseUrl);
  }

  private reloadPullRequestItemProvider(
    newList: PullRequestModel.PullRequestModel[]
  ) {
    this.pullRequestItemProvider.splice(
      0,
      this.pullRequestItemProvider.length,
      ...newList
    );
    this.setState({
      pullRequestCount: newList.length,
    });

    this.props.onCountChange(newList.length);
  }

  private async getTeamProjects(): Promise<TeamProjectReference[]> {
    const projects = (await this.coreClient.getProjects()).sort(
      Data.sortMethod
    );
    return projects;
  }

  private async getAllPullRequests() {
    const self = this;
    this.setState({ loading: true });
    const { currentProject, repositories, pullRequests } = this.state;

    this.changeProjectSelectionTo(currentProject!.id);

    let newPullRequestList = Object.assign([], pullRequests);

    // clear the pull request list to be reloaded...
    newPullRequestList.splice(0, newPullRequestList.length);

    this.pullRequestItemProvider = new ObservableArray<
      | PullRequestModel.PullRequestModel
      | IReadonlyObservableValue<PullRequestModel.PullRequestModel | undefined>
    >([]);

    Promise.all(
      repositories.map(async (r) => {
        let criteria = Object.assign({}, Data.pullRequestCriteria);
        criteria.status = this.props.prType;

        const loadedPullRequests = await this.gitClient.getPullRequests(
          r.id,
          criteria
        );

        return loadedPullRequests;
      })
    )
      .then((loadedPullRequests) => {
        loadedPullRequests.map((pr) => {
          if (!pr || pr.length === 0) {
            return pr;
          }

          newPullRequestList.push(
            ...PullRequestModel.PullRequestModel.getModels(
              pr,
              this.state.currentProject!.name,
              this.baseUrl,
              (updatedPr) => {
                let { tagList } = self.state;
                updatedPr.labels
                  .filter((t) => !this.hasFilterValue(tagList, t.id))
                  .map((t) => {
                    tagList.push(t);
                    tagList = tagList.sort(Data.sortMethod);

                    return tagList;
                  });

                this.setState({
                  tagList,
                });

                //this.pullRequestItemProvider.splice(0, this.pullRequestItemProvider.length, ...pullRequests);
                this.filterPullRequests();
              }
            )
          );
          return pr;
        });
      })
      .catch((error) => {
        this.handleError(error);
      })
      .finally(() => {
        if (newPullRequestList.length > 0) {
          newPullRequestList = newPullRequestList.sort(
            (
              a: PullRequestModel.PullRequestModel,
              b: PullRequestModel.PullRequestModel
            ) => {
              return (
                a.gitPullRequest.creationDate.getTime() -
                b.gitPullRequest.creationDate.getTime()
              );
            }
          );

          this.setState({
            pullRequests: newPullRequestList,
          });
        } else {
          this.setState({
            pullRequests: [],
          });
        }

        this.loadLists();
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

    const repositoriesFilter = this.filter.getFilterItemValue<string[]>(
      "selectedRepos"
    );
    const filterPullRequestTitle = this.filter.getFilterItemValue<string>(
      "pullRequestTitle"
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
    const selectedAlternateStatusPrFilter = this.filter.getFilterItemValue<
      string[]
    >("selectedAlternateStatusPr");
    const selectedTagsFilter = this.filter.getFilterItemValue<string[]>(
      "selectedTags"
    );

    let filteredPullRequest = pullRequests;

    if (filterPullRequestTitle && filterPullRequestTitle.length > 0) {
      filteredPullRequest = pullRequests.filter((pr) => {
        const found =
          pr
            .title!.toLocaleLowerCase()
            .indexOf(filterPullRequestTitle.toLocaleLowerCase()) > -1;
        return found;
      });
    }

    if (repositoriesFilter && repositoriesFilter.length > 0) {
      filteredPullRequest = filteredPullRequest.filter((pr) => {
        const found = repositoriesFilter!.some((r) => {
          return pr.gitPullRequest.repository.id === r;
        });

        return found;
      });
    }

    if (sourceBranchFilter && sourceBranchFilter.length > 0) {
      filteredPullRequest = filteredPullRequest.filter((pr) => {
        const found = sourceBranchFilter.some((r) => {
          return pr.sourceBranch!.displayName === r;
        });

        return found;
      });
    }

    if (targetBranchFilter && targetBranchFilter.length > 0) {
      filteredPullRequest = filteredPullRequest.filter((pr) => {
        const found = targetBranchFilter.some((r) => {
          return pr.targetBranch!.displayName === r;
        });

        return found;
      });
    }

    if (createdByFilter && createdByFilter.length > 0) {
      filteredPullRequest = filteredPullRequest.filter((pr) => {
        const found = createdByFilter.some((r) => {
          return pr.gitPullRequest.createdBy.id === r;
        });

        return found;
      });
    }

    if (reviewersFilter && reviewersFilter.length > 0) {
      filteredPullRequest = filteredPullRequest.filter((pr) => {
        const found = reviewersFilter.some((r) => {
          return pr.gitPullRequest.reviewers.some((rv) => {
            return rv.id === r;
          });
        });
        return found;
      });
    }

    if (myApprovalStatusFilter && myApprovalStatusFilter.length > 0) {
      filteredPullRequest = filteredPullRequest.filter((pr) => {
        const found = myApprovalStatusFilter.some((vote) => {
          return (
            pr.myApprovalStatus ===
            (parseInt(vote, 10) as Data.ReviewerVoteOption)
          );
        });
        return found;
      });
    }

    if (
      selectedAlternateStatusPrFilter &&
      selectedAlternateStatusPrFilter.length > 0
    ) {
      filteredPullRequest = filteredPullRequest.filter((pr) => {
        const found = selectedAlternateStatusPrFilter.some((item) => {
          return (
            (pr.gitPullRequest.isDraft === true && item === Data.AlternateStatusPr.IsDraft) ||
            (hasPullRequestFailure(pr) === true && item === Data.AlternateStatusPr.Conflicts) ||
            (pr.isAutoCompleteSet === true && item === Data.AlternateStatusPr.AutoComplete) ||
            (pr.gitPullRequest.isDraft === false && item === Data.AlternateStatusPr.NotIsDraft) ||
            (hasPullRequestFailure(pr) === false && item === Data.AlternateStatusPr.NotConflicts) ||
            (pr.isAutoCompleteSet === false && item === Data.AlternateStatusPr.NotAutoComplete)
          );
        });
        return found;
      });
    }

    if (selectedTagsFilter && selectedTagsFilter.length > 0) {
      filteredPullRequest = filteredPullRequest.filter((pr) => {
        const found = selectedTagsFilter.some((item) => {
          return this.hasFilterValue(pr.labels, item);
        });
        return found;
      });
    }

    this.reloadPullRequestItemProvider(filteredPullRequest);
  }

  loadSavedFilterValues<T extends string | number | undefined, Y extends any>({
    filterItems,
    objectList,
    selectedItems,
    getObjectPredicate,
  }: {
    filterItems: T[] | undefined;
    objectList: any[];
    selectedItems: DropdownMultiSelection | DropdownSelection;
    getObjectPredicate: (filterItem: Y) => T;
  }) {
    if (
      filterItems &&
      filterItems.length > 0 &&
      selectedItems.selectedCount === 0
    ) {
      filterItems.forEach((r) => {
        var foundIndex = objectList.findIndex((v) => {
          return getObjectPredicate(v) === r;
        });

        if (foundIndex >= 0) {
          selectedItems.select(foundIndex);
        }

        return r;
      });
    }
  }

  private hasFilterValue(
    list: Array<
      | Data.BranchDropDownItem
      | IdentityRef
      | IdentityRefWithVote
      | WebApiTagDefinition
    >,
    value: any
  ): boolean {
    return list.some((item) => {
      if (item.hasOwnProperty("id")) {
        const convertedValue = item as IdentityRef | WebApiTagDefinition;
        return convertedValue.id.localeCompare(value) === 0;
      } else if (item.hasOwnProperty("branchName")) {
        const convertedValue = item as Data.BranchDropDownItem;
        return convertedValue.displayName.localeCompare(value) === 0;
      } else {
        return item === value;
      }
    });
  }

  private populateFilterBarFields = (
    pullRequests: PullRequestModel.PullRequestModel[]
  ) => {
    let {
      sourceBranchList,
      targetBranchList,
      createdByList,
      reviewerList,
    } = this.state;

    sourceBranchList = [];
    targetBranchList = [];
    createdByList = [];
    reviewerList = [];

    pullRequests.map((pr) => {
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
        pr.gitPullRequest.reviewers.map((r) => {
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
      "selectedTargetBranches",
    ];
    const selectionFilterObjects = [
      this.selectedAuthors,
      this.selectedReviewers,
      this.selectedSourceBranches,
      this.selectedTargetBranches,
    ];
    const selectedItemsObjectList = [
      createdByList,
      reviewerList,
      sourceBranchList,
      targetBranchList,
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
      reviewerList,
    });
  };

  refresh = async () => {
    await this.getAllPullRequests().catch((error) => this.handleError(error));
  };

  onHelpDismiss = () => {
    this.isDialogOpen.value = false;
  };

  public render(): JSX.Element {
    const {
      currentProject,
      pullRequests,
      projects,
      repositories,
      createdByList,
      sourceBranchList,
      targetBranchList,
      reviewerList,
      loading,
      errorMessage,
      tagList,
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
          currentProject={currentProject!}
          filterPullRequests={() => {
            this.refresh();
          }}
          pullRequests={pullRequests}
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
          selectedAlternateStatusPr={this.selectedAlternateStatusPr}
          tagList={tagList}
          selectedTags={this.selectedTags}
        />

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
      errorMessage: "",
    });
  }

  async selectedProjectChanged(
    _event: React.SyntheticEvent<HTMLElement, Event>,
    item: IListBoxItem<TeamProjectReference | ProjectInfo>
  ) {
    const { projects } = this.state;
    this.filter.reset();
    const projectIndex = this.changeProjectSelectionTo(item.id);

    this.getRepositories(projects[projectIndex]).then(() => {
      this.refresh();
    });
  }

  changeProjectSelectionTo(id: string): number {
    const { projects } = this.state;
    const projectIndex = projects.findIndex((p) => {
      return p.id === id;
    });

    this.selectedProject.select(projectIndex);

    return projectIndex;
  }

  getRenderContent() {
    const {
      pullRequestCount,
      pullRequests,
      showToastMessage,
      toastMessageToShow,
    } = this.state;

    // Create the sorting behavior (delegate that is called when a column is sorted).
    const sortingBehavior = new ColumnSorting<
      PullRequestModel.PullRequestModel
    >(
      (
        columnIndex: number,
        proposedSortOrder: SortOrder,
        event: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLElement>
      ) => {
        this.pullRequestItemProvider.splice(
          0,
          this.pullRequestItemProvider.length,
          ...sortItems<PullRequestModel.PullRequestModel>(
            columnIndex,
            proposedSortOrder,
            this.sortFunctions,
            Data.columns,
            pullRequests
          )
        );
      }
    );

    if (
      pullRequestCount === 0 &&
      pullRequests.filter((pr) => pr.isStillLoading() === true).length === 0
    ) {
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
          headerCommandBarItems={this.listHeaderColumns}
        >
          {showToastMessage && (
            <Toast ref={this.toastRef} message={toastMessageToShow} />
          )}
          <React.Fragment>
            <Table<PullRequestModel.PullRequestModel>
              behaviors={[sortingBehavior]}
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
                  titleProps={{ text: "Help!" }}
                  contentSize={ContentSize.Auto}
                  footerButtonProps={[
                    {
                      text: "Close",
                      onClick: this.onHelpDismiss,
                    },
                  ]}
                  onDismiss={this.onHelpDismiss}
                >
                  <strong>Statuses legend:</strong>
                  <div className="flex-column" style={{ minWidth: "120px" }}>
                    <div className="flex-row body-m secondary-text margin-top-8">
                      <div className="flex-column" style={{ width: "40px" }}>
                        <Status
                          {...Statuses.Waiting}
                          key="waiting"
                          size={getStatusSizeValue("m")}
                          className="status-example flex-self-center "
                        />
                      </div>
                      <div className="flex-column">
                        &nbsp;No one has voted yet.
                      </div>
                    </div>
                    <div className="flex-row body-m secondary-text margin-top-8">
                      <div className="flex-column" style={{ width: "40px" }}>
                        <Status
                          {...Statuses.Running}
                          key="running"
                          size={getStatusSizeValue("m")}
                          className="status-example flex-self-center "
                        />
                      </div>
                      <div className="flex-column">
                        &nbsp;Review in progress, not all required reviwers have
                        approved or policies are passed.
                      </div>
                    </div>
                    <div className="flex-row body-m secondary-text margin-top-8">
                      <div className="flex-column" style={{ width: "40px" }}>
                        <Status
                          {...Statuses.Success}
                          key="success"
                          size={getStatusSizeValue("m")}
                          className="status-example flex-self-center "
                        />
                      </div>
                      <div className="flex-column">
                        &nbsp;Ready for completion.
                      </div>
                    </div>
                    <div className="flex-row body-m secondary-text margin-top-8">
                      <div className="flex-column" style={{ width: "40px" }}>
                        <Status
                          {...Statuses.Warning}
                          key="warning"
                          size={getStatusSizeValue("m")}
                          className="status-example flex-self-center "
                        />
                      </div>
                      <div className="flex-column">
                        &nbsp;At least one reviewer is Waiting For Author.
                      </div>
                    </div>
                    <div className="flex-row body-m secondary-text margin-top-8">
                      <div className="flex-column" style={{ width: "40px" }}>
                        <Status
                          {...Statuses.Failed}
                          key="failed"
                          size={getStatusSizeValue("m")}
                          className="status-example flex-self-center "
                        />
                      </div>
                      <div className="flex-column">
                        &nbsp;One or more members has rejected or there is a
                        failure in some policy or status.
                      </div>
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

  sortFunctions = [
    null, //Status column
    null, // Title column
    // Sort on When column
    (
      item1: PullRequestModel.PullRequestModel,
      item2: PullRequestModel.PullRequestModel
    ): number => {
      return (
        item2.gitPullRequest.creationDate.getTime() -
        item1.gitPullRequest.creationDate.getTime()
      );
    },

    null, // Details column
    null, // Reviewers column
  ];

  private listHeaderColumns: IHeaderCommandBarItem[] = [
    {
      id: "refresh",
      text: "",
      isPrimary: true,
      tooltipProps: { text: "Refresh the list" },
      onActivate: () => {
        this.refresh();
      },
      iconProps: {
        iconName: "fabric-icon ms-Icon--Refresh",
      },
    },
    {
      id: "saveCurrentFilter",
      text: "",
      className: "save-filter-button",
      isPrimary: true,
      tooltipProps: { text: "Save Current Filters" },
      onActivate: () => {
        this.saveCurrentFilters();
      },
      iconProps: {
        iconName: "fabric-icon ms-Icon--Save",
      },
    },
    {
      id: "clearSavedFilters",
      text: "",
      className: "clear-filter-button",
      isPrimary: true,
      tooltipProps: { text: "Clear Saved Filters" },
      onActivate: () => {
        this.clearSavedFilter();
      },
      iconProps: {
        iconName: "fabric-icon ms-Icon--Clear",
      },
    },
    {
      id: "help",
      text: "Help",
      isPrimary: false,
      tooltipProps: { text: "Help" },
      onActivate: () => {
        this.isDialogOpen.value = true;
      },
      iconProps: {
        iconName: "fabric-icon ms-Icon--Help",
      },
    },
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
