import * as React from "react";

import { Spinner, SpinnerSize } from "office-ui-fabric-react";

//Custom
import * as Data from "./PulRequestsTabData";

//Azure DevOps SDK
import * as DevOps from "azure-devops-extension-sdk";

//Azure DevOps API
import {
  CommonServiceIds,
  IProjectPageService,
  getClient
} from "azure-devops-extension-api";
import { GitRestClient } from "azure-devops-extension-api/Git/GitClient";
import {
  IdentityRefWithVote,
  PullRequestAsyncStatus
} from "azure-devops-extension-api/Git/Git";

//Azure DevOps UI
import { VssPersona } from "azure-devops-ui/VssPersona";
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";
import { FilterBar } from "azure-devops-ui/FilterBar";
import { KeywordFilterBarItem } from "azure-devops-ui/TextFilterBarItem";
import { Filter, FILTER_CHANGE_EVENT } from "azure-devops-ui/Utilities/Filter";
import { DropdownMultiSelection, DropdownSelection } from "azure-devops-ui/Utilities/DropdownSelection";
import { DropdownFilterBarItem } from "azure-devops-ui/Dropdown";
import {
  ObservableArray,
  IReadonlyObservableValue
} from "azure-devops-ui/Core/Observable";
import { Card } from "azure-devops-ui/Card";
import { Icon, IIconProps } from "azure-devops-ui/Icon";
import { Link } from "azure-devops-ui/Link";
import { Status, StatusSize, Statuses } from "azure-devops-ui/Status";
import { ITableColumn, Table, TwoLineTableCell } from "azure-devops-ui/Table";
import { Ago } from "azure-devops-ui/Ago";
import { Duration } from "azure-devops-ui/Duration";
import { Tooltip } from "azure-devops-ui/TooltipEx";
import { css } from "azure-devops-ui/Util";
import { Pill, PillSize } from "azure-devops-ui/Pill";
import { PillGroup } from "azure-devops-ui/PillGroup";
import { IColor } from "azure-devops-ui/Utilities/Color";

export class PullRequestsTab extends React.Component<
  {},
  Data.IPullRequestsTabState
> {
  private filter: Filter;
  private selectedAuthors = new DropdownMultiSelection();
  private selectedRepos = new DropdownMultiSelection();
  private selectedSourceBranches = new DropdownMultiSelection();
  private selectedTargetBranches = new DropdownMultiSelection();
  private selectedReviewers = new DropdownMultiSelection();
  private selectedMyApprovalStatuses = new DropdownMultiSelection();
  private pullRequestItemProvider = new ObservableArray<
    | Data.PullRequestModel
    | IReadonlyObservableValue<Data.PullRequestModel | undefined>
  >();
  private readonly gitClient: GitRestClient;

  constructor(props: {}) {
    super(props);

    this.gitClient = getClient(GitRestClient);
    this.filter = new Filter();

    this.setupFilter();

    this.state = {
      pullRequests: [],
      repositories: [],
      currentProject: { id: "", name: "" },
      creadtedByList: [],
      sourceBranchList: [],
      targetBranchList: [],
      reviewerList: []
    };
  }

  public async componentWillMount() {
    DevOps.init();

    this.initializeState();
  }

  public componentDidMount() {}

  private setupFilter() {
    this.filter.subscribe(() => {
      const { pullRequests } = this.state;
      const filterPullRequestTitle = this.filter.getFilterItemValue<string>(
        "pullRequestTitle"
      );
      const repositoriesFilter = this.filter.getFilterItemValue<string[]>(
        "repositories"
      );
      const sourceBranchFilter = this.filter.getFilterItemValue<string[]>(
        "sourceBranch"
      );
      const targetBranchFilter = this.filter.getFilterItemValue<string[]>(
        "targetBranch"
      );
      const createdByFilter = this.filter.getFilterItemValue<string[]>(
        "createdBy"
      );
      const reviewersFilter = this.filter.getFilterItemValue<string[]>(
        "reviewers"
      );

      const myApprovalStatusFilter = this.filter.getFilterItemValue<string[]>(
        "myApprovals"
      );

      let filteredPullRequest = pullRequests;

      if (filterPullRequestTitle && filterPullRequestTitle.length > 0) {
        filteredPullRequest = pullRequests.filter(pr => {
          const found =
            pr.gitPullRequest.title
              .toLocaleLowerCase()
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
            return (
              `${pr.gitPullRequest.repository.name}->${pr.sourceBranchName}` ===
              r
            );
          });

          return found;
        });
      }

      if (targetBranchFilter && targetBranchFilter.length > 0) {
        filteredPullRequest = filteredPullRequest.filter(pr => {
          const found = targetBranchFilter.some(r => {
            return (
              `${pr.gitPullRequest.repository.name}->${pr.targetBranchName}` ===
              r
            );
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
            return pr.myApprovalStatus === (parseInt(vote) as Data.ReviewerVoteOption)
          });
          return found;
        });
      }

      this.reloadPullRequestItemProvider(filteredPullRequest);
    }, FILTER_CHANGE_EVENT);
  }

  private async initializeState() {
    console.log("initializeState called");

    this.setState({
      pullRequests: []
    });

    const projectService = await DevOps.getService<IProjectPageService>(
      // @ts-ignore
      CommonServiceIds.ProjectPageService
    );

    this.setState({
      currentProject: await projectService.getProject()
    });

    console.log("getProject called");

    this.setState({
      repositories: await this.gitClient.getRepositories(
        this.state.currentProject!.name,
        true
      )
    });
    console.log("getRepositories called");

    this.getAllPullRequests();
    console.log("getAllPullRequests called");
  }

  private reloadPullRequestItemProvider(newList: Data.PullRequestModel[]) {
    this.pullRequestItemProvider.splice(0, this.pullRequestItemProvider.length);
    this.pullRequestItemProvider.push(...newList);
  }

  private async getAllPullRequests() {
    let { repositories, pullRequests } = this.state;

    //clear the pull request list to be reloaded...
    pullRequests.splice(0, pullRequests.length);
    this.pullRequestItemProvider = new ObservableArray<
      | Data.PullRequestModel
      | IReadonlyObservableValue<Data.PullRequestModel | undefined>
    >();

    Promise.all(
      repositories.map(async r => {
        let criteria = Object.assign({}, Data.pullRequestCriteria);

        const loadedPullRequests = await this.gitClient.getPullRequests(
          r.id,
          criteria
        );

        return loadedPullRequests;
      })
    )
      .then(loadedPullRequests => {
        loadedPullRequests.map(pr => {
          if (!pr || pr.length === 0) return pr;

          pullRequests.push(
            ...Data.PullRequestModel.getModels(
              pr,
              this.state.currentProject!.name
            )
          );
          return pr;
        });
      })
      .finally(() => {
        if (pullRequests.length > 0) {
          this.setState({
            pullRequests
          });
        }

        this.loadLists();
      });
  }

  private loadLists() {
    let {
      sourceBranchList,
      targetBranchList,
      creadtedByList,
      pullRequests,
      reviewerList
    } = this.state;

    this.reloadPullRequestItemProvider([]);
    sourceBranchList = [];
    targetBranchList = [];
    creadtedByList = [];
    reviewerList = [];

    pullRequests = pullRequests.sort(
      (a: Data.PullRequestModel, b: Data.PullRequestModel) => {
        return (
          a.gitPullRequest.creationDate.getTime() -
          b.gitPullRequest.creationDate.getTime()
        );
      }
    );

    this.pullRequestItemProvider.push(...pullRequests);

    pullRequests.map(pr => {
      let found = creadtedByList.some(item => {
        return item.id === pr.gitPullRequest.createdBy.id;
      });

      if (found === false) {
        creadtedByList.push(pr.gitPullRequest.createdBy);
      }

      const sourceBranch: Data.BranchDropDownItem = {
        repositoryName: pr.gitPullRequest.repository.name,
        branchName: pr.sourceBranchName
      };

      const targetBranch: Data.BranchDropDownItem = {
        repositoryName: pr.gitPullRequest.repository.name,
        branchName: pr.targetBranchName
      };

      found = sourceBranchList.some(item => {
        return (
          item.repositoryName === sourceBranch.repositoryName &&
          item.branchName === sourceBranch.branchName
        );
      });

      if (found === false) {
        sourceBranchList.push(sourceBranch);
      }

      found = targetBranchList.some(item => {
        return (
          item.repositoryName === targetBranch.repositoryName &&
          item.branchName === targetBranch.branchName
        );
      });

      if (found === false) {
        targetBranchList.push(targetBranch);
      }

      if (
        pr.gitPullRequest.reviewers &&
        pr.gitPullRequest.reviewers.length > 0
      ) {
        pr.gitPullRequest.reviewers.map(r => {
          found = reviewerList.some(item => {
            return item.id === r.id;
          });

          if (found === false) {
            reviewerList.push(r);
          }

          return r;
        });
      }

      return pr;
    });

    this.setState({
      sourceBranchList,
      targetBranchList,
      creadtedByList,
      reviewerList
    });

    DevOps.notifyLoadSucceeded();
  }

  refresh = () => {
    this.getAllPullRequests();
  };

  public render(): JSX.Element {
    const {
      repositories,
      creadtedByList,
      sourceBranchList,
      targetBranchList,
      reviewerList
    } = this.state;

    if (this.pullRequestItemProvider.value.length === 0) {
      return (
        <div className="absolute-fill flex-column flex-grow flex-center justify-center">
          <Spinner size={SpinnerSize.large} />
          <div>Loading...</div>
        </div>
      );
    }

    return (
      <div>
        <FilterBar filter={this.filter}>
          <KeywordFilterBarItem
            filterItemKey="pullRequestTitle"
            placeholder={"Search Pull Requests"}
            filter={this.filter}
          />

          <React.Fragment>
            <DropdownFilterBarItem
              filterItemKey="repositories"
              filter={this.filter}
              selection={this.selectedRepos}
              placeholder="Repositories"
              showFilterBox={true}
              noItemsText="No repository found"
              items={repositories.map(i => {
                return {
                  id: i.id,
                  text: i.name
                };
              })}
            />
          </React.Fragment>

          <React.Fragment>
            <DropdownFilterBarItem
              filterItemKey="sourceBranch"
              filter={this.filter}
              showFilterBox={true}
              noItemsText="No source branch found"
              items={sourceBranchList.map(i => {
                return {
                  id: `${i.repositoryName}->${i.branchName}`,
                  text: `${i.repositoryName}->${i.branchName}`
                };
              })}
              selection={this.selectedSourceBranches}
              placeholder="Source Branch"
            />
          </React.Fragment>

          <React.Fragment>
            <DropdownFilterBarItem
              filterItemKey="targetBranch"
              filter={this.filter}
              showFilterBox={true}
              noItemsText="No target branch found"
              items={targetBranchList.map(i => {
                return {
                  id: `${i.repositoryName}->${i.branchName}`,
                  text: `${i.repositoryName}->${i.branchName}`
                };
              })}
              selection={this.selectedTargetBranches}
              placeholder="Target Branch"
            />
          </React.Fragment>

          <React.Fragment>
            <DropdownFilterBarItem
              filterItemKey="createdBy"
              noItemsText="No one found"
              filter={this.filter}
              showFilterBox={true}
              items={creadtedByList.map(i => {
                return {
                  id: i.id,
                  text: i.displayName
                };
              })}
              selection={this.selectedAuthors}
              placeholder="Created By"
            />
          </React.Fragment>

          <React.Fragment>
            <DropdownFilterBarItem
              filterItemKey="reviewers"
              noItemsText="No one found"
              filter={this.filter}
              showFilterBox={true}
              items={reviewerList.map(i => {
                return {
                  id: i.id,
                  text: i.displayName
                };
              })}
              selection={this.selectedReviewers}
              placeholder="Reviewers"
            />
          </React.Fragment>

          <React.Fragment>
            <DropdownFilterBarItem
              filterItemKey="myApprovals"
              filter={this.filter}
              items={Object.keys(Data.ReviewerVoteOption)
                .filter(value => !isNaN(parseInt(value, 10)))
                .map(item => {
                  return {
                    id: item,
                    text: getVoteDescription(parseInt(item))
                  };
                })}
              selection={this.selectedMyApprovalStatuses}
              placeholder="My Approval Status"
            />
          </React.Fragment>
        </FilterBar>

        <Card
          className="flex-grow bolt-table-card"
          contentProps={{ contentPadding: false }}
          titleProps={{ text: "List of Active Pull Requests" }}
          headerCommandBarItems={this.listHeaderColumns}
        >
          <React.Fragment>
            <Table<Data.PullRequestModel>
              columns={this.columns}
              itemProvider={this.pullRequestItemProvider}
              showLines={true}
              role="table"
            />
          </React.Fragment>
        </Card>
      </div>
    );
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
    }
  ];

  private columns: ITableColumn<Data.PullRequestModel>[] = [
    {
      id: "title",
      name: "Pull Request",
      renderCell: this.renderTitleColumn,
      readonly: true,
      sortProps: {
        ariaLabelAscending: "Sorted A to Z",
        ariaLabelDescending: "Sorted Z to A"
      },
      width: -33
    },
    {
      className: "pipelines-two-line-cell",
      id: "details",
      name: "Details",
      renderCell: this.renderDetailsColumn,
      width: -33
    },
    {
      id: "time",
      readonly: true,
      renderCell: this.renderDateColumn,
      width: -33
    }
  ];

  private sortFunctions = [
    // Sort on Title column
    (item1: Data.PullRequestModel, item2: Data.PullRequestModel) => {
      return item1.gitPullRequest.title.localeCompare(
        item2.gitPullRequest.title!
      );
    }
  ];

  private renderDetailsColumn(
    rowIndex: number,
    columnIndex: number,
    tableColumn: ITableColumn<Data.PullRequestModel>,
    tableItem: Data.PullRequestModel
  ): JSX.Element {
    return (
      <TwoLineTableCell
        className="bolt-table-cell-content-with-inline-link no-v-padding"
        key={"col-" + columnIndex}
        columnIndex={columnIndex}
        tableColumn={tableColumn}
        line1={
          <span className="flex-row scroll-hidden">
            <VssPersona
              className="icon-margin"
              imageUrl={tableItem.gitPullRequest.createdBy._links["avatar"].href}
              size={"small"}
              displayName={tableItem.gitPullRequest.createdBy.displayName}
            />
            <Tooltip
              text={tableItem.gitPullRequest.createdBy.displayName}
              overflowOnly
            >
              <Link
                className="fontSizeM font-size-m text-ellipsis bolt-table-link bolt-table-inline-link"
                excludeTabStop
                href="#"
                target="_blank"
              >
                {tableItem.gitPullRequest.createdBy.displayName}
              </Link>
            </Tooltip>
          </span>
        }
        line2={
          <span className="flex-wrap fontSize font-size secondary-text flex-row flex-center text-ellipsis">
            <br />
            <br />
            <strong>Reviewers:&nbsp;</strong>
            <PillGroup className="flex-row flex-wrap">
              {tableItem.gitPullRequest.reviewers.map((reviewer, i) => {
                // @ts-ignore
                return (
                  <Pill
                    key={reviewer.id}
                    color={getReviewerColor(reviewer)}
                    // @ts-ignore
                    size={PillSize.regular}
                  >
                    {reviewer.displayName}
                  </Pill>
                );
              })}
            </PillGroup>
          </span>
        }
      />
    );
  }

  private renderTitleColumn(
    rowIndex: number,
    columnIndex: number,
    tableColumn: ITableColumn<Data.PullRequestModel>,
    tableItem: Data.PullRequestModel
  ): JSX.Element {
    const tooltip = `from ${tableItem.sourceBranchName} into ${
      tableItem.targetBranchName
    }`;
    return (
      <TwoLineTableCell
        className="bolt-table-cell-content-with-inline-link no-v-padding"
        key={"col-" + columnIndex}
        columnIndex={columnIndex}
        tableColumn={tableColumn}
        line1={
          <span className="flex-row scroll-hidden">
            <Status
              {...getStatusIndicatorData(
                tableItem.gitPullRequest.status.toString()
              ).statusProps}
              className="icon-large-margin"
              // @ts-ignore
              size={StatusSize.l}
            />
            <span className="flex-row scroll-hidden">
              {PullRequestTypeIcon()}
              <Tooltip text={tableItem.gitPullRequest.title} overflowOnly>
                <Link
                  className="fontSizeM font-size-m text-ellipsis bolt-table-link bolt-table-inline-link"
                  excludeTabStop
                  href={tableItem.pullRequestHref}
                  target="_blank"
                >
                  {tableItem.gitPullRequest.title}
                </Link>
              </Tooltip>
              {tableItem.gitPullRequest.isDraft ? (
                <Pill
                  color={Data.draftColor}
                  // @ts-ignore
                  size={PillSize.regular}
                >
                  Draft
                </Pill>
              ) : (
                ""
              )}
              {hasPullRequestFailure(tableItem) ? (
                <Pill
                  color={Data.rejectedColor}
                  // @ts-ignore
                  size={PillSize.regular}
                >
                  {getPullRequestFailureDescription(tableItem)}
                </Pill>
              ) : (
                ""
              )}
            </span>
          </span>
        }
        line2={
          <Tooltip text={tooltip} overflowOnly>
            <span className="fontSize font-size secondary-text flex-row flex-center text-ellipsis">
              {Icon({
                className: "icon-margin",
                iconName: "OpenSource",
                key: "branch-name"
              })}
              {tableItem.gitPullRequest.repository.name} -> from{" "}
              <Link
                className="fontSizeM font-size-m text-ellipsis bolt-table-link bolt-table-inline-link"
                excludeTabStop
                href={tableItem.sourceBranchHref}
                target="_blank"
              >
                {tableItem.sourceBranchName}
              </Link>
              into
              <Link
                className="fontSizeM font-size-m text-ellipsis bolt-table-link bolt-table-inline-link"
                excludeTabStop
                href={`${tableItem.targetBranchHref}`}
                target="_blank"
              >
                {tableItem.targetBranchName}
              </Link>
            </span>
          </Tooltip>
        }
      />
    );
  }

  private renderDateColumn(
    rowIndex: number,
    columnIndex: number,
    tableColumn: ITableColumn<Data.PullRequestModel>,
    tableItem: Data.PullRequestModel
  ): JSX.Element {
    return (
      <TwoLineTableCell
        key={"col-" + columnIndex}
        columnIndex={columnIndex}
        tableColumn={tableColumn}
        line1={WithIcon({
          className: "fontSize font-size",
          iconProps: { iconName: "Calendar" },
          children: (
            <Ago
              date={
                tableItem.gitPullRequest.creationDate!
              } /*format={AgoFormat.Extended}*/
            />
          )
        })}
        line2={WithIcon({
          className: "fontSize font-size bolt-table-two-line-cell-item",
          iconProps: { iconName: "Clock" },
          children: (
            <Duration
              startDate={tableItem.gitPullRequest.creationDate!}
              endDate={new Date(Date.now())}
            />
          )
        })}
      />
    );
  }
}

function getStatusIndicatorData(status: string): Data.IStatusIndicatorData {
  status = status || "";
  status = status.toLowerCase();
  const indicatorData: Data.IStatusIndicatorData = {
    label: "Success",
    statusProps: { ...Statuses.Success, ariaLabel: "Success" }
  };

  /**
     * Status not set. Default state.
    NotSet = 0,
     * Pull request is active.
    Active = 1,
     * Pull request is abandoned.
    Abandoned = 2,
     * Pull request is completed.
    Completed = 3,
     * Used in pull request search criterias to include all statuses.
    All = 4
  */

  switch (status) {
    case "0": //NotSet
      indicatorData.statusProps = {
        ...Statuses.Skipped,
        ariaLabel: "Pending"
      };
      indicatorData.label = "Pending";
      break;
    case "1": //Active
      indicatorData.statusProps = {
        ...Statuses.Waiting,
        ariaLabel: "Active"
      };
      indicatorData.label = "Active";
      break;
    case "2":
      indicatorData.statusProps = {
        ...Statuses.Warning,
        ariaLabel: "Abandoned"
      };
      indicatorData.label = "Abandoned";
      break;
    case "3":
      indicatorData.statusProps = {
        ...Statuses.Success,
        ariaLabel: "Success"
      };
      indicatorData.label = "Completed";
      break;
  }

  return indicatorData;
}

function hasPullRequestFailure(pullRequest: Data.PullRequestModel): boolean {
  const prMergeStatus = pullRequest.gitPullRequest.mergeStatus;
  return (
    prMergeStatus === PullRequestAsyncStatus.Conflicts ||
    prMergeStatus === PullRequestAsyncStatus.Failure ||
    prMergeStatus === PullRequestAsyncStatus.RejectedByPolicy
  );
}

function getPullRequestFailureDescription(
  pullRequest: Data.PullRequestModel
): string {
  const prMergeStatus = pullRequest.gitPullRequest.mergeStatus;
  switch (prMergeStatus) {
    case PullRequestAsyncStatus.RejectedByPolicy:
      return "Rejected by Policy";
    default:
      return PullRequestAsyncStatus[prMergeStatus];
  }
}

function getVoteDescription(vote: number): string {
  switch (vote) {
    case 10:
      return "Approved";
    case 5:
      return "Approved with Suggestions";
    case -10:
      return "Rejected";
    case -5:
      return "Waiting for Author";
  }

  return "No Vote";
}

function getReviewerColor(reviewer: IdentityRefWithVote): IColor {
  switch (Data.ReviewerVoteOption[reviewer.vote]) {
    case "Approved":
      return Data.approvedColor;
    case "ApprovedWithSuggestions":
      return Data.approvedWithSuggestionsColor;
    case "Rejected":
      return Data.rejectedColor;
    case "WaitingForAuthor":
      return Data.waitingAuthorColor;
  }

  return Data.noVoteColor;
}

function WithIcon(props: {
  className?: string;
  iconProps: IIconProps;
  children?: React.ReactNode;
}) {
  return (
    <div className={css(props.className, "flex-row flex-center")}>
      {Icon({ ...props.iconProps, className: "icon-margin" })}
      {props.children}
    </div>
  );
}

function PullRequestTypeIcon() {
  let iconName: string = "BranchPullRequest";

  return Icon({
    className: "bolt-table-inline-link-left-padding icon-margin",
    iconName: iconName,
    key: "release-type"
  });
}
