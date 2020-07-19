import "./FilterBarHub.scss";
import * as React from "react";
import { FilterBar } from "azure-devops-ui/FilterBar";
import { KeywordFilterBarItem } from "azure-devops-ui/TextFilterBarItem";
import { DropdownFilterBarItem } from "azure-devops-ui/Dropdown";
import {
  TeamProjectReference,
  ProjectInfo,
  WebApiTagDefinition,
} from "azure-devops-extension-api/Core/Core";
import { Filter } from "azure-devops-ui/Utilities/Filter";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import {
  DropdownSelection,
  DropdownMultiSelection,
} from "azure-devops-ui/Utilities/DropdownSelection";
import {
  GitRepository,
  IdentityRefWithVote,
} from "azure-devops-extension-api/Git/Git";
import * as Data from "../tabs/PulRequestsTabData";
import { IdentityRef } from "azure-devops-extension-api/WebApi/WebApi";
import { getVoteDescription } from "./Columns";
import { ITableColumn } from "azure-devops-ui/Table";
import { Status } from "azure-devops-ui/Status";
import { getStatusSizeValue, getStatusIcon } from "../models/constants";
import { PullRequestModel } from "../models/PullRequestModel";
import { Spinner } from "office-ui-fabric-react";

export const myApprovalStatuses: Data.IKeyValueData[] = Object.keys(
  Data.ReviewerVoteOption
)
  .filter((value) => !isNaN(parseInt(value, 10)))
  .map((item) => {
    return {
      id: item,
      text: getVoteDescription(parseInt(item, 10)),
    };
  });

export const alternateStatusPr: Data.IKeyValueData[] = Object.keys(
  Data.AlternateStatusPr
)
  .filter((value) => !isNaN(parseInt(value, 10)))
  .map((item) => {
    return {
      id: item,
      text: Object.values(Data.AlternateStatusPr)[
        parseInt(item, 10)
      ].toString(),
    };
  });

export interface IFilterHubProps {
  filterPullRequests: () => void;
  pullRequests: PullRequestModel[];
  projects: TeamProjectReference[];
  filter: Filter;
  selectedProjectChanged: (
    event: React.SyntheticEvent<HTMLElement, Event>,
    item: IListBoxItem<TeamProjectReference | ProjectInfo>
  ) => void;
  selectedProject: DropdownSelection;
  selectedRepos: DropdownMultiSelection;
  repositories: GitRepository[];
  selectedSourceBranches: DropdownMultiSelection;
  sourceBranchList: Data.BranchDropDownItem[];
  targetBranchList: Data.BranchDropDownItem[];
  selectedTargetBranches: DropdownMultiSelection;
  createdByList: IdentityRef[];
  selectedAuthors: DropdownMultiSelection;
  reviewerList: IdentityRefWithVote[];
  selectedReviewers: DropdownMultiSelection;
  selectedMyApprovalStatuses: DropdownMultiSelection;
  selectedAlternateStatusPr: DropdownMultiSelection;
  tagList: WebApiTagDefinition[];
  selectedTags: DropdownMultiSelection;
}

export function FilterBarHub(props: IFilterHubProps): JSX.Element {
  return (
    <FilterBar filter={props.filter} onDismissClicked={() => {
      props.filterPullRequests();
    }}>
      <KeywordFilterBarItem
        filterItemKey="pullRequestTitle"
        placeholder={"Search Pull Requests"}
        filter={props.filter}
        clearable={true}
      />

      <React.Fragment>
        <DropdownFilterBarItem
          filterItemKey="selectedProject"
          onSelect={props.selectedProjectChanged}
          filter={props.filter}
          selection={props.selectedProject}
          placeholder="Projects"
          showFilterBox={true}
          noItemsText="No project found"
          items={props.projects.map((i) => {
            return {
              id: i.id,
              text: i.name,
            };
          })}
        />
      </React.Fragment>

      <React.Fragment>
        <DropdownFilterBarItem
          filterItemKey="selectedRepos"
          filter={props.filter}
          selection={props.selectedRepos}
          placeholder="Repositories"
          showFilterBox={true}
          noItemsText="No repository found"
          items={props.repositories.map((i) => {
            return {
              id: i.id,
              text: i.name,
            };
          })}
        />
      </React.Fragment>

      <React.Fragment>
        <DropdownFilterBarItem
          filterItemKey="selectedSourceBranches"
          filter={props.filter}
          showFilterBox={true}
          noItemsText="No source branch found"
          items={props.sourceBranchList.map((i) => {
            return {
              id: i.displayName,
              text: i.displayName,
            };
          })}
          selection={props.selectedSourceBranches}
          placeholder="Source Branch"
        />
      </React.Fragment>

      <React.Fragment>
        <DropdownFilterBarItem
          filterItemKey="selectedTargetBranches"
          filter={props.filter}
          showFilterBox={true}
          noItemsText="No target branch found"
          items={props.targetBranchList.map((i) => {
            return {
              id: i.displayName,
              text: i.displayName,
            };
          })}
          selection={props.selectedTargetBranches}
          placeholder="Target Branch"
        />
      </React.Fragment>

      <React.Fragment>
        <DropdownFilterBarItem
          filterItemKey="selectedAuthors"
          noItemsText="No one found"
          filter={props.filter}
          showFilterBox={true}
          items={props.createdByList.map((i) => {
            return {
              id: i.id,
              text: i.displayName,
            };
          })}
          selection={props.selectedAuthors}
          placeholder="Created By"
        />
      </React.Fragment>

      <React.Fragment>
        <DropdownFilterBarItem
          filterItemKey="selectedReviewers"
          noItemsText="No one found"
          filter={props.filter}
          showFilterBox={true}
          items={props.reviewerList.map((i) => {
            return {
              id: i.id,
              text: i.displayName,
            };
          })}
          selection={props.selectedReviewers}
          placeholder="Reviewers"
        />
      </React.Fragment>

      <React.Fragment>
        <DropdownFilterBarItem
          filterItemKey="selectedMyApprovalStatuses"
          filter={props.filter}
          items={myApprovalStatuses}
          selection={props.selectedMyApprovalStatuses}
          renderItem={(
            rowIndex: number,
            columnIndex: number,
            tableColumn: ITableColumn<IListBoxItem<{}>>,
            tableItem: IListBoxItem<{}>
          ): JSX.Element => (
            <td
              key={rowIndex}
              className="bolt-list-box-text bolt-list-box-text-multi-select asi-container"
            >
              <Status
                {...getStatusIcon(parseInt(tableItem.id!, 10))}
                key="failed"
                size={getStatusSizeValue("m")}
                className="flex-self-center"
              />{" "}
              <span className="margin-left-8">
                {getVoteDescription(parseInt(tableItem.id!, 10))}
              </span>
            </td>
          )}
          placeholder={"My Approval Status"}
        />
      </React.Fragment>

      <React.Fragment>
        <DropdownFilterBarItem
          filterItemKey="selectedAlternateStatusPr"
          filter={props.filter}
          items={alternateStatusPr}
          selection={props.selectedAlternateStatusPr}
          placeholder="Alternate Status"
        />
      </React.Fragment>

      <React.Fragment>
        {props.pullRequests.filter((pr) => pr.isStillLoading() === true)
          .length > 0 ? (
          <Spinner />
        ) : (
          <DropdownFilterBarItem
            filterItemKey="selectedTags"
            filter={props.filter}
            items={props.tagList.map((i) => {
              return {
                id: i.id,
                text: i.name,
              };
            })}
            selection={props.selectedTags}
            placeholder="Tags"
          />
        )}
      </React.Fragment>
    </FilterBar>
  );
}
