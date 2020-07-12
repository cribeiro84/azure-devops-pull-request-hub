import * as React from "react";

import * as Data from "../tabs/PulRequestsTabData";
import { IdentityRefWithVote } from "azure-devops-extension-api/Git/Git";
import { Statuses, Status } from "azure-devops-ui/Status";
import { getStatusSizeValue } from "../models/constants";

export function GetVoteIconColor(reviewer: IdentityRefWithVote): string {
  switch (Data.ReviewerVoteOption[reviewer.vote]) {
    case "Approved":
      return "repos-pr-reviewer-vote-approvedLightColor";
    case "ApprovedWithSuggestions":
      return "repos-pr-reviewer-vote-approvedWithSuggestionsLightColor";
    case "Rejected":
      return "repos-pr-reviewer-vote-rejectedLightColor";
    case "WaitingForAuthor":
      return "repos-pr-reviewer-vote-waitingAuthorLightColor";
  }

  return "repos-pr-reviewer-vote-noVoteLightColor";
};

export function ReviewerVoteIconStatus(props: any): JSX.Element {
  let voteStatusIcon = Statuses.Waiting;
  const reviewer: IdentityRefWithVote = props.reviewer;

  switch (Data.ReviewerVoteOption[reviewer.vote]) {
    case "Approved":
      voteStatusIcon = Statuses.Success;
      break;
    case "ApprovedWithSuggestions":
      voteStatusIcon = Statuses.Success;
      break;
    case "Rejected":
      voteStatusIcon = Statuses.Failed;
      break;
    case "WaitingForAuthor":
      voteStatusIcon = Statuses.Warning;
      break;
  }

  return (
    <Status
      {...voteStatusIcon}
      key="success"
      size={getStatusSizeValue("m")}
      className={props.className}
    />
  );
}
