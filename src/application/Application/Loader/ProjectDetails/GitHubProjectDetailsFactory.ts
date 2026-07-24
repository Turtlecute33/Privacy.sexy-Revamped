import type { ProjectDetailsParameters, ProjectDetailsFactory } from './ProjectDetailsFactory';

export const createGitHubProjectDetails: ProjectDetailsFactory = (parameters) => {
  validateParameters(parameters);
  const githubRepositoryWebUrl = getWebUrl(parameters.repositoryUrl);
  return {
    name: parameters.name,
    version: parameters.version,
    slogan: parameters.slogan,
    repositoryUrl: parameters.repositoryUrl,
    homepage: parameters.homepage,
    repositoryWebUrl: githubRepositoryWebUrl,
    feedbackUrl: `${githubRepositoryWebUrl}/issues`,
    releaseUrl: `${githubRepositoryWebUrl}/releases`,
  };
};

function validateParameters(parameters: ProjectDetailsParameters) {
  if (!parameters.name) {
    throw new Error('name is undefined');
  }
  if (!parameters.slogan) {
    throw new Error('undefined slogan');
  }
  if (!parameters.repositoryUrl) {
    throw new Error('repositoryUrl is undefined');
  }
  if (!parameters.homepage) {
    throw new Error('homepage is undefined');
  }
}

function getWebUrl(gitUrl: string) {
  if (gitUrl.endsWith('.git')) {
    return gitUrl.substring(0, gitUrl.length - 4);
  }
  return gitUrl;
}
