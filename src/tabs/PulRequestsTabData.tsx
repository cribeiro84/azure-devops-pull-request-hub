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

export enum ReviewerVoteOption {
  Approved = 10,
  ApprovedWithSuggestions = 5,
  Rejected = -10,
  WaitingForAuthor = -5,
  NoVote = 0
}

export enum YesOrNo {
  No = 0,
  Yes = 1
}

export class BranchDropDownItem {
  private _displayName: string = "";

  constructor(public repositoryName: string, public branchName: string)
  {
    this.branchName = this.branchName.replace(refsPreffix, '');
    this._displayName = `${this.repositoryName}->${this.branchName}`;
  }

  public get displayName(): string {
    return this._displayName;
  }
}

export class PullRequestModel {
  public title?: string;
  public pullRequestHref?: string;
  public repositoryHref?: string;
  public sourceBranch?: BranchDropDownItem;
  public targetBranch?: BranchDropDownItem;
  public sourceBranchHref?: string;
  public targetBranchHref?: string;
  public baseUrl?: string;
  public myApprovalStatus?: ReviewerVoteOption;
  public currentUser: DevOps.IUserContext = DevOps.getUser();
  public lastCommitId?: string;
  public lastShortCommitId?: string;
  public lastCommitUrl?: string;

  constructor(public gitPullRequest: GitPullRequest, public projectName: string)
  {
    this.setupPullRequest();
  }

  private setupPullRequest() {
    const url = new URL(document.referrer);
    this.baseUrl = url.origin + '/' + url.pathname.split('/')[0];
    const baseHostUrl = `${this.baseUrl}/${DevOps.getHost().name}/${this.projectName}`;
    this.title = `${this.gitPullRequest.pullRequestId} - ${this.gitPullRequest.title}`;
    this.sourceBranch = new BranchDropDownItem(this.gitPullRequest.repository.name, this.gitPullRequest.sourceRefName);
    this.targetBranch = new BranchDropDownItem(this.gitPullRequest.repository.name, this.gitPullRequest.targetRefName);
    this.repositoryHref = `${baseHostUrl}/_git/${this.gitPullRequest.repository.name}/`;
    this.pullRequestHref = `${baseHostUrl}/_git/${this.gitPullRequest.repository.name}/pullrequest/${this.gitPullRequest.pullRequestId}`;
    this.sourceBranchHref = `${baseHostUrl}/_git/${this.gitPullRequest.repository.name}?version=GB${this.sourceBranch.branchName}`;
    this.targetBranchHref = `${baseHostUrl}/_git/${this.gitPullRequest.repository.name}?version=GB${this.targetBranch.branchName}`;
    this.myApprovalStatus = this.getCurrentUserVoteStatus(this.gitPullRequest.reviewers);
    this.lastCommitId = this.gitPullRequest.lastMergeSourceCommit.commitId;
    this.lastShortCommitId = this.lastCommitId.substr(0, 8);
    this.lastCommitUrl = `${baseHostUrl}/_git/${this.gitPullRequest.repository.name}/commit/${this.lastCommitId}?refName=GB${this.gitPullRequest.sourceRefName}`;
  };

  private getCurrentUserVoteStatus(reviewers: IdentityRefWithVote[]): ReviewerVoteOption {
    let voteResult = ReviewerVoteOption.NoVote;
    if (reviewers && reviewers.length > 0) {
      const currentUserReviewer = reviewers.filter(r => r.id === this.currentUser.id);

      if (currentUserReviewer.length > 0) {
        voteResult = currentUserReviewer[0].vote as ReviewerVoteOption;
      }
    }

    return voteResult;
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

export interface IStatusIndicatorData {
  statusProps: IStatusProps;
  label: string;
}

export const approvedColor: IColor = {
  red: 51,
  green: 204,
  blue: 51
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
  red: 230,
  green: 230,
  blue: 230
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
  createdByList: IdentityRef[];
  sourceBranchList: BranchDropDownItem[];
  targetBranchList: BranchDropDownItem[];
  reviewerList: IdentityRefWithVote[];
  loading: boolean;
}
