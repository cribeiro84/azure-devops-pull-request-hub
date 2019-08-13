import {
  GitRepository,
  GitPullRequest,
  GitPullRequestSearchCriteria,
  PullRequestStatus,
  IdentityRefWithVote
} from "azure-devops-extension-api/Git/Git";
import * as DevOps from "azure-devops-extension-sdk";
import {
  IStatusProps
} from "azure-devops-ui/Status";
import { IColor } from "azure-devops-ui/Utilities/Color";
import { IProjectInfo } from "azure-devops-extension-api/Common/CommonServices";
import { IdentityRef } from "azure-devops-extension-api/WebApi/WebApi";

export const refsPreffix = "refs/heads/";

export class BranchDropDownItem {
  public repositoryName?: string;
  public branchName?: string;
}

export class PullRequestModel {
  public pullRequestHref?: string;
  public sourceBranchName?: string;
  public targetBranchName?: string;
  public sourceBranchHref?: string;
  public targetBranchHref?: string;
  public baseUrl?: string;

  constructor(public gitPullRequest: GitPullRequest, public projectName: string)
  {
    this.setupPullRequest();
  }

  private setupPullRequest() {
    const url = new URL(document.referrer);

    this.baseUrl = url.origin + '/' + url.pathname.split('/')[0];
    this.sourceBranchName = this.gitPullRequest.sourceRefName.replace(refsPreffix, '');
    this.targetBranchName = this.gitPullRequest.targetRefName.replace(refsPreffix, '');
    this.pullRequestHref = `${this.baseUrl}/${DevOps.getHost().name}/${this.projectName}/_git/${this.gitPullRequest.repository.name}/pullrequest/${this.gitPullRequest.pullRequestId}`;
    this.sourceBranchHref = `${this.baseUrl}/${DevOps.getHost().name}/${this.projectName}/_git/${this.gitPullRequest.repository.name}?version=GB${this.sourceBranchName}`;
    this.targetBranchHref = `${this.baseUrl}/${DevOps.getHost().name}/${this.projectName}/_git/${this.gitPullRequest.repository.name}?version=GB${this.targetBranchName}`;
  };

  public static getModels (pullRequestList: GitPullRequest[] | undefined, projectName: string): PullRequestModel[] {
    let modelList: PullRequestModel[] = [];

    pullRequestList!.map(pr => {
      modelList.push(new PullRequestModel(pr, projectName));

      return pr;
    });

    return modelList;
  }
}

export enum ReviewerVoteOption {
  Approved = 10,
  ApprovedWithSuggestions = 5,
  Rejected = -10,
  WaitingForAuthor = -5,
  NoVote = 0
}

export interface IStatusIndicatorData {
  statusProps: IStatusProps;
  label: string;
}

export const approvedColor: IColor = {
  red: 0,
  green: 102,
  blue: 0
};

export const waitingAuthorColor: IColor = {
  red: 179,
  green: 179,
  blue: 0
};

export const approvedWithSuggestionsColor: IColor = {
  red: 0,
  green: 204,
  blue: 153
};

export const noVoteColor: IColor = {
  red: 128,
  green: 128,
  blue: 128
};

export const rejectedColor: IColor = {
  red: 151,
  green: 30,
  blue: 79
};

export const draftColor: IColor = {
  red: 14,
  green: 180,
  blue: 250
};

export enum PullRequestVoteStatus {
  pending = "Pending",
  waitingForAuthor = "Waiting for Author",
  rejected = "Rejected",
  approved = "Approved",
  approvedWithSuggestions = "Approved with Suggestions"
}

export const pullRequestCriteria: GitPullRequestSearchCriteria = {
  repositoryId: "",
  creatorId: "",
  includeLinks: true,
  reviewerId: "",
  sourceRefName: "",
  sourceRepositoryId: "",
  status: PullRequestStatus.Active,
  targetRefName: ""
};

export interface IPullRequestsTabState {
  currentProject?: IProjectInfo | undefined;
  pullRequests: PullRequestModel[];
  repositories: GitRepository[];
  creadtedByList: IdentityRef[];
  sourceBranchList: BranchDropDownItem[];
  targetBranchList: BranchDropDownItem[];
  reviewerList: IdentityRefWithVote[];
}
