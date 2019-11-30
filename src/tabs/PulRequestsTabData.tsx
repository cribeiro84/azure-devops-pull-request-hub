import {
  GitRepository,
  GitPullRequest,
  GitPullRequestSearchCriteria,
  PullRequestStatus,
  IdentityRefWithVote,
  GitCommitRef
} from "azure-devops-extension-api/Git/Git";
import * as DevOps from "azure-devops-extension-sdk";
import { IStatusProps } from "azure-devops-ui/Status";
import { IColor } from "azure-devops-ui/Utilities/Color";
import { IProjectInfo } from "azure-devops-extension-api/Common/CommonServices";
import { IdentityRef } from "azure-devops-extension-api/WebApi/WebApi";
import { Statuses } from "azure-devops-ui/Status";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { getClient } from "azure-devops-extension-api";
import { GitRestClient } from "azure-devops-extension-api/Git/GitClient";
import { TeamProjectReference } from "azure-devops-extension-api/Core/Core";

export const refsPreffix = "refs/heads/";

export const approvedLightColor: IColor = {
  red: 231,
  green: 242,
  blue: 231
};

export const approvedWithSuggestionsLightColor: IColor = {
  red: 231,
  green: 242,
  blue: 231
};

export const noVoteLightColor: IColor = {
  red: 218,
  green: 227,
  blue: 243
};

export const waitingAuthorLightColor: IColor = {
  red: 255,
  green: 249,
  blue: 230
};

export const rejectedLightColor: IColor = {
  red: 250,
  green: 235,
  blue: 235
};

export const autoCompleteColor: IColor = {
  red: 235,
  green: 121,
  blue: 8
};

export const reviewerVoteToIColorLight = (vote: number | string) => {
  const colorMap: Record<string, IColor> = {
    "10": approvedLightColor,
    "5": approvedWithSuggestionsLightColor,
    "0": noVoteLightColor,
    "-5": waitingAuthorLightColor,
    "-10": rejectedLightColor
  };
  return colorMap[vote];
};

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

  constructor(public repositoryName: string, public branchName: string) {
    this.branchName = this.branchName.replace(refsPreffix, "");
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
  public myApprovalStatus?: ReviewerVoteOption;
  public currentUser: DevOps.IUserContext = DevOps.getUser();
  public lastCommitId?: string;
  public lastShortCommitId?: string;
  public lastCommitUrl?: string;
  public pullRequestProgressStatus?: IStatusIndicatorData;
  public lastCommitDetails: ObservableValue<
    GitCommitRef | undefined
  > = new ObservableValue(undefined);
  public isAutoCompleteSet: ObservableValue<boolean> = new ObservableValue(
    false
  );

  private gitClient: GitRestClient = getClient(GitRestClient);

  constructor(
    public gitPullRequest: GitPullRequest,
    public projectName: string,
    public baseUrl: string
  ) {
    this.setupPullRequest();
  }

  private async setupPullRequest() {
    const baseHostUrl = `${this.baseUrl}${this.projectName}`;
    this.title = `${this.gitPullRequest.pullRequestId} - ${this.gitPullRequest.title}`;
    this.sourceBranch = new BranchDropDownItem(
      this.gitPullRequest.repository.name,
      this.gitPullRequest.sourceRefName
    );
    this.targetBranch = new BranchDropDownItem(
      this.gitPullRequest.repository.name,
      this.gitPullRequest.targetRefName
    );
    this.repositoryHref = `${baseHostUrl}/_git/${this.gitPullRequest.repository.name}/`;
    this.pullRequestHref = `${baseHostUrl}/_git/${this.gitPullRequest.repository.name}/pullrequest/${this.gitPullRequest.pullRequestId}`;
    this.sourceBranchHref = `${baseHostUrl}/_git/${this.gitPullRequest.repository.name}?version=GB${this.sourceBranch.branchName}`;
    this.targetBranchHref = `${baseHostUrl}/_git/${this.gitPullRequest.repository.name}?version=GB${this.targetBranch.branchName}`;
    this.myApprovalStatus = this.getCurrentUserVoteStatus(
      this.gitPullRequest.reviewers
    );
    this.lastCommitUrl = `${baseHostUrl}/_git/${this.gitPullRequest.repository.name}/commit/${this.lastCommitId}?refName=GB${this.gitPullRequest.sourceRefName}`;
    this.pullRequestProgressStatus = this.getStatusIndicatorData(
      this.gitPullRequest.reviewers
    );

    this.getPullRequestDetailsAsync();
  }

  private async getPullRequestDetailsAsync() {
    this.lastShortCommitId = this.gitPullRequest.lastMergeSourceCommit.commitId.substr(
      0,
      8
    );

    this.gitClient
      .getPullRequestById(this.gitPullRequest.pullRequestId)
      .then(value => {
        this.lastCommitDetails.value = value.lastMergeCommit;
        this.isAutoCompleteSet.value = value.autoCompleteSetBy !== undefined;
      })
      .catch(error => {
        console.log(
          `There was an error calling the Pull Request details (method: getPullRequestById).`
        );
        console.log(error);
      });
  }

  private getCurrentUserVoteStatus(
    reviewers: IdentityRefWithVote[]
  ): ReviewerVoteOption {
    let voteResult = ReviewerVoteOption.NoVote;
    if (reviewers && reviewers.length > 0) {
      const currentUserReviewer = reviewers.filter(
        r => r.id === this.currentUser.id
      );

      if (currentUserReviewer.length > 0) {
        voteResult = currentUserReviewer[0].vote as ReviewerVoteOption;
      }
    }

    return voteResult;
  }

  private getStatusIndicatorData(
    reviewers: IdentityRefWithVote[]
  ): IStatusIndicatorData {
    const indicatorData: IStatusIndicatorData = {
      label: "Waiting Review",
      statusProps: { ...Statuses.Waiting, ariaLabel: "Waiting Review" }
    };

    if (!reviewers || reviewers.length === 0) return indicatorData;

    if (reviewers.some(r => r.vote === -10)) {
      indicatorData.statusProps = {
        ...Statuses.Failed,
        ariaLabel: "One or more of the reviewers has rejected."
      };
      indicatorData.label = "One or more of the reviewers has rejected.";
    } else if (reviewers.some(r => r.vote === -5)) {
      indicatorData.statusProps = {
        ...Statuses.Warning,
        ariaLabel: "One or more of the reviewers is waiting for the author."
      };
      indicatorData.label =
        "One or more of the reviewers is waiting for the author.";
    } else if (
      reviewers
        .filter(r => r.isRequired)
        .every(r => r.vote === 10 || r.vote === 5)
    ) {
      indicatorData.statusProps = {
        ...Statuses.Success,
        ariaLabel: "Ready for completion"
      };
      indicatorData.label = "Success";
    } else if (reviewers.filter(r => r.isRequired).every(r => r.vote === 0)) {
      indicatorData.statusProps = {
        ...Statuses.Waiting,
        ariaLabel: "Waiting Review of required Reviewers"
      };
      indicatorData.label = "Waiting Review";
    } else if (reviewers.filter(r => r.isRequired).some(r => r.vote > 0)) {
      indicatorData.statusProps = {
        ...Statuses.Running,
        ariaLabel: "Waiting remaining required reviewers"
      };
      indicatorData.label = "Review in progress";
    }

    return indicatorData;
  }

  public static getModels(
    pullRequestList: GitPullRequest[] | undefined,
    projectName: string,
    baseUrl: string
  ): PullRequestModel[] {
    let modelList: PullRequestModel[] = [];

    pullRequestList!.map(pr => {
      modelList.push(new PullRequestModel(pr, projectName, baseUrl));

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
  projects: TeamProjectReference[];
  currentProject?: IProjectInfo | TeamProjectReference | undefined;
  pullRequests: PullRequestModel[];
  repositories: GitRepository[];
  createdByList: IdentityRef[];
  sourceBranchList: BranchDropDownItem[];
  targetBranchList: BranchDropDownItem[];
  reviewerList: IdentityRefWithVote[];
  loading: boolean;
}
