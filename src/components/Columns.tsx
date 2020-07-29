import "./Columns.scss";

import * as React from "react";
import * as Data from "../tabs/PulRequestsTabData";

import { ITableColumn, TwoLineTableCell } from "azure-devops-ui/Table";
import { Button } from "azure-devops-ui/Button";
import { Status, StatusSize } from "azure-devops-ui/Status";
import { IIconProps, Icon, IconSize } from "azure-devops-ui/Icon";
import { Ago } from "azure-devops-ui/Ago";
import { Duration } from "azure-devops-ui/Duration";
import { Tooltip } from "azure-devops-ui/TooltipEx";
import {
  ReviewerVoteIconStatus,
  GetVoteIconColor,
} from "./ReviewerVoteIconStatus";
import { VssPersona } from "azure-devops-ui/VssPersona";
import { PullRequestPillInfo } from "./PullRequestPillInfo";
import { Link, Spinner, SpinnerSize } from "office-ui-fabric-react";
import * as PullRequestModel from "../models/PullRequestModel";
import { PillGroup } from "azure-devops-ui/PillGroup";
import { Pill, PillSize, PillVariant } from "azure-devops-ui/Pill";
import { ConditionalChildren } from "azure-devops-ui/ConditionalChildren";
import { Observer } from "azure-devops-ui/Observer";

export function openNewWindowTab(targetUrl: string): void {
  window.open(targetUrl, "_blank");
}

export function StatusColumn(
  rowIndex: number,
  columnIndex: number,
  tableColumn: ITableColumn<PullRequestModel.PullRequestModel>,
  tableItem: PullRequestModel.PullRequestModel
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
            text: tableItem.pullRequestProgressStatus!.statusProps.ariaLabel,
          }}
          disabled={true}
          subtle={true}
        >
          <Observer isStillLoading={tableItem.isStillLoading()}>
            {(props: { isStillLoading: boolean }) => {
              return props.isStillLoading ? (
                <Spinner size={SpinnerSize.medium} />
              ) : (
                <Status
                  {...tableItem.pullRequestProgressStatus!.statusProps}
                  className="icon-large-margin"
                  size={StatusSize.l}
                />
              );
            }}
          </Observer>
        </Button>
      }
      line2={<div />}
    />
  );
}

export function TitleColumn(
  rowIndex: number,
  columnIndex: number,
  tableColumn: ITableColumn<PullRequestModel.PullRequestModel>,
  tableItem: PullRequestModel.PullRequestModel
): JSX.Element {
  const tooltip = `from ${tableItem.sourceBranch!.branchName} into ${
    tableItem.targetBranch!.branchName
  }`;

  const onClickPullRequestTitleHandler = (
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
  ) => {
    tableItem.saveLastVisit();
    openNewWindowTab(tableItem.pullRequestHref!);
  };

  return (
    <TwoLineTableCell
      className="bolt-table-cell-content-with-inline-link no-v-padding"
      key={"col-" + columnIndex}
      columnIndex={columnIndex}
      tableColumn={tableColumn}
      line1={
        <div className="flex-row scroll-hidden flex-wrap">
          <Button
            className="branch-button"
            text={tableItem.title}
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
            <div className="flex-row flex-wrap">
              <div className="flex-column">
                <Link
                  className="bolt-link subtle"
                  href={tableItem.repositoryHref}
                  target="_blank"
                >
                  <Icon iconName="GitLogo" className="icon-column-subdetails" />
                  {tableItem.gitPullRequest.repository.name}
                </Link>
              </div>
              <div className="flex-column">
                <Link
                  className="bolt-link subtle"
                  href={tableItem.sourceBranchHref}
                  target="_blank"
                >
                  <Icon iconName="BranchMerge" className="icon-column-subdetails" />
                  {tableItem.sourceBranch!.branchName}
                </Link>
              </div>
              <div className="flex-column">
                <Link
                  className="bolt-link subtle"
                  href={tableItem.targetBranchHref}
                  target="_blank"
                >
                  <Icon iconName="BranchMerge" className="icon-column-subdetails" />
                  {tableItem.targetBranch!.branchName}
                </Link>
              </div>
            </div>
            <ConditionalChildren renderChildren={tableItem.labels.length > 0}>
              <div className="flex-row flex-grow flex-wrap">
                <div
                  className="flex-column title-column-subdetails"
                  style={{ marginLeft: "6px", marginTop: "5px" }}
                ></div>
                <div
                  className="flex-column title-column-subdetails"
                  style={{ marginLeft: "6px", marginTop: "5px" }}
                >
                  <PillGroup>
                    {tableItem.labels.map((t) => {
                      return <Pill key={t.name}>{t.name}</Pill>;
                    })}
                  </PillGroup>
                </div>
              </div>
            </ConditionalChildren>
          </div>
        </Tooltip>
      }
    />
  );
}

export function DetailsColumn(
  rowIndex: number,
  columnIndex: number,
  tableColumn: ITableColumn<PullRequestModel.PullRequestModel>,
  tableItem: PullRequestModel.PullRequestModel
): JSX.Element {
  return (
    <TwoLineTableCell
      className="bolt-table-cell-content-with-inline-link no-v-padding"
      key={"col-" + columnIndex}
      columnIndex={columnIndex}
      tableColumn={tableColumn}
      line1={
        <div>
          <Button
            className="button-icon"
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
              },
            }}
            tooltipProps={{
              text: tableItem.gitPullRequest.createdBy.displayName,
              delayMs: 500,
            }}
            subtle={true}
          />
        </div>
      }
      line2={
        <div className="flex-row">
          <div className="flex-column">
            <Icon
              className={`icon-column-subdetails ${tableItem.isAllPoliciesOk !== undefined
                ? tableItem.isAllPoliciesOk
                  ? "icon-policy-green"
                  : "icon-policy-red"
                : ""}`}
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
                          tableItem.policies.map((policy) => {
                            return policy.isReviewersApprovedOk !==
                              undefined ? (
                              <tr
                                key={`pr-status1-tr-${policy.id}-${tableItem.gitPullRequest.pullRequestId}`}
                              >
                                <td className="td-vertical-align">
                                  <span
                                    className={`fabric-icon ms-Icon--${
                                      policy.isReviewersApprovedOk
                                        ? "StatusCircleCheckmark icon-green"
                                        : "StatusCircleErrorX icon-red"
                                    }`}
                                  />
                                </td>
                                <td className="span-tooltip">
                                  {policy.reviewerCount} of at least{" "}
                                  {policy.minimumApproverCount} reviewers
                                  approved
                                </td>
                              </tr>
                            ) : policy.isRequiredReviewerOk !== undefined ? (
                              <tr
                                key={`pr-status2-tr-${policy.id}-${tableItem.gitPullRequest.pullRequestId}`}
                              >
                                <td className="td-vertical-align">
                                  <span
                                    className={`fabric-icon ms-Icon--${
                                      policy.isRequiredReviewerOk
                                        ? "StatusCircleCheckmark icon-green"
                                        : "StatusCircleErrorX icon-red"
                                    }`}
                                  />
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
                              <tr
                                key={`pr-status3-tr-${policy.id}-${tableItem.gitPullRequest.pullRequestId}`}
                              >
                                <td className="td-vertical-align">
                                  <span
                                    className={`fabric-icon ms-Icon--${
                                      policy.isWorkItemOk
                                        ? "StatusCircleCheckmark icon-green"
                                        : "StatusCircleErrorX icon-red"
                                    }`}
                                  />
                                </td>
                                <td className="span-tooltip">
                                  Work items linked
                                </td>
                              </tr>
                            ) : policy.isCommentOk !== undefined ? (
                              <tr
                                key={`pr-status4-tr-${policy.id}-${tableItem.gitPullRequest.pullRequestId}`}
                              >
                                <td className="td-vertical-align">
                                  <span
                                    className={`fabric-icon ms-Icon--${
                                      policy.isCommentOk
                                        ? "StatusCircleCheckmark icon-green"
                                        : "StatusCircleErrorX icon-red"
                                    }`}
                                  />
                                </td>
                                <td className="span-tooltip">
                                  All comments resolved
                                </td>
                              </tr>
                            ) : policy.isBuildOk !== undefined ? (
                              <tr
                                key={`pr-status5-tr-${policy.id}-${tableItem.gitPullRequest.pullRequestId}`}
                              >
                                <td className="td-vertical-align">
                                  <span
                                    className={`fabric-icon ms-Icon--${
                                      policy.isBuildOk
                                        ? "StatusCircleCheckmark icon-green"
                                        : "StatusCircleErrorX icon-red"
                                    }`}
                                  />
                                </td>
                                <td className="span-tooltip">
                                  Build {policy.isBuildOk ? "" : "not"}{" "}
                                  succeeded
                                </td>
                              </tr>
                            ) : null;
                          })
                        ) : (
                          <tr
                            key={`pr-status6-tr-nopolicy-${tableItem.gitPullRequest.pullRequestId}`}
                          >
                            <td colSpan={2}>- No policies</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  );
                },
              }}
            />
          </div>
          <div className="flex-column">
            <Button
              className="button-icon fontSize font-size second-line-row"
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
                delayMs: 500,
              }}
              subtle={true}
            />
          </div>
          <div className="flex-column">
            <Link
              className="bolt-link subtle"
              href={tableItem.lastCommitUrl!}
              target="_blank"
            >
              <Icon iconName="BranchCommit"  />
              {tableItem.lastShortCommitId}
            </Link>
          </div>
          <ConditionalChildren
            renderChildren={
              tableItem.lastVisit && tableItem.lastVisit < tableItem.getLastCommitDate()
            }
          >
            <div className="flex-column">
              <Tooltip
              text="Pull Request has updates since your last access">
              <Pill
                size={PillSize.compact}
                variant={PillVariant.colored}
                color={Data.draftColor}
                className="icon-column-subdetails"
              >
                New
              </Pill>
              </Tooltip>
            </div>
          </ConditionalChildren>
        </div>
      }
    />
  );
}

export function DateColumn(
  rowIndex: number,
  columnIndex: number,
  tableColumn: ITableColumn<PullRequestModel.PullRequestModel>,
  tableItem: PullRequestModel.PullRequestModel
): JSX.Element {
  return (
    <TwoLineTableCell
      key={"col-" + columnIndex}
      columnIndex={columnIndex}
      tableColumn={tableColumn}
      line1={
        <div className="flex-row">
          <div className="flex-column">
            {WithIcon({
              className: "fontSize font-size",
              iconProps: { iconName: "Calendar" },
              children: (
                <Ago
                  date={tableItem.gitPullRequest.creationDate!}
                  tooltipProps={{ text: "Created on" }}
                />
              ),
              disabled: false,
            })}
          </div>
        </div>
      }
      line2={
        <div className="flex-row flex-wrap">
          <div className="flex-column title-column-subdetails">
            <Button
              className="button-icon"
              iconProps={{ iconName: "Clock", size: IconSize.small }}
              subtle={true}
              disabled={true}
            >
              <Duration
                startDate={tableItem.gitPullRequest.creationDate!}
                endDate={new Date(Date.now())}
                tooltipProps={{ text: "Time elapsed since its creation" }}
              />
            </Button>
          </div>
        </div>
      }
    />
  );
}

export function ReviewersColumn(
  rowIndex: number,
  columnIndex: number,
  tableColumn: ITableColumn<PullRequestModel.PullRequestModel>,
  tableItem: PullRequestModel.PullRequestModel
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
                        <div className="flex-row justify-start">
                          <VssPersona
                            imageUrl={reviewer._links.avatar.href}
                            size={"medium"}
                            displayName={reviewer.displayName}
                          />
                          <span className="margin-8">
                            {reviewer.displayName}
                          </span>
                        </div>
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
                      className={`icon-margin repos-pr-reviewer-vote-avatar ${GetVoteIconColor(
                        reviewer
                      )}`}
                      imageUrl={reviewer._links.avatar.href}
                      size={"medium"}
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

function WithIcon(props: {
  className?: string;
  iconProps: IIconProps;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button
      className="button-icon fontSize font-size"
      iconProps={props.iconProps}
      subtle={true}
      disabled={props.disabled}
    >
      {props.children}
    </Button>
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
