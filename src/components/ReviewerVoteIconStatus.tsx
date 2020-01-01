import * as React from "react";

import * as Data from "../tabs/PulRequestsTabData";
import { IdentityRefWithVote } from "azure-devops-extension-api/Git/Git";
import { Statuses, Status } from "azure-devops-ui/Status";
import { getStatusSizeValue } from "../models/constants";

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
