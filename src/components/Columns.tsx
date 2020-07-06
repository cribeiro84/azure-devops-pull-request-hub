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
import { Tooltip } from "azure-devops-ui/TooltipEx";
import { ReviewerVoteIconStatus } from "./ReviewerVoteIconStatus";
import { VssPersona } from "azure-devops-ui/VssPersona";
import { getStatusSizeValue } from "../models/constants";
import { PullRequestPillInfo } from "./PullRequestPillInfo";
import { Link } from "office-ui-fabric-react";

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
          <div className="flex-column flex-grow">
            <div className="flex-row">
              <div className="flex-column title-column-subdetails icon-column-subdetails">
                <Icon iconName="GitLogo" />
              </div>
              <div className="flex-column title-column-subdetails">
                <Link
                  className="bolt-link subtle"
                  href={tableItem.repositoryHref}
                  target="_blank"
                >
                  {tableItem.gitPullRequest.repository.name}
                </Link>
              </div>
              <div className="flex-column title-column-subdetails icon-column-subdetails">
                <Icon iconName="BranchMerge" />
              </div>
              <div className="flex-column title-column-subdetails">
                <Link
                  className="bolt-link subtle"
                  href={tableItem.sourceBranchHref}
                  target="_blank"
                >
                  {tableItem.sourceBranch!.branchName}
                </Link>
              </div>
              <div className="flex-column title-column-subdetails icon-column-subdetails">
                <Icon iconName="BranchMerge" />
              </div>
              <div className="flex-column title-column-subdetails">
                <Link
                  className="bolt-link subtle"
                  href={tableItem.targetBranchHref}
                  target="_blank"
                >
                  {tableItem.targetBranch!.branchName}
                </Link>
              </div>
            </div>
          </div>
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
            className="button-icon-bold"
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
            className="button-icon"
            text={
              tableItem.comment.terminatedComment.toString() +
              "/" +
              tableItem.comment.totalcomment.toString()
            }
            iconProps={{ iconName: "ActivityFeed" }}
            tooltipProps={{
              text:
                tableItem.comment.terminatedComment.toString() +
                " out of " +
                tableItem.comment.totalcomment.toString() +
                " comments are marked as resolved, won't fix, or closed",
              delayMs: 500
            }}
            subtle={true}
          />

          <Icon
            key={`pr-${tableItem.gitPullRequest.pullRequestId}`}
            className={
              tableItem.isAllPoliciesOk !== undefined
                ? tableItem.isAllPoliciesOk
                  ? "icon-policy-green"
                  : "icon-policy-red"
                : ""
            }
            iconName="Ribbon"
            tooltipProps={{
              renderContent: () => {
                return (
                  <table className="table-border-spacing">
                    <thead>
                    <tr>
                      <td colSpan={2}>
                        <b>Policies</b>
                      </td>
                    </tr>
                    </thead>
                    <tbody>
                    {tableItem.policies !== undefined &&
                    tableItem.policies.length > 0 ? (
                      tableItem.policies.map(policy => {
                        return policy.isReviewersApprovedOk !== undefined ? (
                            <tr key={`pr-status1-tr-${policy.id}-${tableItem.gitPullRequest.pullRequestId}`}>
                              <td className="td-vertical-align">
                              <span className={`fabric-icon ms-Icon--${policy.isReviewersApprovedOk ? "StatusCircleCheckmark icon-green" : "StatusCircleErrorX icon-red"}`} />
                              </td>
                              <td className="span-tooltip">
                                {policy.reviewerCount} of{" "}
                                at least {policy.minimumApproverCount} reviewers approved
                              </td>
                            </tr>
                        ) : policy.isRequiredReviewerOk !== undefined ? (
                          <tr key={`pr-status2-tr-${policy.id}-${tableItem.gitPullRequest.pullRequestId}`}>
                              <td className="td-vertical-align">
                              <span className={`fabric-icon ms-Icon--${policy.isRequiredReviewerOk ? "StatusCircleCheckmark icon-green" : "StatusCircleErrorX icon-red"}`} />
                              </td>
                              <td className="span-tooltip">
                                Required reviewers approved
                                {policy.requiredReviewers !== undefined &&
                                policy.requiredReviewers.length > 0 &&
                                policy.requiredReviewers[0].displayName !== ""
                                  ? " - " +
                                    policy.requiredReviewers[0].displayName
                                  : null}
                              </td>
                            </tr>
                        ) : policy.isWorkItemOk !== undefined ? (
                          <tr key={`pr-status3-tr-${policy.id}-${tableItem.gitPullRequest.pullRequestId}`}>
                              <td className="td-vertical-align">
                              <span className={`fabric-icon ms-Icon--${policy.isWorkItemOk ? "StatusCircleCheckmark icon-green" : "StatusCircleErrorX icon-red"}`} />
                              </td>
                              <td className="span-tooltip">
                                Work items linked
                              </td>
                            </tr>
                        ) : policy.isCommentOk !== undefined ? (
                          <tr key={`pr-status4-tr-${policy.id}-${tableItem.gitPullRequest.pullRequestId}`}>
                              <td className="td-vertical-align">
                              <span className={`fabric-icon ms-Icon--${policy.isCommentOk ? "StatusCircleCheckmark icon-green" : "StatusCircleErrorX icon-red"}`} />
                              </td>
                              <td className="span-tooltip">
                                All comments resolved
                              </td>
                            </tr>
                        ) : policy.isBuildOk !== undefined ? (
                          <tr key={`pr-status5-tr-${policy.id}-${tableItem.gitPullRequest.pullRequestId}`}>
                              <td className="td-vertical-align">
                              <span className={`fabric-icon ms-Icon--${policy.isBuildOk ? "StatusCircleCheckmark icon-green" : "StatusCircleErrorX icon-red"}`} />
                              </td>
                              <td className="span-tooltip">Build {policy.isBuildOk ? "" : "not"} succeeded</td>
                            </tr>
                        ) : null;
                      })
                    ) : (
                      <tr key={`pr-status6-tr-nopolicy-${tableItem.gitPullRequest.pullRequestId}`}>
                        <td colSpan={2}>- No policies</td>
                      </tr>
                    )}
                    </tbody>
                  </table>
                );
              }
            }}
          />

          <Button
            className="button-spaceicon-bold"
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
          <Button
            className="button-icon"
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
              className="fontSize font-size"
              tooltipProps={{
                text: `When the last commit was done`,
                delayMs: 500
              }}
              startDate={
                tableItem.lastCommitDetails === undefined ||
                tableItem.lastCommitDetails.committer === undefined
                  ? tableItem.gitPullRequest.creationDate
                  : tableItem.lastCommitDetails!.committer.date!
              }
              endDate={new Date(Date.now())}
            />
          </Button>
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
