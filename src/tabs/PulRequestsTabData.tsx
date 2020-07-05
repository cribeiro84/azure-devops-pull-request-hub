import {
  GitRepository,
  GitPullRequest,
  GitPullRequestSearchCriteria,
  PullRequestStatus,
  IdentityRefWithVote,
  GitCommitRef,
  CommentThreadStatus
} from "azure-devops-extension-api/Git/Git";
import * as DevOps from "azure-devops-extension-sdk";
import { IStatusProps } from "azure-devops-ui/Status";
import { IColor } from "azure-devops-ui/Utilities/Color";
import { IProjectInfo } from "azure-devops-extension-api/Common/CommonServices";
import { IdentityRef } from "azure-devops-extension-api/WebApi/WebApi";
import { Statuses } from "azure-devops-ui/Status";
import { getClient } from "azure-devops-extension-api";
import { GitRestClient } from "azure-devops-extension-api/Git/GitClient";
import { PolicyRestClient } from "azure-devops-extension-api/Policy/PolicyClient";
import { BuildRestClient } from "azure-devops-extension-api/Build/BuildClient";
import { TeamProjectReference } from "azure-devops-extension-api/Core/Core";
import { ITableColumn } from "azure-devops-ui/Table";
import {
  StatusColumn,
  TitleColumn,
  DetailsColumn,
  ReviewersColumn,
  DateColumn
} from "../components/Columns";
import {
  BuildStatus,
  BuildResult
} from "azure-devops-extension-api/Build/Build";

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

export enum AlternateStatusPr {
  IsDraft = 0,
  Conflicts = 1,
  AutoComplete = 2
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

export const columns: ITableColumn<PullRequestModel>[] = [
  {
    id: "status",
    name: "",
    renderCell: StatusColumn,
    readonly: true,
    width: -4
  },
  {
    id: "title",
    name: "Pull Request",
    renderCell: TitleColumn,
    readonly: true,
    width: -46
  },
  {
    id: "time",
    name: "When",
    readonly: true,
    renderCell: DateColumn,
    width: -10
  },
  {
    className: "pipelines-two-line-cell",
    id: "details",
    name: "Details",
    renderCell: DetailsColumn,
    width: -20
  },
  {
    id: "reviewers",
    name: "Reviewers",
    renderCell: ReviewersColumn,
    width: -20
  }
];

export class PullRequestPolicy {
  public id: number = 0;
  public displayName: string = "";
  public requiredReviewers?: PullRequestRequiredReviewer[];
  public minimumApproverCount?: number;
  public reviewerCount?: number;
  public creatorVoteCounts?: boolean;
  public allowDownvotes?: boolean;
  public resetOnSourcePush?: boolean;
  public repositoryId?: string;
  public refName?: string;
  public allowNoFastForward?: boolean;
  public allowSquash?: boolean;
  public allowRebase?: boolean;
  public allowRebaseMerge?: boolean;
  public buildDefinitionId?: number;
  public isCommentOk?: boolean;
  public isBuildOk?: boolean;
  public isWorkItemOk?: boolean;
  public isReviewersApprovedOk?: boolean;
  public isRequiredReviewerOk?: boolean;
}

export class PullRequestRequiredReviewer {
  public id: string = "";
  public displayName: string = "";
}

export class PullRequestComment {
  public terminatedComment: number = 0;
  public totalcomment: number = 0;
}

export class PullRequestModel {
  private baseHostUrl: string = "";
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
  public lastCommitDetails: GitCommitRef | undefined;
  public isAutoCompleteSet: boolean = false;
  public existWorkItem: boolean = false;
  public comment: PullRequestComment;
  public policies: PullRequestPolicy[] = [];
  public isAllPoliciesOk?: boolean;

  constructor(
    public gitPullRequest: GitPullRequest,
    public projectName: string,
    public baseUrl: string
  ) {
    this.comment = new PullRequestComment();
    this.setupPullRequest();
  }

  private async setupPullRequest() {
    this.baseHostUrl = `${this.baseUrl}${this.projectName}`;
    this.title = `${this.gitPullRequest.pullRequestId} - ${this.gitPullRequest.title}`;
    this.sourceBranch = new BranchDropDownItem(
      this.gitPullRequest.repository.name,
      this.gitPullRequest.sourceRefName
    );
    this.targetBranch = new BranchDropDownItem(
      this.gitPullRequest.repository.name,
      this.gitPullRequest.targetRefName
    );
    this.repositoryHref = `${this.baseHostUrl}/_git/${this.gitPullRequest.repository.name}/`;
    this.pullRequestHref = `${this.baseHostUrl}/_git/${this.gitPullRequest.repository.name}/pullrequest/${this.gitPullRequest.pullRequestId}`;
    this.sourceBranchHref = `${this.baseHostUrl}/_git/${this.gitPullRequest.repository.name}?version=GB${this.sourceBranch.branchName}`;
    this.targetBranchHref = `${this.baseHostUrl}/_git/${this.gitPullRequest.repository.name}?version=GB${this.targetBranch.branchName}`;
    this.myApprovalStatus = this.getCurrentUserVoteStatus(
      this.gitPullRequest.reviewers
    );
    this.pullRequestProgressStatus = this.getStatusIndicatorData(
      this.gitPullRequest.reviewers,
      this.isAllPoliciesOk
    );
    this.lastShortCommitId = this.gitPullRequest.lastMergeSourceCommit.commitId.substr(
      0,
      8
    );
    this.lastCommitUrl = `${this.baseHostUrl}/_git/${this.gitPullRequest.repository.name}/commit/${this.gitPullRequest.lastMergeSourceCommit.commitId}?refName=GB${this.gitPullRequest.sourceRefName}`;
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
    reviewers: IdentityRefWithVote[],
    isAllPoliciesOk: boolean | undefined
  ): IStatusIndicatorData {
    const indicatorData: IStatusIndicatorData = {
      label: "Waiting Review",
      statusProps: { ...Statuses.Waiting, ariaLabel: "Waiting Review" }
    };

    if (!reviewers || reviewers.length === 0) {
      return indicatorData;
    }

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
        .every(r => r.vote === 10 || r.vote === 5) && isAllPoliciesOk
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
    const modelList: PullRequestModel[] = [];

    pullRequestList!.map(pr => {
      modelList.push(new PullRequestModel(pr, projectName, baseUrl));

      return pr;
    });

    return modelList;
  }
}

export function getPullRequestDetailsAsync(
  pullRequestList: PullRequestModel[]
): Promise<PullRequestModel[]> {
  const gitClient: GitRestClient = getClient(GitRestClient);

  if (pullRequestList === undefined || pullRequestList.length === 0) {
    return new Promise<PullRequestModel[]>(resolve => {
      resolve(pullRequestList);
    });
  }

  return new Promise<PullRequestModel[]>((resolve, reject) => {
    Promise.all(
      pullRequestList.map(item => {
        gitClient
          .getPullRequestById(item.gitPullRequest.pullRequestId)
          .then(value => {
            if (value.lastMergeCommit === undefined) {
              return;
            }
            item.lastCommitDetails = value.lastMergeCommit;
            item.isAutoCompleteSet = value.autoCompleteSetBy !== undefined;
          })
          .catch(error => {
            console.log(
              `There was an error calling the Pull Request details (method: getPullRequestById).`
            );
            console.log(error);
            reject(error);
          });

        return item;
      })
    )
      .then(() => {
        resolve(pullRequestList);
      })
      .catch(error => {
        reject(error);
      });
  });
}

/**
 * Get pullrequest thread asysn.
 * @remarks
 * Get pull request comment information.
 * @param pullRequestList - List of pull request
 * @returns pull request list with comment information
 */
export function getPullRequestThreadAsync(
  pullRequestList: PullRequestModel[]
): Promise<PullRequestModel[]> {
  const gitClient: GitRestClient = getClient(GitRestClient);

  if (pullRequestList === undefined || pullRequestList.length === 0) {
    return new Promise<PullRequestModel[]>(resolve => {
      resolve(pullRequestList);
    });
  }

  return new Promise<PullRequestModel[]>((resolve, reject) => {
    Promise.all(
      pullRequestList.map(async item => {
        await gitClient
          .getThreads(
            item.gitPullRequest.repository.id,
            item.gitPullRequest.pullRequestId
          )
          .then(value => {
            if (value !== undefined) {
              const threads = value.filter(x => x.status !== undefined);
              const terminatedThread = value.filter(
                x =>
                  x.status !== undefined &&
                  (x.status === CommentThreadStatus.Closed ||
                    x.status === CommentThreadStatus.WontFix ||
                    x.status === CommentThreadStatus.Fixed)
              );

              item.comment = new PullRequestComment();

              item.comment.totalcomment =
                threads !== undefined ? threads.filter(x => !x.isDeleted).length : 0;
              item.comment.terminatedComment =
                terminatedThread !== undefined ? terminatedThread.length : 0;
            }
          })
          .catch(error => {
            console.log(
              "There was an error calling the Pull Request threads (method: getPullRequestThreadAsync)."
            );
            console.log(error);
            reject(error);
          });

        return item;
      })
    )
      .then(() => {
        resolve(pullRequestList);
      })
      .catch(error => {
        reject(error);
      });
  });
}

/**
 * Get pullrequest work item asysn.
 * @remarks
 * Get pull request work item information.
 * @param pullRequestList - List of pull request
 * @returns pull request list with work item information
 */
export function getPullRequestWorkItemAsync(
  pullRequestList: PullRequestModel[]
): Promise<PullRequestModel[]> {
  const gitClient: GitRestClient = getClient(GitRestClient);

  if (pullRequestList === undefined || pullRequestList.length === 0) {
    return new Promise<PullRequestModel[]>(resolve => {
      resolve(pullRequestList);
    });
  }

  return new Promise<PullRequestModel[]>((resolve, reject) => {
    Promise.all(
      pullRequestList.map(async item => {
        await gitClient
          .getPullRequestWorkItemRefs(
            item.gitPullRequest.repository.id,
            item.gitPullRequest.pullRequestId,
            item.projectName
          )
          .then(value => {
            item.existWorkItem = value !== undefined && value.length > 0;
          })
          .catch(error => {
            console.log(
              "There was an error calling the Pull Request work item (method: getPullRequestWorkItemAsync)."
            );
            console.log(error);
            reject(error);
          });

        return item;
      })
    )
      .then(() => {
        resolve(pullRequestList);
      })
      .catch(error => {
        reject(error);
      });
  });
}

/**
 * Get pullrequest policy asysn.
 * @remarks
 * Get pull request policies information.
 * @param pullRequestList - List of pull request
 * @returns pull request list with policies information
 */
export function getPullRequestPolicyAsync(
  pullRequestList: PullRequestModel[]
): Promise<PullRequestModel[]> {
  const gitPolicy: PolicyRestClient = getClient(PolicyRestClient);

  if (pullRequestList === undefined || pullRequestList.length === 0) {
    return new Promise<PullRequestModel[]>(resolve => {
      resolve(pullRequestList);
    });
  }

  return new Promise<PullRequestModel[]>((resolve, reject) => {
    Promise.all(
      pullRequestList.map(async item => {
        await gitPolicy
          .getPolicyConfigurations(item.projectName)
          .then(value => {
            if (value === undefined || value.length === 0) {
              return;
            }

            const policies = value.filter(
              x =>
                x.isBlocking &&
                x.isEnabled &&
                !x.isDeleted &&
                x.settings !== undefined &&
                x.settings instanceof Object &&
                x.settings.scope instanceof Array &&
                Array(x.settings.scope).length > 0
            );

            if (policies !== undefined && policies.length > 0) {
              policies.map(policy => {

                if (
                  policy.settings.scope[0].repositoryId === item.gitPullRequest.repository.id &&
                  (
                    (policy.settings.scope[0].matchKind === "Exact" && policy.settings.scope[0].refName === item.gitPullRequest.targetRefName) ||
                    (policy.settings.scope[0].matchKind === "Prefix" && item.gitPullRequest.targetRefName.startsWith(policy.settings.scope[0].refName))
                  )
                ) {
                  const pullRequestPolicy = new PullRequestPolicy();

                  pullRequestPolicy.id = policy.id;
                  pullRequestPolicy.displayName = policy.type.displayName;
                  pullRequestPolicy.repositoryId =
                    policy.settings.scope[0].repositoryId;
                  pullRequestPolicy.refName = policy.settings.scope[0].refName;
                  pullRequestPolicy.allowDownvotes =
                    policy.settings.allowDownvotes;
                  pullRequestPolicy.creatorVoteCounts =
                    policy.settings.creatorVoteCounts;
                  pullRequestPolicy.minimumApproverCount =
                    policy.settings.minimumApproverCount;
                  pullRequestPolicy.resetOnSourcePush =
                    policy.settings.resetOnSourcePush;
                  pullRequestPolicy.allowNoFastForward =
                    policy.settings.allowNoFastForward;
                  pullRequestPolicy.allowSquash = policy.settings.allowSquash;
                  pullRequestPolicy.allowRebase = policy.settings.allowRebase;
                  pullRequestPolicy.allowRebaseMerge =
                    policy.settings.allowRebaseMerge;
                  pullRequestPolicy.buildDefinitionId =
                    policy.settings.buildDefinitionId;

                  if (
                    policy.settings.requiredReviewerIds !== undefined &&
                    policy.settings.requiredReviewerIds instanceof Array &&
                    policy.settings.requiredReviewerIds.length > 0
                  ) {
                    pullRequestPolicy.requiredReviewers = [];
                    const requiredReviewersId = policy.settings
                      .requiredReviewerIds as Array<string>;

                    requiredReviewersId.map(reviewerId => {
                      const pullRequestRequiredReviewer = new PullRequestRequiredReviewer();
                      pullRequestRequiredReviewer.id = reviewerId;

                      const reviewerFound = item.gitPullRequest.reviewers.find(
                        x => x.id === reviewerId
                      );

                      if (reviewerFound !== undefined) {
                        if (reviewerFound.isContainer === undefined || reviewerFound.isContainer === false) {
                          pullRequestRequiredReviewer.displayName = reviewerFound.displayName;
                        } else {
                          let name = reviewerFound!.displayName!.split("\\");
                          if (name.length > 0) {
                            pullRequestRequiredReviewer.displayName = name[name.length - 1];
                          }
                        }
                      }

                      pullRequestPolicy.requiredReviewers!.push(
                        pullRequestRequiredReviewer
                      );

                      return reviewerId;
                    });
                  }

                  if (
                    pullRequestPolicy.displayName ===
                    "Minimum number of reviewers"
                  ) {
                    let reviewerCount = 0;

                    if (pullRequestPolicy.creatorVoteCounts) {
                      reviewerCount = item.gitPullRequest.reviewers.filter(
                        x => (x.vote === 10 || x.vote === 5) && (x.isContainer === undefined || x.isContainer === false)
                      ).length;
                    } else {
                      reviewerCount = item.gitPullRequest.reviewers.filter(
                        x =>
                          (x.vote === 10 || x.vote === 5) && (x.isContainer === undefined || x.isContainer === false) &&
                          x.id !== item.gitPullRequest.createdBy.id
                      ).length;
                    }

                    pullRequestPolicy.isReviewersApprovedOk =
                      reviewerCount >= pullRequestPolicy.minimumApproverCount!;
                    pullRequestPolicy.reviewerCount = reviewerCount;
                  } else if (
                    pullRequestPolicy.displayName === "Work item linking"
                  ) {
                    pullRequestPolicy.isWorkItemOk = item.existWorkItem;
                  } else if (
                    pullRequestPolicy.displayName === "Comment requirements"
                  ) {
                    pullRequestPolicy.isCommentOk =
                      item.comment.totalcomment -
                      item.comment.terminatedComment ===
                      0;
                  } else if (
                    pullRequestPolicy.displayName === "Require a merge strategy"
                  ) {
                    // TODO
                  } else if (pullRequestPolicy.displayName === "Build") {
                    // TODO
                  } else if (pullRequestPolicy.displayName === "Status") {
                    // TODO
                  } else if (
                    pullRequestPolicy.displayName === "Required reviewers"
                  ) {
                    let reviewers;

                    if (pullRequestPolicy.creatorVoteCounts) {
                      reviewers = item.gitPullRequest.reviewers.filter(
                        x => x.vote === 10 || x.vote === 5
                      );
                    } else {
                      reviewers = item.gitPullRequest.reviewers.filter(
                        x =>
                          (x.vote === 10 || x.vote === 5) &&
                          x.id !== item.gitPullRequest.createdBy.id
                      );
                    }

                    let reviewerCount = 0;

                    if (
                      pullRequestPolicy.requiredReviewers !== undefined &&
                      pullRequestPolicy.requiredReviewers.length > 0 &&
                      reviewers !== undefined &&
                      reviewers.length > 0
                    ) {
                      reviewers.forEach(reviewer => {
                        pullRequestPolicy.requiredReviewers!.forEach(
                          requiredReviewer => {
                            if (reviewer.id === requiredReviewer.id) {
                              reviewerCount += 1;
                            }
                          }
                        );
                      });
                    }

                    pullRequestPolicy.isRequiredReviewerOk =
                      pullRequestPolicy.minimumApproverCount !== undefined &&
                      reviewerCount >= pullRequestPolicy.minimumApproverCount &&
                      (pullRequestPolicy.isRequiredReviewerOk === undefined ||
                        pullRequestPolicy.isRequiredReviewerOk);
                  }

                  item.policies.push(pullRequestPolicy);
                }

                return policy;
              });

              if (item.policies !== undefined && item.policies.length > 0) {
                item.isAllPoliciesOk = item.policies.every(
                  p =>
                    (p.isBuildOk === undefined || p.isBuildOk) &&
                    (p.isCommentOk === undefined || p.isCommentOk) &&
                    (p.isRequiredReviewerOk === undefined ||
                      p.isRequiredReviewerOk) &&
                    (p.isReviewersApprovedOk === undefined ||
                      p.isReviewersApprovedOk) &&
                    (p.isWorkItemOk === undefined || p.isWorkItemOk)
                );
              }
            }
          })
          .catch(error => {
            console.log(
              "There was an error calling the policies (method: getPolicyConfigurations)."
            );
            console.log(error);
            reject(error);
          });

        return item;
      })
    )
      .then(() => {
        processPolicyBuildAsync(pullRequestList);
        resolve(pullRequestList);
      })
      .catch(error => {
        reject(error);
      });
  });
}

/**
 * Process policy build async.
 * @remarks
 * Get the build information if there is a build policy.
 * @param pullRequestList - List of pull request
 * @returns pull request list with build information
 */
export function processPolicyBuildAsync(
  pullRequestList: PullRequestModel[]
): Promise<PullRequestModel[]> {
  const build: BuildRestClient = getClient(BuildRestClient);

  if (pullRequestList === undefined || pullRequestList.length === 0) {
    return new Promise<PullRequestModel[]>(resolve => {
      resolve(pullRequestList);
    });
  }

  return new Promise<PullRequestModel[]>((resolve, reject) => {
    Promise.all(
      pullRequestList.map(item => {
        if (item.policies !== undefined && item.policies.length > 0) {
          const policies = item.policies.filter(
            x => x.buildDefinitionId !== undefined
          );
          if (policies !== undefined && policies.length > 0) {
            policies.map(async policy => {
              if (policy.buildDefinitionId !== undefined) {
                const definitions: number[] = [];
                const repositoryType: string = "TfsGit";
                definitions.push(policy.buildDefinitionId);

                build
                  .getBuilds(
                    item.projectName,
                    definitions,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    policy.repositoryId,
                    repositoryType
                  )
                  .then(builds => {
                    if (builds !== undefined && builds.length > 0) {
                      const build = builds
                        .sort(x => x.buildNumberRevision)
                        .reverse()[0];

                      const parameters = JSON.parse(build.parameters);

                      policy.isBuildOk =
                        item.gitPullRequest.pullRequestId.toString() ===
                        parameters["system.pullRequest.pullRequestId"] &&
                        policy.refName ===
                        parameters["system.pullRequest.targetBranch"] &&
                        build.status === BuildStatus.Completed &&
                        (build.result === BuildResult.Succeeded || build.result === BuildResult.PartiallySucceeded);
                    }
                  })
                  .catch(error => {
                    console.log(
                      "There was an error calling the builds (method: processPolicyBuildAsync)."
                    );
                    console.log(error);
                    reject(error);
                  });
              }

              return policy;
            });
          }
        }

        return item;
      })
    )
      .then(() => {
        resolve(pullRequestList);
      })
      .catch(error => {
        reject(error);
      });
  });
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
  errorMessage: string;
  pullRequestCount: number;
}

export function sortMethod(
  a: BranchDropDownItem | IdentityRef,
  b: BranchDropDownItem | IdentityRef
) {
  if (a.displayName! < b.displayName!) {
    return -1;
  }
  if (a.displayName! > b.displayName!) {
    return 1;
  }
  return 0;
}
