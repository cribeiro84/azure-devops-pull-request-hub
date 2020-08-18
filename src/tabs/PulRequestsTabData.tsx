import {
  GitRepository,
  GitPullRequestSearchCriteria,
  PullRequestStatus,
  IdentityRefWithVote,
} from "azure-devops-extension-api/Git/Git";
import { IStatusProps } from "azure-devops-ui/Status";
import { IColor } from "azure-devops-ui/Utilities/Color";
import { IdentityRef } from "azure-devops-extension-api/WebApi/WebApi";
import {
  TeamProjectReference,
  WebApiTagDefinition,
} from "azure-devops-extension-api/Core/Core";
import { PullRequestModel } from "../models/PullRequestModel";

export const refsPreffix = "refs/heads/";

export const approvedLightColor: IColor = {
  red: 231,
  green: 242,
  blue: 231,
};

export const approvedWithSuggestionsLightColor: IColor = {
  red: 231,
  green: 242,
  blue: 231,
};

export const noVoteLightColor: IColor = {
  red: 218,
  green: 227,
  blue: 243,
};

export const waitingAuthorLightColor: IColor = {
  red: 255,
  green: 249,
  blue: 230,
};

export const rejectedLightColor: IColor = {
  red: 250,
  green: 235,
  blue: 235,
};

export const autoCompleteColor: IColor = {
  red: 235,
  green: 121,
  blue: 8,
};

export const reviewerVoteToIColorLight = (vote: number | string) => {
  const colorMap: Record<string, IColor> = {
    "10": approvedLightColor,
    "5": approvedWithSuggestionsLightColor,
    "0": noVoteLightColor,
    "-5": waitingAuthorLightColor,
    "-10": rejectedLightColor,
  };
  return colorMap[vote];
};

export enum ReviewerVoteOption {
  Approved = 10,
  ApprovedWithSuggestions = 5,
  Rejected = -10,
  WaitingForAuthor = -5,
  NoVote = 0,
}

export enum YesOrNo {
  No = 0,
  Yes = 1,
}

export enum AlternateStatusPr {
  AutoComplete = "Auto Complete",
  Conflicts = "Conflicts",
  HasNewChanges = "Has New Changes",
  IsDraft = "Is Draft",
  NotAutoComplete = "Not Auto Complete",
  NotConflicts = "Not Conflicts",
  NotIsDraft = "Not Draft",
  NotReadyForCompletion = "Not Ready for Completion",
  ReadForCompletion = "Ready for Completion",
}

export class BranchDropDownItem {
  private DISPLAY_NAME: string = "";

  constructor(public repositoryName: string, public branchName: string) {
    this.branchName = this.branchName.replace(refsPreffix, "");
    this.DISPLAY_NAME = `${this.repositoryName}->${this.branchName}`;
  }

  public get displayName(): string {
    return this.DISPLAY_NAME;
  }
}

export class PullRequestPolicy {
  public id: string = "";
  public displayName: string = "";
  public isApproved: boolean = false;
}

export class PullRequestRequiredReviewer {
  public id: string = "";
  public displayName: string = "";
}

export class PullRequestComment {
  public terminatedComment: number = 0;
  public totalcomment: number = 0;
  public lastUpdatedDate?: Date;
}

export interface IStatusIndicatorData {
  statusProps: IStatusProps;
  label: string;
}

export const approvedColor: IColor = {
  red: 51,
  green: 204,
  blue: 51,
};

export const waitingAuthorColor: IColor = {
  red: 179,
  green: 179,
  blue: 0,
};

export const approvedWithSuggestionsColor: IColor = {
  red: 0,
  green: 204,
  blue: 153,
};

export const noVoteColor: IColor = {
  red: 230,
  green: 230,
  blue: 230,
};

export const rejectedColor: IColor = {
  red: 151,
  green: 30,
  blue: 79,
};

export const draftColor: IColor = {
  red: 14,
  green: 180,
  blue: 250,
};

export const pullRequestCriteria: GitPullRequestSearchCriteria = {
  repositoryId: "",
  creatorId: "",
  includeLinks: true,
  reviewerId: "",
  sourceRefName: "",
  sourceRepositoryId: "",
  status: PullRequestStatus.Active,
  targetRefName: "",
};

export interface IPullRequestsTabState {
  projects: TeamProjectReference[];
  pullRequests: PullRequestModel[];
  repositories: GitRepository[];
  createdByList: IdentityRef[];
  sourceBranchList: BranchDropDownItem[];
  targetBranchList: BranchDropDownItem[];
  reviewerList: IdentityRefWithVote[];
  tagList: WebApiTagDefinition[];
  loading: boolean;
  errorMessage: string;
  pullRequestCount: number;
  savedProjects: string[];
}

export function sortMethod(
  a:
    | BranchDropDownItem
    | IdentityRef
    | WebApiTagDefinition
    | GitRepository
    | TeamProjectReference,
  b:
    | BranchDropDownItem
    | IdentityRef
    | WebApiTagDefinition
    | GitRepository
    | TeamProjectReference
) {
  if (a.hasOwnProperty("displayName")) {
    const convertedA = a as BranchDropDownItem | IdentityRef;
    const convertedB = b as BranchDropDownItem | IdentityRef;
    if (convertedA.displayName! < convertedB.displayName!) {
      return -1;
    }
    if (convertedA.displayName! > convertedB.displayName!) {
      return 1;
    }
  } else if (a.hasOwnProperty("name")) {
    const convertedA = a as
      | WebApiTagDefinition
      | GitRepository
      | TeamProjectReference;
    const convertedB = b as
      | WebApiTagDefinition
      | GitRepository
      | TeamProjectReference;
    if (convertedA.name < convertedB.name) {
      return -1;
    }
    if (convertedA.name > convertedB.name) {
      return 1;
    }
  }
  return 0;
}
