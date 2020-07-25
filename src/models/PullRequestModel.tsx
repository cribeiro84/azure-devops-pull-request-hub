import {
  GitPullRequest,
  IdentityRefWithVote,
  GitCommitRef,
  CommentThreadStatus,
  PullRequestStatus,
} from "azure-devops-extension-api/Git/Git";
import * as DevOps from "azure-devops-extension-sdk";
import { Statuses } from "azure-devops-ui/Status";
import { getClient } from "azure-devops-extension-api";
import { GitRestClient } from "azure-devops-extension-api/Git/GitClient";
import { PolicyRestClient } from "azure-devops-extension-api/Policy/PolicyClient";
import { BuildRestClient } from "azure-devops-extension-api/Build/BuildClient";
import {
  BuildStatus,
  BuildResult,
} from "azure-devops-extension-api/Build/Build";
import { hasPullRequestFailure } from "./constants";
import {
  BranchDropDownItem,
  ReviewerVoteOption,
  IStatusIndicatorData,
  PullRequestComment,
  PullRequestPolicy,
  PullRequestRequiredReviewer,
} from "../tabs/PulRequestsTabData";
import { WebApiTagDefinition } from "azure-devops-extension-api/Core/Core";

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
  public hasFailures: boolean = false;
  public labels: WebApiTagDefinition[] = [];
  private loadingData: boolean = false;

  constructor(
    public gitPullRequest: GitPullRequest,
    public projectName: string,
    public baseUrl: string,
    public callbackState: (pullRequestModel: PullRequestModel) => void
  ) {
    this.comment = new PullRequestComment();
    this.setupPullRequest();
  }

  public triggerState() {
    this.callbackState(this);
    this.initializeData();
  }

  public isStillLoading() {
    return this.loadingData;
  }

  private callTriggerState() {
    this.loadingData = false;
    this.triggerState();
  }

  public async setupPullRequest() {
    this.initializeData();

    this.loadingData = true;
    Promise.all([this.getAsyncCallList()]).finally(() => {
      this.callTriggerState();
    });
  }

  private getAsyncCallList(): Promise<any>[] {
    const abandoned =
      this.gitPullRequest.status === PullRequestStatus.Abandoned;
    let callList = [];

    if (!abandoned) {
      callList.push(
        ...[
          this.getPullRequestAdditionalDetailsAsync(),
          this.getPullRequestThreadAsync(),
          this.getPullRequestWorkItemAsync(),
          this.getPullRequestPolicyAsync(),
          this.processPolicyBuildAsync(),
        ]
      );
    }

    callList.push(this.getLabels());

    return callList;
  }

  private initializeData() {
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
    this.hasFailures = hasPullRequestFailure(this);
  }

  private getCurrentUserVoteStatus(
    reviewers: IdentityRefWithVote[]
  ): ReviewerVoteOption {
    let voteResult = ReviewerVoteOption.NoVote;
    if (reviewers && reviewers.length > 0) {
      const currentUserReviewer = reviewers.filter(
        (r) => r.id === this.currentUser.id
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
      statusProps: { ...Statuses.Waiting, ariaLabel: "Waiting Review" },
    };

    if (this.hasFailures) {
      indicatorData.statusProps = {
        ...Statuses.Failed,
        ariaLabel: "Pull Request is in failure status.",
      };
      indicatorData.label = "Pull Request is in failure status.";
    } else if (reviewers.some((r) => r.vote === -10)) {
      indicatorData.statusProps = {
        ...Statuses.Failed,
        ariaLabel: "One or more of the reviewers has rejected.",
      };
      indicatorData.label = "One or more of the reviewers has rejected.";
    } else if (reviewers.some((r) => r.vote === -5)) {
      indicatorData.statusProps = {
        ...Statuses.Warning,
        ariaLabel: "One or more of the reviewers is waiting for the author.",
      };
      indicatorData.label =
        "One or more of the reviewers is waiting for the author.";
    } else if (
      (!reviewers ||
        reviewers.length === 0 ||
        reviewers
          .filter((r) => r.isRequired === true)
          .every((r) => r.vote === 10 || r.vote === 5)) &&
      isAllPoliciesOk
    ) {
      indicatorData.statusProps = {
        ...Statuses.Success,
        ariaLabel: "Ready for completion",
      };
      indicatorData.label = "Success";
    } else if (
      reviewers.filter((r) => r.isRequired).every((r) => r.vote === 0)
    ) {
      indicatorData.statusProps = {
        ...Statuses.Waiting,
        ariaLabel: "Waiting Review of required Reviewers",
      };
      indicatorData.label = "Waiting Review";
    } else if (
      reviewers.filter((r) => r.isRequired === true).some((r) => r.vote > 0)
    ) {
      indicatorData.statusProps = {
        ...Statuses.Running,
        ariaLabel: "Waiting remaining required reviewers",
      };
      indicatorData.label = "Review in progress";
    }

    return indicatorData;
  }

  private async getPullRequestAdditionalDetailsAsync() {
    const gitClient: GitRestClient = getClient(GitRestClient);
    let self = this;

    return gitClient
      .getPullRequest(
        self.gitPullRequest.repository.id,
        self.gitPullRequest.pullRequestId
      )
      .then((value) => {
        self.isAutoCompleteSet = value.autoCompleteSetBy !== undefined;

        if (value.lastMergeCommit === undefined) {
          return;
        }

        self.lastCommitDetails = value.lastMergeCommit;
      })
      .catch((error) => {
        console.log(
          `There was an error calling the Pull Request details (method: getPullRequestAdditionalDetailsAsync).`
        );
        console.log(error);
      });
  }

  private async getPullRequestThreadAsync() {
    const gitClient: GitRestClient = getClient(GitRestClient);
    let self = this;

    await gitClient
      .getThreads(
        self.gitPullRequest.repository.id,
        self.gitPullRequest.pullRequestId
      )
      .then((value) => {
        if (value !== undefined) {
          const threads = value.filter((x) => x.status !== undefined);
          const terminatedThread = value.filter(
            (x) =>
              x.status !== undefined &&
              (x.status === CommentThreadStatus.Closed ||
                x.status === CommentThreadStatus.WontFix ||
                x.status === CommentThreadStatus.Fixed)
          );

          self.comment = new PullRequestComment();

          self.comment.totalcomment =
            threads !== undefined
              ? threads.filter((x) => !x.isDeleted).length
              : 0;
          self.comment.terminatedComment =
            terminatedThread !== undefined ? terminatedThread.length : 0;
        }
      })
      .catch((error) => {
        console.log(
          "There was an error calling the Pull Request threads (method: getPullRequestThreadAsync)."
        );
        console.log(error);
      });
  }

  private async getPullRequestWorkItemAsync() {
    const gitClient: GitRestClient = getClient(GitRestClient);
    let self = this;

    await gitClient
      .getPullRequestWorkItemRefs(
        self.gitPullRequest.repository.id,
        self.gitPullRequest.pullRequestId,
        self.projectName
      )
      .then((value) => {
        self.existWorkItem = value !== undefined && value.length > 0;
      })
      .catch((error) => {
        console.log(
          "There was an error calling the Pull Request work item (method: getPullRequestWorkItemAsync)."
        );
        console.log(error);
      });
  }

  private async getPullRequestPolicyAsync() {
    const gitPolicy: PolicyRestClient = getClient(PolicyRestClient);
    let self = this;

    return gitPolicy
      .getPolicyConfigurations(self.projectName)
      .then((value) => {
        if (value === undefined || value.length === 0) {
          return;
        }

        const policies = value.filter(
          (x) =>
            x.isBlocking &&
            x.isEnabled &&
            !x.isDeleted &&
            x.settings !== undefined &&
            x.settings instanceof Object &&
            x.settings.scope instanceof Array &&
            Array(x.settings.scope).length > 0
        );

        if (policies !== undefined && policies.length > 0) {
          policies.map((policy) => {
            if (
              policy.settings.scope[0].repositoryId ===
                self.gitPullRequest.repository.id &&
              ((policy.settings.scope[0].matchKind === "Exact" &&
                policy.settings.scope[0].refName ===
                  self.gitPullRequest.targetRefName) ||
                (policy.settings.scope[0].matchKind === "Prefix" &&
                  self.gitPullRequest.targetRefName.startsWith(
                    policy.settings.scope[0].refName
                  )))
            ) {
              const pullRequestPolicy = new PullRequestPolicy();

              pullRequestPolicy.id = policy.id;
              pullRequestPolicy.displayName = policy.type.displayName;
              pullRequestPolicy.repositoryId =
                policy.settings.scope[0].repositoryId;
              pullRequestPolicy.refName = policy.settings.scope[0].refName;
              pullRequestPolicy.allowDownvotes = policy.settings.allowDownvotes;
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

                requiredReviewersId.map((reviewerId) => {
                  const pullRequestRequiredReviewer = new PullRequestRequiredReviewer();
                  pullRequestRequiredReviewer.id = reviewerId;

                  const reviewerFound = self.gitPullRequest.reviewers.find(
                    (x) => x.id === reviewerId
                  );

                  if (reviewerFound !== undefined) {
                    if (
                      reviewerFound.isContainer === undefined ||
                      reviewerFound.isContainer === false
                    ) {
                      pullRequestRequiredReviewer.displayName =
                        reviewerFound.displayName;
                    } else {
                      let name = reviewerFound!.displayName!.split("\\");
                      if (name.length > 0) {
                        pullRequestRequiredReviewer.displayName =
                          name[name.length - 1];
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
                pullRequestPolicy.displayName === "Minimum number of reviewers"
              ) {
                let reviewerCount = 0;

                if (pullRequestPolicy.creatorVoteCounts) {
                  reviewerCount = self.gitPullRequest.reviewers.filter(
                    (x) =>
                      (x.vote === 10 || x.vote === 5) &&
                      (x.isContainer === undefined || x.isContainer === false)
                  ).length;
                } else {
                  reviewerCount = self.gitPullRequest.reviewers.filter(
                    (x) =>
                      (x.vote === 10 || x.vote === 5) &&
                      (x.isContainer === undefined ||
                        x.isContainer === false) &&
                      x.id !== self.gitPullRequest.createdBy.id
                  ).length;
                }

                pullRequestPolicy.isReviewersApprovedOk =
                  reviewerCount >= pullRequestPolicy.minimumApproverCount!;
                pullRequestPolicy.reviewerCount = reviewerCount;
              } else if (
                pullRequestPolicy.displayName === "Work item linking"
              ) {
                pullRequestPolicy.isWorkItemOk = self.existWorkItem;
              } else if (
                pullRequestPolicy.displayName === "Comment requirements"
              ) {
                pullRequestPolicy.isCommentOk =
                  self.comment.totalcomment - self.comment.terminatedComment ===
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
                  reviewers = self.gitPullRequest.reviewers.filter(
                    (x) => x.vote === 10 || x.vote === 5
                  );
                } else {
                  reviewers = self.gitPullRequest.reviewers.filter(
                    (x) =>
                      (x.vote === 10 || x.vote === 5) &&
                      x.id !== self.gitPullRequest.createdBy.id
                  );
                }

                let reviewerCount = 0;

                if (
                  pullRequestPolicy.requiredReviewers !== undefined &&
                  pullRequestPolicy.requiredReviewers.length > 0 &&
                  reviewers !== undefined &&
                  reviewers.length > 0
                ) {
                  reviewers.forEach((reviewer) => {
                    pullRequestPolicy.requiredReviewers!.forEach(
                      (requiredReviewer) => {
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

              self.policies.push(pullRequestPolicy);
            }

            return policy;
          });

          if (self.policies !== undefined && self.policies.length > 0) {
            self.isAllPoliciesOk = self.policies.every(
              (p) =>
                (p.isBuildOk === undefined || p.isBuildOk) &&
                (p.isCommentOk === undefined || p.isCommentOk) &&
                (p.isRequiredReviewerOk === undefined ||
                  p.isRequiredReviewerOk) &&
                (p.isReviewersApprovedOk === undefined ||
                  p.isReviewersApprovedOk) &&
                (p.isWorkItemOk === undefined || p.isWorkItemOk)
            );
          } else {
            self.isAllPoliciesOk = true;
          }
        }
      })
      .catch((error) => {
        console.log(
          "There was an error calling the policies (method: getPolicyConfigurations)."
        );
        console.log(error);
      });
  }

  private async processPolicyBuildAsync() {
    const build: BuildRestClient = getClient(BuildRestClient);
    let self = this;

    if (self.policies !== undefined && self.policies.length > 0) {
      const policies = self.policies.filter(
        (x) => x.buildDefinitionId !== undefined
      );
      if (policies !== undefined && policies.length > 0) {
        policies.map(async (policy) => {
          if (policy.buildDefinitionId !== undefined) {
            const definitions: number[] = [];
            const repositoryType: string = "TfsGit";
            definitions.push(policy.buildDefinitionId);

            build
              .getBuilds(
                self.projectName,
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
              .then((builds) => {
                if (builds !== undefined && builds.length > 0) {
                  const build = builds[0];

                  policy.isBuildOk =
                    parseInt(build.triggerInfo["pr.number"]) ===
                      self.gitPullRequest.pullRequestId &&
                    build.status === BuildStatus.Completed &&
                    (build.result === BuildResult.Succeeded ||
                      build.result === BuildResult.PartiallySucceeded);
                }
              })
              .catch((error) => {
                console.log(
                  "There was an error calling the builds (method: processPolicyBuildAsync)."
                );
                console.log(error);
              });
          }

          return policy;
        });
      }
    }
  }

  private async getLabels() {
    const gitClient: GitRestClient = getClient(GitRestClient);
    let self = this;

    await gitClient
      .getPullRequestLabels(
        self.gitPullRequest.repository.id,
        this.gitPullRequest.pullRequestId
      )
      .then((data) => {
        self.labels = data;
      })
      .catch((error) => {
        console.log(
          "There was an error calling the builds (method: processPolicyBuildAsync)."
        );
        console.log(error);
      });
  }

  public static getModels(
    pullRequestList: GitPullRequest[] | undefined,
    projectName: string,
    baseUrl: string,
    callbackState: (pullRequestModel: PullRequestModel) => void
  ): PullRequestModel[] {
    const modelList: PullRequestModel[] = [];

    pullRequestList!.map((pr) => {
      modelList.push(
        new PullRequestModel(pr, projectName, baseUrl, callbackState)
      );

      return pr;
    });

    return modelList;
  }
}
