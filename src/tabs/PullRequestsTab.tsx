import "./PullRequestTab.scss";

import * as React from "react";
//import { produce } from "immer";

import {
  AZDEVOPS_CLOUD_API_ORGANIZATION,
  AZDEVOPS_API_ORGANIZATION_RESOURCE,
  AZDEVOPS_CLOUD_API_ORGANIZATION_OLD,
  getCommonServiceIdsValue,
  getZeroDataActionTypeValue,
  getStatusSizeValue,
  STORED_CACHE_KEY_PREFIX,
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
import { Table } from "azure-devops-ui/Table";
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
import {
  FilterBarHub,
  myApprovalStatuses,
  alternateStatusPr,
} from "../components/FilterBarHub";
import { hasPullRequestFailure } from "../models/constants";
import { ContentSize } from "azure-devops-ui/Callout";

export class PullRequestsTab extends React.Component<
  {},
  Data.IPullRequestsTabState
> {
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
      tagList: [],
      loading: true,
      errorMessage: "",
      pullRequestCount: 0,
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
      pullRequests: [],
    });
  }

  clearSavedFilter() {
    localStorage.clear();
    this.filter.reset();
    this.refresh();
  }

  private async initializePage() {
    this.getOrganizationBaseUrl()
      .then(async () => {
        const projectService = await DevOps.getService<IProjectPageService>(
          getCommonServiceIdsValue("ProjectPageService")
        );

        const currentProject = await projectService.getProject();

        this.getTeamProjects()
          .then((projects) => {
            this.setState({
              projects,
            });

            this.selectedProject.select(
              projects.findIndex((p) => {
                return p.id === currentProject!.id;
              })
            );

            this.getRepositories(currentProject!)
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

    const repos = (
      await this.gitClient.getRepositories(project.name, true)
    ).sort((a: GitRepository, b: GitRepository) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });

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
    this.pullRequestItemProvider.splice(0, this.pullRequestItemProvider.length);
    this.pullRequestItemProvider.push(...newList);
    this.setState({
      pullRequestCount: newList.length,
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
    const self = this;
    this.setState({ loading: true });
    const { repositories, pullRequests } = this.state;

    let newPullRequestList = Object.assign([], pullRequests);

    // clear the pull request list to be reloaded...
    newPullRequestList.splice(0, newPullRequestList.length);

    this.pullRequestItemProvider = new ObservableArray<
      | PullRequestModel.PullRequestModel
      | IReadonlyObservableValue<PullRequestModel.PullRequestModel | undefined>
    >([]);

    Promise.all(
      repositories.map(async (r) => {
        const criteria = Object.assign({}, Data.pullRequestCriteria);

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
              (_updatedPr) => {
                let { tagList } = self.state;
                _updatedPr.labels
                  .filter((t) => !this.hasFilterValue(tagList, t.id))
                  .map((t) => {
                    tagList.push(t);
                    tagList = tagList.sort(Data.sortMethod);

                    return tagList;
                  });

                setTimeout(() => {
                  self.filterPullRequests();
                }, 10);
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

          this.loadLists();
        }
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
    const {
      projects,
      pullRequests,
      repositories,
      sourceBranchList,
      targetBranchList,
      createdByList,
      reviewerList,
      tagList,
    } = this.state;

    const projectFilter = this.getFilterData<string[]>("selectedProject");
    const repositoriesFilter = this.getFilterData<string[]>("selectedRepos");
    const filterPullRequestTitle = this.getFilterData<string>(
      "pullRequestTitle"
    );
    const sourceBranchFilter = this.getFilterData<string[]>(
      "selectedSourceBranches"
    );
    const targetBranchFilter = this.getFilterData<string[]>(
      "selectedTargetBranches"
    );
    const createdByFilter = this.getFilterData<string[]>("selectedAuthors");
    const reviewersFilter = this.getFilterData<string[]>("selectedReviewers");
    const myApprovalStatusFilter = this.getFilterData<string[]>(
      "selectedMyApprovalStatuses"
    );
    const selectedAlternateStatusPrFilter = this.getFilterData<string[]>(
      "selectedAlternateStatusPr"
    );
    const selectedTagsFilter = this.getFilterData<string[]>("selectedTags");

    this.loadSavedFilterValues<string | undefined, TeamProjectReference>({
      filterItems: projectFilter,
      objectList: projects,
      selectedItems: this.selectedProject,
      getObjectPredicate: (filterItem) => {
        return filterItem.id;
      },
    });
    this.loadSavedFilterValues<string | undefined, GitRepository>({
      filterItems: repositoriesFilter,
      objectList: repositories,
      selectedItems: this.selectedRepos,
      getObjectPredicate: (filterItem) => {
        return filterItem.id;
      },
    });
    this.loadSavedFilterValues<string | undefined, Data.BranchDropDownItem>({
      filterItems: sourceBranchFilter,
      objectList: sourceBranchList,
      selectedItems: this.selectedSourceBranches,
      getObjectPredicate: (filterItem) => {
        return filterItem.displayName;
      },
    });
    this.loadSavedFilterValues<string | undefined, Data.BranchDropDownItem>({
      filterItems: targetBranchFilter,
      objectList: targetBranchList,
      selectedItems: this.selectedTargetBranches,
      getObjectPredicate: (filterItem) => {
        return filterItem.displayName;
      },
    });
    this.loadSavedFilterValues<string | undefined, IdentityRef>({
      filterItems: createdByFilter,
      objectList: createdByList,
      selectedItems: this.selectedAuthors,
      getObjectPredicate: (filterItem) => {
        return filterItem.id;
      },
    });
    this.loadSavedFilterValues<string | undefined, IdentityRefWithVote>({
      filterItems: reviewersFilter,
      objectList: reviewerList,
      selectedItems: this.selectedReviewers,
      getObjectPredicate: (filterItem) => {
        return filterItem.id;
      },
    });
    this.loadSavedFilterValues<string | undefined, Data.IKeyValueData>({
      filterItems: myApprovalStatusFilter,
      objectList: myApprovalStatuses,
      selectedItems: this.selectedMyApprovalStatuses,
      getObjectPredicate: (filterItem) => {
        return filterItem.id;
      },
    });
    this.loadSavedFilterValues<string | undefined, Data.IKeyValueData>({
      filterItems: selectedAlternateStatusPrFilter,
      objectList: alternateStatusPr,
      selectedItems: this.selectedMyApprovalStatuses,
      getObjectPredicate: (filterItem) => {
        return filterItem.id;
      },
    });
    this.loadSavedFilterValues<string | undefined, WebApiTagDefinition>({
      filterItems: selectedTagsFilter,
      objectList: tagList,
      selectedItems: this.selectedTags,
      getObjectPredicate: (filterItem) => {
        return filterItem.id;
      },
    });

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
            // tslint:disable-next-line:triple-equals
            (pr.gitPullRequest.isDraft === true && item === "0") ||
            // tslint:disable-next-line:triple-equals
            (hasPullRequestFailure(pr) === true && item === "1") ||
            // tslint:disable-next-line:triple-equals
            (pr.isAutoCompleteSet === true && item === "2")
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

  private getFilterData<T>(key: string): T | undefined {
    let filterData = this.filter.getFilterItemValue<T>(key);

    if (filterData === undefined) {
      const cachedData = this.getFilterFromCache<T>(key);
      if (cachedData !== null) {
        filterData = cachedData;
      }
    } else {
      this.storeFilterData(key, filterData);
    }

    return filterData;
  }

  private storeFilterData(key: string, data: any): void {
    localStorage.setItem(
      `${STORED_CACHE_KEY_PREFIX}${key}`,
      JSON.stringify(data)
    );
  }

  private getFilterFromCache<T>(key: string): T | undefined {
    const dataInStorage = localStorage.getItem(
      `${STORED_CACHE_KEY_PREFIX}${key}`
    );
    if (dataInStorage !== null) {
      return JSON.parse(dataInStorage) as T;
    }

    return undefined;
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
          filterPullRequests={() => {
            this.clearSavedFilter();
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
    const projectIndex = projects.findIndex((p) => {
      return p.id === item.id;
    });

    await this.getRepositories(projects[projectIndex]);
    this.refresh();
  }

  getRenderContent() {
    const { pullRequestCount, pullRequests } = this.state;
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
          titleProps={{
            text: `Pull Requests (${this.pullRequestItemProvider.value.length})`,
          }}
          headerCommandBarItems={this.listHeaderColumns}
        >
          <React.Fragment>
            <Table<PullRequestModel.PullRequestModel>
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
                  <div
                    className="flex-column"
                    style={{ minWidth: "120px" }}
                  >
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

  private listHeaderColumns: IHeaderCommandBarItem[] = [
    {
      id: "refresh",
      text: "Refresh",
      isPrimary: true,
      onActivate: () => {
        this.refresh();
      },
      iconProps: {
        iconName: "fabric-icon ms-Icon--Refresh",
      },
    },
    {
      id: "clearSavedFilters",
      text: "Clear Saved Filters",
      className: "clear-filter-button",
      isPrimary: true,
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
