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
  PullRequestAsyncStatus,
  GitRepository
} from "azure-devops-extension-api/Git/Git";

//Azure DevOps UI
import { VssPersona } from "azure-devops-ui/VssPersona";
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";
import { FilterBar } from "azure-devops-ui/FilterBar";
import { KeywordFilterBarItem } from "azure-devops-ui/TextFilterBarItem";
import { Filter, FILTER_CHANGE_EVENT, IFilterItemState } from "azure-devops-ui/Utilities/Filter";
import {
  DropdownMultiSelection
} from "azure-devops-ui/Utilities/DropdownSelection";
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
import { Pill, PillSize, PillVariant } from "azure-devops-ui/Pill";
import { PillGroup, PillGroupOverflow } from "azure-devops-ui/PillGroup";
import { IColor } from "azure-devops-ui/Utilities/Color";
import { ZeroData, ZeroDataActionType } from "azure-devops-ui/ZeroData";
import { IdentityRef } from 'azure-devops-extension-api/WebApi/WebApi';

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
  private selectedIsDraft = new DropdownMultiSelection();
  private pullRequestItemProvider = new ObservableArray<
    | Data.PullRequestModel
    | IReadonlyObservableValue<Data.PullRequestModel | undefined>
  >();
  private myApprovalStatuses = Object.keys(Data.ReviewerVoteOption)
  .filter(value => !isNaN(parseInt(value, 10)))
  .map(item => {
    return {
      id: item,
      text: getVoteDescription(parseInt(item))
    };
  });

  private isDraftItems = Object.keys(Data.YesOrNo)
  .filter(value => !isNaN(parseInt(value, 10)))
  .map(item => {
    return {
      id: item,
      text: Object.values(Data.YesOrNo)[parseInt(item)].toString()
    };
  });

  private readonly gitClient: GitRestClient;

  constructor(props: {}) {
    super(props);

    this.gitClient = getClient(GitRestClient);

    this.state = {
      pullRequests: [],
      repositories: [],
      currentProject: { id: "", name: "" },
      createdByList: [],
      sourceBranchList: [],
      targetBranchList: [],
      reviewerList: [],
      loading: true
    };

    this.filter = new Filter();
  }

  public async componentWillMount() {
    DevOps.init();
    this.initializeState();
  }

  public componentDidMount() {
    this.setupFilter();
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

    const projectService = await DevOps.getService<IProjectPageService>(
      // @ts-ignore
      CommonServiceIds.ProjectPageService
    );

    this.setState({
      currentProject: await projectService.getProject()
    });

    this.setState({
      repositories: (await this.gitClient.getRepositories(
        this.state.currentProject!.name,
        true
      )).sort(
        (a: GitRepository, b: GitRepository) => {
          if(a.name < b.name) { return -1; }
          if(a.name > b.name) { return 1; }
          return 0;
        }
      )
    });

    this.getAllPullRequests();
  }

  private reloadPullRequestItemProvider(newList: Data.PullRequestModel[]) {
    this.pullRequestItemProvider.splice(0, this.pullRequestItemProvider.length);
    this.pullRequestItemProvider.push(...newList);
  }

  private async getAllPullRequests() {
    this.setState({loading: true});
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
      pullRequests
    } = this.state;

    this.reloadPullRequestItemProvider([]);

    pullRequests = pullRequests.sort(
      (a: Data.PullRequestModel, b: Data.PullRequestModel) => {
        return (
          a.gitPullRequest.creationDate.getTime() -
          b.gitPullRequest.creationDate.getTime()
        );
      }
    );

    this.pullRequestItemProvider.push(...pullRequests);

    this.populateFilterBarFields(pullRequests);
    this.setState({loading: false});
    this.filterPullRequests();
  }

  private filterPullRequests() {
    const { pullRequests } = this.state

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

    const isDraftFilter = this.filter.getFilterItemValue<number[]>(
      "selectedIsDraft"
    );

    let filteredPullRequest = pullRequests;

    if (filterPullRequestTitle && filterPullRequestTitle.length > 0) {
      filteredPullRequest = pullRequests.filter(pr => {
        const found =
          pr.title!
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
          return (
            pr.myApprovalStatus ===
            (parseInt(vote) as Data.ReviewerVoteOption)
          );
        });
        return found;
      });
    }

    if (isDraftFilter && isDraftFilter.length > 0) {
      filteredPullRequest = filteredPullRequest.filter(pr => {
        const found = isDraftFilter.some(item => {
          return (
            pr.gitPullRequest.isDraft === (item == 1)
          );
        });
        return found;
      });
    }

    this.reloadPullRequestItemProvider(filteredPullRequest);
  };

  private hasFilterValue(list: Array<Data.BranchDropDownItem | IdentityRef | IdentityRefWithVote>, value: any): Boolean {
    return list.some((item) => {
      if (item.hasOwnProperty("id"))
      {
        const convertedValue = item as IdentityRef;
        return convertedValue.id === value;
      }
      else if (item.constructor.name === "BranchDropDownItem")
      {
        const convertedValue = item as Data.BranchDropDownItem;
        return convertedValue.displayName === value;
      }
      else {
        return item === value;
      }
    });
  };

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
      let found = this.hasFilterValue(createdByList, pr.gitPullRequest.createdBy.id);

      if (found === false) {
        createdByList.push(pr.gitPullRequest.createdBy);
      }

      const sourceBranch = new Data.BranchDropDownItem(pr.gitPullRequest.repository.name, pr.sourceBranchName!);
      const targetBranch = new Data.BranchDropDownItem(pr.gitPullRequest.repository.name, pr.targetBranchName!);

      found = this.hasFilterValue(sourceBranchList, sourceBranch.displayName);

      if (found === false) {
        sourceBranchList.push(sourceBranch);
      }

      found = this.hasFilterValue(targetBranchList, targetBranch.displayName);

      if (found === false) {
        targetBranchList.push(targetBranch);
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

    sourceBranchList = sourceBranchList.sort(sortMethod);
    targetBranchList = targetBranchList.sort(sortMethod);
    createdByList = createdByList.sort(sortMethod);
    reviewerList = reviewerList.sort(sortMethod);

    const selectionObjectList = ["selectedAuthors", "selectedReviewers", "selectedSourceBranches", "selectedTargetBranches"];
    const selectionFilterObjects = [this.selectedAuthors, this.selectedReviewers, this.selectedSourceBranches, this.selectedTargetBranches];
    const selectedItemsObjectList = [createdByList, reviewerList, sourceBranchList, targetBranchList];

    selectionObjectList.forEach((objectKey, index) => {
      const filterItemState = this.filter.getFilterItemState(objectKey);

      if (!filterItemState) {
        return;
      }

      const filterStateValueList: string[] = (filterItemState as IFilterItemState).value;

      filterStateValueList.map((item, itemIndex) => {
        const found = this.hasFilterValue(selectedItemsObjectList[index], item);

        if (!found) {
          filterStateValueList.splice(itemIndex, 1);
          selectionFilterObjects[index].clear();
        }
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
    await this.getAllPullRequests();
  };

  public render(): JSX.Element {
    const {
      repositories,
      createdByList,
      sourceBranchList,
      targetBranchList,
      reviewerList,
      loading
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
      <div>
        <FilterBar filter={this.filter}>
          <KeywordFilterBarItem
            filterItemKey="pullRequestTitle"
            placeholder={"Search Pull Requests"}
            filter={this.filter}
          />

          <React.Fragment>
            <DropdownFilterBarItem
              filterItemKey="selectedRepos"
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
              filterItemKey="selectedSourceBranches"
              filter={this.filter}
              showFilterBox={true}
              noItemsText="No source branch found"
              items={sourceBranchList.map(i => {
                return {
                  id: i.displayName,
                  text: i.displayName
                };
              })}
              selection={this.selectedSourceBranches}
              placeholder="Source Branch"
            />
          </React.Fragment>

          <React.Fragment>
            <DropdownFilterBarItem
              filterItemKey="selectedTargetBranches"
              filter={this.filter}
              showFilterBox={true}
              noItemsText="No target branch found"
              items={targetBranchList.map(i => {
                return {
                  id: i.displayName,
                  text: i.displayName
                };
              })}
              selection={this.selectedTargetBranches}
              placeholder="Target Branch"
            />
          </React.Fragment>

          <React.Fragment>
            <DropdownFilterBarItem
              filterItemKey="selectedAuthors"
              noItemsText="No one found"
              filter={this.filter}
              showFilterBox={true}
              items={createdByList.map(i => {
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
              filterItemKey="selectedReviewers"
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
              filterItemKey="selectedMyApprovalStatuses"
              filter={this.filter}
              items={this.myApprovalStatuses}
              selection={this.selectedMyApprovalStatuses}
              placeholder="My Approval Status"
            />
          </React.Fragment>

          <React.Fragment>
            <DropdownFilterBarItem
              filterItemKey="selectedIsDraft"
              filter={this.filter}
              items={this.isDraftItems}
              selection={this.selectedIsDraft}
              placeholder="Is Draft"
            />
          </React.Fragment>
        </FilterBar>

        {this.getRenderContent()}
      </div>
    );
  }

  getRenderContent() {
    console.log(this.pullRequestItemProvider.length);
    if (this.pullRequestItemProvider.value.length === 0) {
       return <ZeroData
            primaryText="Yeah! No Pull Request to be reviewed. "
            secondaryText={
                <span>
                    Enjoy your free time to code and raise PRs for your team/project!
                </span>
            }
            imageAltText="No PRs!"
            imagePath={require("../images/emptyPRList.png")}
            actionText="Refresh"
            // @ts-ignore
            actionType={ZeroDataActionType.ctaButton}
            onActionClick={(event, item) =>
                this.refresh()
            }
        />
    }
    else {
       return <Card
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
      id: "reviewers",
      name: "Reviewers",
      renderCell: this.renderReviewersColumn,
      width: -33
    },
    {
      id: "time",
      readonly: true,
      renderCell: this.renderDateColumn,
      width: -33
    }
  ];

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
                  {tableItem.title}
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
              imageUrl={
                tableItem.gitPullRequest.createdBy._links["avatar"].href
              }
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
          <div>
            <br />
            <Icon iconName="BranchCommit" />
            <Link
                className="fontSizeM font-size-m text-ellipsis bolt-table-link bolt-table-inline-link"
                excludeTabStop
                href={tableItem.lastCommitUrl}
                target="_blank"
              >
                {tableItem.lastShortCommitId}{" "}
              </Link>
          </div>
        }
      />
    );
  }

  private renderReviewersColumn(
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
          <span className="fontSize font-size secondary-text flex-row flex-center text-ellipsis">
            <strong>Reviewers:&nbsp;</strong>
            <br />
          </span>
        }
        line2={
          <PillGroup
            className="flex-row"
            // @ts-ignore
            overflow={PillGroupOverflow.wrap}
          >
            {tableItem.gitPullRequest.reviewers
              .sort(sortMethod)
              .map((reviewer, i) => {
              // @ts-ignore
              return (
                <Pill
                  key={reviewer.id}
                  color={getReviewerColor(reviewer)}
                  // @ts-ignore
                  variant={PillVariant.colored}
                  // @ts-ignore
                  size={PillSize.regular}
                >
              {reviewer.displayName}
                </Pill>
              );
            })}
          </PillGroup>
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

function sortMethod (a: Data.BranchDropDownItem | IdentityRef, b: Data.BranchDropDownItem | IdentityRef) {
  if(a.displayName! < b.displayName!) { return -1; }
  if(a.displayName! > b.displayName!) { return 1; }
  return 0;
};
