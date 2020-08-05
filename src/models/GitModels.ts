import { GitRepository } from "azure-devops-extension-api/Git/Git";

export enum EvaluationPolicyType {
  MinimumReviewers = "fa4e907d-c16b-4a4c-9dfa-4906e5d171dd",
  WorkItemLinking = "40e92b44-2fe1-4dd6-b3d8-74a9c21d0c6e",
  Build = "0609b952-1397-4640-95ec-e00a01b2c241",
  RequiredReviewers = "fd2167ab-b0be-447a-8ec8-39368250530e",
  CommentRequirements = "c6a1889d-b943-4856-b76f-9e46bb6b0df2",
}

export declare module AzureGitModels {
  export interface Avatar {
    href: string;
  }

  export interface Links {
    avatar: Avatar;
    self: Self;
    policyType: PolicyType;
  }

  export interface CreatedBy {
    displayName: string;
    url: string;
    _links: Links;
    id: string;
    uniqueName: string;
    imageUrl: string;
    descriptor: string;
  }

  export interface Scope {
    refName: string;
    matchKind: string;
    repositoryId: string;
  }

  export interface Settings {
    minimumApproverCount: number;
    creatorVoteCounts: boolean;
    allowDownvotes: boolean;
    resetOnSourcePush: boolean;
    blockLastPusherVote: boolean;
    scope: Scope[];
    buildDefinitionId?: number;
    queueOnSourceUpdateOnly?: boolean;
    manualQueueOnly?: boolean;
    displayName?: any;
    validDuration?: number;
    requiredReviewerIds: string[];
  }

  export interface Self {
    href: string;
  }

  export interface PolicyType {
    href: string;
  }

  export interface Type {
    id: string;
    url: string;
    displayName: string;
  }

  export interface Configuration {
    createdBy: CreatedBy;
    createdDate: Date;
    isEnabled: boolean;
    isBlocking: boolean;
    isDeleted: boolean;
    settings: Settings;
    isEnterpriseManaged: boolean;
    _links: Links;
    revision: number;
    id: number;
    url: string;
    type: Type;
  }

  export interface Context {
    lastMergeCommitId: string;
    lastMergeSourceCommitId: string;
    lastMergeTargetCommitId: string;
    buildId: number;
    buildDefinitionId: number;
    buildDefinitionName: string;
    buildIsNotCurrent: boolean;
    buildStartedUtc: Date;
    isExpired: boolean;
    buildAfterMerge: boolean;
    wasAutoRequeued: boolean;
    buildOutputPreview?: any;
  }

  export interface Value {
    configuration: Configuration;
    artifactId: string;
    evaluationId: string;
    startedDate: Date;
    completedDate: Date;
    status: string;
    context: Context;
  }

  export interface GitPolicyRoot {
    value: Value[];
    count: number;
  }

  export interface Properties {
    sourceRepository: GitRepository;
    sourceBranch: string;
    targetRepositoryId: string;
    targetBranch: string;
    pushDate: Date;
  }

  export interface GitSuggestionsRoot {
    type: string;
    properties: Properties;
  }
}
