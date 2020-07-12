import * as React from "react";

import { Pill } from "azure-devops-ui/Pill";
import { getPillSizeValue, getPillVariantValue, hasPullRequestFailure, hasPullRequestReviewerRequired } from "../models/constants";
import * as PullRequestModel from "../models/PullRequestModel";
import { PullRequestAsyncStatus } from "azure-devops-extension-api/Git/Git";
import { ConditionalChildren } from "azure-devops-ui/ConditionalChildren";
import { PillGroup } from "azure-devops-ui/PillGroup";

import "./Columns.scss";

export function PullRequestPillInfo(props: any): JSX.Element {
  const pullRequest: PullRequestModel.PullRequestModel = props.pullRequest;

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
      <ConditionalChildren renderChildren={hasPullRequestReviewerRequired(pullRequest, true)}>
        <Pill className="pill pill-required" variant={getPillVariantValue("outlined")} size={getPillSizeValue("medium")} >
          review required
        </Pill>
      </ConditionalChildren>
    </PillGroup>
  );
}

function getPullRequestFailureDescription(
  pullRequest: PullRequestModel.PullRequestModel
): string {
  const prMergeStatus = pullRequest.gitPullRequest.mergeStatus;
  switch (prMergeStatus) {
    case PullRequestAsyncStatus.RejectedByPolicy:
      return "Rejected by Policy";
    default:
      return PullRequestAsyncStatus[prMergeStatus].toLocaleLowerCase();
  }
}
