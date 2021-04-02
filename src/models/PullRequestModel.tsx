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
import { hasPullRequestFailure } from "./constants";
import {
  BranchDropDownItem,
  ReviewerVoteOption,
  IStatusIndicatorData,
  PullRequestComment,
  PullRequestPolicy,
} from "../tabs/PulRequestsTabData";
import { WebApiTagDefinition } from "azure-devops-extension-api/Core/Core";
import { USER_SETTINGS_STORE_KEY } from "../common";
import { getEvaluationsPerPullRequest } from "../services/AzureGitServices";
import { EvaluationPolicyType } from "./GitModels";
import { GitRepository } from 'azure-devops-extension-api/Git/Git';

export interface GitRepositoryModel extends GitRepository {
  isDisabled: boolean;
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
  public workItemsCount: number = 0;
  public comment: PullRequestComment;
  public policies: PullRequestPolicy[] = [];
  public isAllPoliciesOk: boolean = false;
  public hasFailures: boolean = false;
  public labels: WebApiTagDefinition[] = [];
  public lastVisit?: Date;
  private loadingData: boolean = false;
  private requiredReviewers: IdentityRefWithVote[] = [];

  constructor(
    public gitPullRequest: GitPullRequest,
    public projectName: string,
    public baseUrl: string,
    public callbackState: (pullRequestModel: PullRequestModel) => void
  ) {
    this.comment = new PullRequestComment();
    this.setupPullRequest();
  }

  public saveLastVisit = (): boolean => {
    try {
      if (this.gitPullRequest.status !== PullRequestStatus.Active) {
        return true;
      }

      this.lastVisit = new Date();
      const storeKey = `${USER_SETTINGS_STORE_KEY}_${this.gitPullRequest.pullRequestId}`;
      localStorage.setItem(storeKey, JSON.stringify(this.lastVisit));

      return true;
    } catch (error) {
      return false;
    }
  };

  public hasNewChanges(): boolean {
    return this.hasCommitChanges() || this.hasCommentChanges() ? true : false;
  }

  public hasCommentChanges(): boolean {
    return this.lastVisit &&
      this.comment.lastUpdatedDate &&
      this.comment.lastUpdatedDate > this.lastVisit
      ? true
      : false;
  }

  public hasCommitChanges(): boolean {
    return this.lastVisit &&
      this.gitPullRequest.status === PullRequestStatus.Active &&
      this.lastVisit < this.getLastCommitDate()
      ? true
      : false;
  }

  public loadLastVisit = () => {
    if (this.gitPullRequest.status !== PullRequestStatus.Active) {
      return;
    }

    const storeKey = `${USER_SETTINGS_STORE_KEY}_${this.gitPullRequest.pullRequestId}`;
    const cachedInstance = localStorage.getItem(storeKey);

    if (!cachedInstance || cachedInstance.length === 0) {
      return;
    }

    const cachedLastVisit: Date = JSON.parse(cachedInstance);
    const savedDate = new Date(cachedLastVisit.toString());

    this.lastVisit = savedDate;
  };

  public getLastCommitDate(): Date {
    return this.lastCommitDetails === undefined ||
      this.lastCommitDetails.committer === undefined
      ? this.gitPullRequest.creationDate
      : this.lastCommitDetails!.committer.date!;
  }

  public triggerState() {
    this.pullRequestProgressStatus = this.getStatusIndicatorData(
      this.gitPullRequest.reviewers,
      this.isAllPoliciesOk
    );
    this.callbackState(this);
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

    Promise.all(this.getAsyncCallList()).finally(() => {
      this.callTriggerState();
    });
  }

  private getAsyncCallList(): Promise<any>[] {
    const abandoned =
      this.gitPullRequest.status === PullRequestStatus.Abandoned;
    let callList = [];

    if (abandoned === false) {
      callList.push(
        ...[
          this.getPullRequestAdditionalDetailsAsync(),
          this.getPullRequestThreadAsync(),
          this.getPullRequestWorkItemAsync(),
          this.getPullRequestPolicyAsync(),
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
    this.requiredReviewers = this.gitPullRequest.reviewers
      ? this.gitPullRequest.reviewers.filter(
          (r) => r.isRequired !== undefined && r.isRequired === true
        )
      : [];
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
    this.loadLastVisit();
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
    isAllPoliciesOk: boolean
  ): IStatusIndicatorData {
    const indicatorData: IStatusIndicatorData = {
      label: "Waiting Review",
      statusProps: { ...Statuses.Queued, ariaLabel: "Waiting Review" },
    };

    if (this.hasFailures) {
      indicatorData.statusProps = {
        ...Statuses.Failed,
        ariaLabel: "Pull Request is in failure status.",
      };
      indicatorData.label = "Pull Request is in failure status.";
    } else if (reviewers.some((r) => r.vote === ReviewerVoteOption.Rejected)) {
      indicatorData.statusProps = {
        ...Statuses.Failed,
        ariaLabel: "One or more reviewer(s) has rejected.",
      };
      indicatorData.label = "One or more reviewer(s) has rejected.";
    } else if (
      reviewers.some((r) => r.vote === ReviewerVoteOption.WaitingForAuthor)
    ) {
      indicatorData.statusProps = {
        ...Statuses.Warning,
        ariaLabel: "One or more reviewer(s) is waiting for the author.",
      };
      indicatorData.label =
        "One or more reviewer(s) is waiting for the author.";
    } else if (
      this.requiredReviewers.every(
        (r) =>
          r.vote === ReviewerVoteOption.Approved ||
          r.vote === ReviewerVoteOption.ApprovedWithSuggestions
      ) &&
      isAllPoliciesOk
    ) {
      indicatorData.statusProps = {
        ...Statuses.Success,
        ariaLabel: "Ready for completion",
      };
      indicatorData.label = "Success";
    } else if (isAllPoliciesOk === false) {
      indicatorData.statusProps = {
        ...Statuses.Running,
        ariaLabel: "Waiting all policies to be completed",
      };
      indicatorData.label = "Waiting all policies to be completed";
    } else if (
      this.requiredReviewers.every((r) => r.vote === ReviewerVoteOption.NoVote)
    ) {
      indicatorData.statusProps = {
        ...Statuses.Waiting,
        ariaLabel: "Waiting Review of required Reviewers",
      };
      indicatorData.label = "Waiting Review of required Reviewers";
    } else if (
      this.requiredReviewers.some((r) => r.vote === ReviewerVoteOption.NoVote)
    ) {
      indicatorData.statusProps = {
        ...Statuses.Running,
        ariaLabel: "Waiting remaining required Reviewers",
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
          const lastUpdatedDateIndex = value.findIndex(
            (x) =>
              this.lastVisit !== undefined && x.lastUpdatedDate > this.lastVisit
          );
          const lastUpdatedDate =
            lastUpdatedDateIndex >= 0
              ? value[lastUpdatedDateIndex].lastUpdatedDate
              : undefined;

          self.comment = new PullRequestComment();

          self.comment.totalcomment =
            threads !== undefined
              ? threads.filter((x) => !x.isDeleted).length
              : 0;
          self.comment.terminatedComment =
            terminatedThread !== undefined ? terminatedThread.length : 0;
          self.comment.lastUpdatedDate = lastUpdatedDate;
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
        self.workItemsCount = value !== undefined ? value.length : 0;
      })
      .catch((error) => {
        console.log(
          "There was an error calling the Pull Request work item (method: getPullRequestWorkItemAsync)."
        );
        console.log(error);
      });
  }

  private async getPullRequestPolicyAsync() {
    let self = this;

    ///** Work in Progress :-) */
    // const details = await getPullRequestOverallStatus(
    //   this.baseHostUrl,
    //   DevOps.getHost().name,
    //   this.gitPullRequest.repository.project,
    //   this.gitPullRequest.repository,
    //   this
    // );

    const policies = await getEvaluationsPerPullRequest(
      this.baseHostUrl,
      this.gitPullRequest.repository.project,
      this.gitPullRequest.pullRequestId
    );

    self.isAllPoliciesOk =
      policies.length === 0 ||
      policies
        .filter(
          (i) =>
            i.configuration.isEnabled === true &&
            i.configuration.isBlocking === true
        )
        .every((i) => {
          return i.status === "approved";
        });

    policies
      .filter(
        (p) =>
          p.configuration.isEnabled === true &&
          p.configuration.isBlocking === true
      )
      .forEach((p) => {
        const pullRequestPolicy = new PullRequestPolicy();
        pullRequestPolicy.id = p.evaluationId;
        pullRequestPolicy.displayName = `${p.configuration.type.displayName}`;
        pullRequestPolicy.isApproved = p.status === "approved";

        switch (p.configuration.type.id) {
          case EvaluationPolicyType.MinimumReviewers: {
            pullRequestPolicy.displayName = `${p.configuration.settings.minimumApproverCount} ${p.configuration.type.displayName}`;
            break;
          }
          case EvaluationPolicyType.Build: {
            pullRequestPolicy.displayName = `${p.configuration.type.displayName} - ${p.context.buildDefinitionName}`;
            break;
          }
          case EvaluationPolicyType.RequiredReviewers: {
            const requiredReviewerName = this.gitPullRequest.reviewers.filter(
              (r) =>
                p.configuration.settings.requiredReviewerIds.findIndex(
                  (r2) => r2 === r.id
                ) >= 0
            );
            pullRequestPolicy.displayName = `${
              p.configuration.type.displayName
            } - ${
              requiredReviewerName && requiredReviewerName.length > 0
                ? requiredReviewerName[0].displayName
                : "Not found"
            }`;
            break;
          }
        }

        self.policies.push(pullRequestPolicy);
        return p;
      });
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
    baseUrl: string,
    callbackState: (pullRequestModel: PullRequestModel) => void
  ): PullRequestModel[] {
    const modelList: PullRequestModel[] = [];

    pullRequestList!.forEach((pr) => {
      modelList.push(
        new PullRequestModel(pr, pr.repository.project.name, baseUrl, callbackState)
      );

      return pr;
    });

    return modelList;
  }
}
