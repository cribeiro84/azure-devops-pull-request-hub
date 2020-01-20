import { StatusSize, Statuses } from "azure-devops-ui/Status";
import { PillSize, PillVariant } from "azure-devops-ui/Pill";
import { PillGroupOverflow } from "azure-devops-ui/PillGroup";
import { CommonServiceIds } from "azure-devops-extension-api";
import { ZeroDataActionType } from "azure-devops-ui/ZeroData";
import { PullRequestAsyncStatus } from "azure-devops-extension-api/Git/Git";
import * as Data from "../tabs/PulRequestsTabData"

export const AZDEVOPS_CLOUD_API_ORGANIZATION = "https://dev.azure.com";
export const AZDEVOPS_CLOUD_API_ORGANIZATION_OLD =
  "https://[org].visualstudio.com";
export const AZDEVOPS_API_ORGANIZATION_RESOURCE =
  "/_apis/resourceAreas/79134C72-4A58-4B42-976C-04E7115F32BF";
export const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === "[::1]" ||
    // 127.0.0.1/8 is considered localhost for IPv4.
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

export function hasPullRequestFailure(pullRequest: Data.PullRequestModel): boolean {
  const prMergeStatus = pullRequest.gitPullRequest.mergeStatus;
  return (
    prMergeStatus === PullRequestAsyncStatus.Conflicts ||
    prMergeStatus === PullRequestAsyncStatus.Failure ||
    prMergeStatus === PullRequestAsyncStatus.RejectedByPolicy
  );
}

export function getStatusIcon(vote: number) {
  switch (vote) {
    case 10:
      return Statuses.Success;
    case 5:
      return Statuses.Success;
    case -10:
      return Statuses.Failed;
    case -5:
      return Statuses.Warning;
  }

  return Statuses.Queued;
}

export function getStatusSizeValue(value: string): StatusSize {
  switch (value) {
    case "s":
      return "12" as StatusSize;
    case "m":
      return "16" as StatusSize;
    case "l":
      return "24" as StatusSize;
    case "xl":
      return "32" as StatusSize;
    default:
      return "12" as StatusSize;
  }
}

export function getPillSizeValue(value: string): PillSize {
  switch (value) {
    case "compact":
      return 0 as PillSize;
    case "regular":
      return 1 as PillSize;
    case "large":
      return 2 as PillSize;
    default:
      return 0 as PillSize;
  }
}

export function getPillGroupOverflowValue(value: string): PillGroupOverflow {
  switch (value) {
    case "clip":
      return 0 as PillGroupOverflow;
    case "wrap":
      return 1 as PillGroupOverflow;
    case "fade":
      return 2 as PillGroupOverflow;
    default:
      return 0 as PillGroupOverflow;
  }
}

export function getPillVariantValue(value: string): PillVariant {
  switch (value) {
    case "standard":
      return 0 as PillVariant;
    case "outlined":
      return 1 as PillVariant;
    case "colored":
      return 2 as PillVariant;
    default:
      return 0 as PillVariant;
  }
}

export function getCommonServiceIdsValue(value: string): CommonServiceIds {
  switch (value) {
    case "ExtensionDataService":
      return "ms.vss-features.extension-data-service" as CommonServiceIds;
    case "GlobalMessagesService":
      return "ms.vss-tfs-web.tfs-global-messages-service" as CommonServiceIds;
    case "HostNavigationService":
      return "ms.vss-features.host-navigation-service" as CommonServiceIds;
    case "LocationService":
      return "ms.vss-features.location-service" as CommonServiceIds;
    case "ProjectPageService":
      return "ms.vss-tfs-web.tfs-page-data-service" as CommonServiceIds;
    default:
      throw new Error("Unsupported service");
  }
}

export function getZeroDataActionTypeValue(value: string): ZeroDataActionType {
  switch (value) {
    case "ctaButton":
      return 0 as ZeroDataActionType;
    case "link":
      return 2 as ZeroDataActionType;
    default:
      return 0 as ZeroDataActionType;
  }
}
