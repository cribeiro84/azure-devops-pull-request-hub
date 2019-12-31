import * as React from "react";
import * as Data from "../tabs/PulRequestsTabData";

import { ITableColumn, TwoLineTableCell } from "azure-devops-ui/Table";
import { Button } from "azure-devops-ui/Button";
import { Status } from "azure-devops-ui/Status";
import { Pill } from "azure-devops-ui/Pill";
import { PullRequestAsyncStatus } from "azure-devops-extension-api/Git/Git";
import { IIconProps, Icon } from "azure-devops-ui/Icon";
import { css } from "azure-devops-ui/Util";
import { Ago } from "azure-devops-ui/Ago";
import { Duration } from "azure-devops-ui/Duration";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { Tooltip } from "azure-devops-ui/TooltipEx";
import { PillGroup } from "azure-devops-ui/PillGroup";
import { ReviewerVoteIconStatus } from "./ReviewerVoteIconStatus";
import { VssPersona } from "azure-devops-ui/VssPersona";
import { IdentityRef } from "azure-devops-extension-api/WebApi/WebApi";
import { Link, ColorPicker } from "office-ui-fabric-react";
import { Observer } from "azure-devops-ui/Observer";
import {
  getStatusSizeValue,
  getPillSizeValue,
  getPillGroupOverflowValue,
  getPillVariantValue
} from "../models/constants";

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
        <span className="flex-row scroll-hidden">
          <Button
            className="branch-button"
            text={tableItem.title}
            iconProps={{ iconName: "BranchPullRequest" }}
            onClick={onClickPullRequestTitleHandler}
            tooltipProps={{ text: tooltip }}
            subtle={true}
          />
          {tableItem.gitPullRequest.isDraft ? (
            <div className="flex-column" key={rowIndex}>
              <Pill color={Data.draftColor} size={getPillSizeValue("large")}>
                Draft
              </Pill>
            </div>
          ) : (
            ""
          )}
          {hasPullRequestFailure(tableItem) ? (
            <Pill color={Data.rejectedColor} size={getPillSizeValue("large")}>
              {getPullRequestFailureDescription(tableItem)}
            </Pill>
          ) : (
            " "
          )}
        </span>
      }
      line2={
        <Tooltip text={tooltip}>
          <span className="fontSize font-size secondary-text flex-row flex-center text-ellipsis">
            <Button
              className="branch-button"
              text={tableItem.gitPullRequest.repository.name}
              iconProps={{ iconName: "Repo" }}
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
            ->
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
  return (
    <TwoLineTableCell
      className="bolt-table-cell-content-with-inline-link no-v-padding"
      key={"col-" + columnIndex}
      columnIndex={columnIndex}
      tableColumn={tableColumn}
      line1={
        <span className="flex-row scroll-hidden">
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
        </span>
      }
      line2={
        <div>
          <br />
          <strong>Last commit:</strong> <Icon iconName="BranchCommit" />
          <Link
            className="fontSizeMS font-size-ms secondary-text bolt-table-link bolt-table-inline-link"
            href={tableItem.lastCommitUrl}
            target="_blank"
          >
            {tableItem.lastShortCommitId}
          </Link>
          {" - "}
          <Observer startDate={lastCommitDate}>
            <Duration
              startDate={lastCommitDate.value!}
              endDate={new Date(Date.now())}
            />
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
        <PillGroup
          className="flex-row"
          overflow={getPillGroupOverflowValue("wrap")}
        >
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
                  <Pill
                    key={reviewer.id}
                    color={Data.reviewerVoteToIColorLight(reviewer.vote)}
                    variant={getPillVariantValue(")colored")}
                    size={getPillSizeValue("large")}
                  >
                    <div className="flex-row rhythm-horizontal-8">
                      <ReviewerVoteIconStatus reviewer={reviewer} />
                      <VssPersona
                        className="icon-margin"
                        imageUrl={reviewer._links.avatar.href}
                        size={"small"}
                      />
                    </div>
                  </Pill>
                </Tooltip>
              );
            })}
        </PillGroup>
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

function hasPullRequestFailure(pullRequest: Data.PullRequestModel): boolean {
  const prMergeStatus = pullRequest.gitPullRequest.mergeStatus;
  return (
    prMergeStatus === PullRequestAsyncStatus.Conflicts ||
    prMergeStatus === PullRequestAsyncStatus.Failure ||
    prMergeStatus === PullRequestAsyncStatus.RejectedByPolicy
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
