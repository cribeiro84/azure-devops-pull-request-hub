import "./Columns.scss";

import * as React from "react";
import * as Data from "../tabs/PulRequestsTabData";

import { ITableColumn, TwoLineTableCell } from "azure-devops-ui/Table";
import { Button } from "azure-devops-ui/Button";
import { Status } from "azure-devops-ui/Status";
import { IIconProps, Icon } from "azure-devops-ui/Icon";
import { css } from "azure-devops-ui/Util";
import { Ago } from "azure-devops-ui/Ago";
import { Duration } from "azure-devops-ui/Duration";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { Tooltip } from "azure-devops-ui/TooltipEx";
import { ReviewerVoteIconStatus } from "./ReviewerVoteIconStatus";
import { VssPersona } from "azure-devops-ui/VssPersona";
import { Observer } from "azure-devops-ui/Observer";
import { getStatusSizeValue } from "../models/constants";
import { PullRequestPillInfo } from "./PullRequestPillInfo";

export function openNewWindowTab(targetUrl: string): void {
  window.open(targetUrl, "_blank");
}

export function StatusColumn(
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
        <Button
          tooltipProps={{
            text: tableItem.pullRequestProgressStatus!.statusProps.ariaLabel
          }}
          disabled={true}
          subtle={true}
        >
          <Status
            {...tableItem.pullRequestProgressStatus!.statusProps}
            className="icon-large-margin"
            size={getStatusSizeValue("l")}
          />
        </Button>
      }
      line2={<div />}
    />
  );
}

export function TitleColumn(
  rowIndex: number,
  columnIndex: number,
  tableColumn: ITableColumn<Data.PullRequestModel>,
  tableItem: Data.PullRequestModel
): JSX.Element {
  const tooltip = `from ${tableItem.sourceBranch!.branchName} into ${
    tableItem.targetBranch!.branchName
  }`;

  const onClickPullRequestTitleHandler = (
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
  ) => {
    openNewWindowTab(tableItem.pullRequestHref!);
  };

  const onClickRepoTitleHandler = (
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
  ) => {
    openNewWindowTab(tableItem.repositoryHref!);
  };

  const onClickSourceBranchHandler = (
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
  ) => {
    openNewWindowTab(tableItem.sourceBranchHref!);
  };

  const onClickTargetBranchHandler = (
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
  ) => {
    openNewWindowTab(tableItem.targetBranchHref!);
  };

  return (
    <TwoLineTableCell
      className="bolt-table-cell-content-with-inline-link no-v-padding"
      key={"col-" + columnIndex}
      columnIndex={columnIndex}
      tableColumn={tableColumn}
      line1={
        <div className="flex-row scroll-hidden">
          <Button
            className="branch-button"
            text={tableItem.title}
            iconProps={{ iconName: "BranchPullRequest" }}
            onClick={onClickPullRequestTitleHandler}
            tooltipProps={{ text: tooltip }}
            subtle={true}
          />
          <PullRequestPillInfo pullRequest={tableItem} />
        </div>
      }
      line2={
        <Tooltip text={tooltip}>
          <span className="fontSize font-size secondary-text flex-row flex-center text-ellipsis">
            <Button
              className="branch-button"
              text={tableItem.gitPullRequest.repository.name}
              iconProps={{ iconName: "GitLogo" }}
              onClick={onClickRepoTitleHandler}
              subtle={true}
            />
            <Button
              className="branch-button text-ellipsis"
              text={tableItem.sourceBranch!.branchName}
              iconProps={{ iconName: "BranchMerge" }}
              tooltipProps={{
                text: tableItem.sourceBranch!.branchName,
                delayMs: 500
              }}
              onClick={onClickSourceBranchHandler}
              subtle={true}
            />
            into
            <Button
              className="branch-button"
              text={tableItem.targetBranch!.branchName}
              iconProps={{ iconName: "BranchMerge" }}
              tooltipProps={{
                text: tableItem.targetBranch!.branchName,
                delayMs: 500
              }}
              onClick={onClickTargetBranchHandler}
              subtle={true}
            />
          </span>
        </Tooltip>
      }
    />
  );
}

export function DetailsColumn(
  rowIndex: number,
  columnIndex: number,
  tableColumn: ITableColumn<Data.PullRequestModel>,
  tableItem: Data.PullRequestModel
): JSX.Element {
  const lastCommitDate: ObservableValue<Date> = new ObservableValue<Date>(
    tableItem.gitPullRequest.creationDate
  );
  tableItem.lastCommitDetails.subscribe(value => {
    lastCommitDate.value = value!.committer.date;
  });

  const onClickLastCommitHandler = (
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
  ) => {
    openNewWindowTab(tableItem.lastCommitUrl!);
  };

  return (
    <TwoLineTableCell
      className="bolt-table-cell-content-with-inline-link no-v-padding"
      key={"col-" + columnIndex}
      columnIndex={columnIndex}
      tableColumn={tableColumn}
      line1={
        <div>
          <Button
            className="branch-button text-ellipsis"
            text={tableItem.gitPullRequest.createdBy.displayName}
            iconProps={{
              render: () => {
                return (
                  <VssPersona
                    className="icon-margin"
                    imageUrl={
                      tableItem.gitPullRequest.createdBy._links.avatar.href
                    }
                    size={"small"}
                    displayName={tableItem.gitPullRequest.createdBy.displayName}
                  />
                );
              }
            }}
            tooltipProps={{
              text: tableItem.gitPullRequest.createdBy.displayName,
              delayMs: 500
            }}
            subtle={true}
          />
        </div>
      }
      line2={
        <div>
          <Button
            iconProps={{ iconName: "BranchCommit" }}
            onClick={onClickLastCommitHandler}
            subtle={true}
            tooltipProps={{
              text: `Last commit`,
              delayMs: 500
            }}
          >
            {tableItem.lastShortCommitId}
          </Button>
          {" - "}
          <Observer startDate={lastCommitDate}>
            <Button
              iconProps={{ iconName: "Clock" }}
              onClick={onClickLastCommitHandler}
              subtle={true}
              tooltipProps={{
                text: `Last commit date and time`,
                delayMs: 500
              }}
              disabled={true}
            >
              <Duration
                tooltipProps={{
                  text: `When the last commit was done`,
                  delayMs: 500
                }}
                startDate={lastCommitDate.value!}
                endDate={new Date(Date.now())}
              />
            </Button>
          </Observer>
        </div>
      }
    />
  );
}

export function ReviewersColumn(
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
        <span className="fontSize font-size secondary-text flex-row flex-center text-ellipsis" />
      }
      line2={
        <div className="flex-row flex-wrap">
          {tableItem.gitPullRequest.reviewers
            .sort(Data.sortMethod)
            .map((reviewer, i) => {
              return (
                <Tooltip
                  key={i}
                  // tslint:disable-next-line:jsx-no-lambda
                  renderContent={() => (
                    <div className="flex-row rhythm-horizontal-4">
                      <div className="flex-column">
                        <div className="flex-row flex-center justify-center">
                          <VssPersona
                            className="icon-margin"
                            imageUrl={reviewer._links.avatar.href}
                            size={"small"}
                            displayName={reviewer.displayName}
                          />
                          <span>{reviewer.displayName}</span>
                        </div>
                        <br />
                        <div className="flex-row flex-center justify-start margin-top-8">
                          <ReviewerVoteIconStatus reviewer={reviewer} />
                          &nbsp;
                          <span className="font-weight-semibold">
                            {getVoteDescription(reviewer.vote)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                >
                  <div className="relative reviewer-vote-item">
                    <VssPersona
                      className="icon-margin"
                      imageUrl={reviewer._links.avatar.href}
                      size={"small"}
                    />
                    <ReviewerVoteIconStatus
                      className="repos-pr-reviewer-vote absolute"
                      reviewer={reviewer}
                    />
                  </div>
                </Tooltip>
              );
            })}
        </div>
      }
    />
  );
}

export function DateColumn(
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
        children: <Ago date={tableItem.gitPullRequest.creationDate!} />
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

export function getVoteDescription(vote: number): string {
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
