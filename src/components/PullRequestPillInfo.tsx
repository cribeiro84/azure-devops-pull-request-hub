import * as React from "react";

import { Pill } from "azure-devops-ui/Pill";
import { getPillSizeValue, getPillVariantValue } from "../models/constants";
import * as Data from "../tabs/PulRequestsTabData";
import { PullRequestAsyncStatus } from "azure-devops-extension-api/Git/Git";
import { PullRequestModel } from "../tabs/PulRequestsTabData";
import { ConditionalChildren } from "azure-devops-ui/ConditionalChildren";
import { PillGroup } from "azure-devops-ui/PillGroup";

import "./Columns.scss";

export function PullRequestPillInfo(props: any): JSX.Element {
  const pullRequest: PullRequestModel = props.pullRequest;

  return (
    <PillGroup>
      <ConditionalChildren renderChildren={pullRequest.gitPullRequest.isDraft}>
        <Pill className="pill pill-draft" variant={getPillVariantValue("outlined")} size={getPillSizeValue("medium")}>
          draft
        </Pill>
      </ConditionalChildren>
      <ConditionalChildren renderChildren={hasPullRequestFailure(pullRequest)}>
        <Pill className="pill pill-conflicts" variant={getPillVariantValue("outlined")} size={getPillSizeValue("medium")}>
          {getPullRequestFailureDescription(pullRequest)}
        </Pill>
      </ConditionalChildren>
      <ConditionalChildren renderChildren={pullRequest.isAutoCompleteSet}>
        <Pill className="pill pill-autocomplete" variant={getPillVariantValue("outlined")} size={getPillSizeValue("medium")}>
          auto-complete
        </Pill>
      </ConditionalChildren>
    </PillGroup>
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

function getPullRequestFailureDescription(
  pullRequest: Data.PullRequestModel
): string {
  const prMergeStatus = pullRequest.gitPullRequest.mergeStatus;
  switch (prMergeStatus) {
    case PullRequestAsyncStatus.RejectedByPolicy:
      return "Rejected by Policy";
    default:
      return PullRequestAsyncStatus[prMergeStatus].toLocaleLowerCase();
  }
}
