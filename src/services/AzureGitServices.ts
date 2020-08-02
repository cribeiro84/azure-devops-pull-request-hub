import * as DevOps from "azure-devops-extension-sdk";
import { AzureGitModels } from "../models/GitModels";
import { TeamProjectReference } from "azure-devops-extension-api/Core/Core";
import { IProjectInfo } from "azure-devops-extension-api";
import { GitRepository } from "azure-devops-extension-api/Git/Git";
import { PullRequestModel } from "../models/PullRequestModel";

const evaluationApiUrl =
  "[baseUrl]/_apis/policy/evaluations?artifactId=[artifactId]&api-version=5.1-preview.1";
const hierarchyQueryApiUrl =
  "[baseUrl]/_apis/Contribution/HierarchyQuery/project/[projectId]?api-version=5.1-preview.1";

export async function getEvaluationsPerPullRequest(
  baseUrl: string,
  instance: string,
  project: IProjectInfo | TeamProjectReference | undefined,
  pullRequestId: number
): Promise<AzureGitModels.Value[]> {
  const artifactId = `vstfs:///CodeReview/CodeReviewId/${
    project!.id
  }/${pullRequestId}`;
  const accessToken = await DevOps.getAccessToken();

  const apiSettings = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  };

  const apiUrl = evaluationApiUrl
    .replace("[baseUrl]", baseUrl)
    .replace("[projectName]", project!.name)
    .replace("[artifactId]", encodeURIComponent(artifactId));

  return fetch(apiUrl, apiSettings)
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      return (data as AzureGitModels.RootObject).value;
    });
}

export async function getPullRequestOverallStatus(
  baseUrl: string,
  instance: string,
  project: IProjectInfo | TeamProjectReference | undefined,
  repository: GitRepository,
  pullRequest: PullRequestModel
) {
  const payload = {
    contributionIds: ["ms.vss-code-web.pr-detail-data-provider"],
    dataProviderContext: {
      properties: {
        baseIterationId: 0,
        iterationId: 10,
        pullRequestId: pullRequest.gitPullRequest.pullRequestId,
        repositoryId: repository.id,
        types: 1019,
        sourcePage: {
          url:
            pullRequest.pullRequestHref!,
          routeId: "ms.vss-code-web.pull-request-details-route",
          routeValues: {
            project: project!.name,
            GitRepositoryName: repository.name,
            parameters: pullRequest.gitPullRequest.pullRequestId,
            vctype: "git",
            controller: "ContributedPage",
            action: "Execute",
            serviceHost: "6d5719e3-7869-4552-90b9-1d5c8a63197a (caixaazul)",
          },
        },
      },
    },
  };

  const accessToken = await DevOps.getAccessToken();

  const apiSettings = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  };

  const apiUrl = hierarchyQueryApiUrl
    .replace("[baseUrl]", baseUrl)
    .replace("[instance]", instance)
    .replace("[projectId]", project!.id);

  return fetch(apiUrl, apiSettings)
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      console.log(data);
      return (data);
    });
}
