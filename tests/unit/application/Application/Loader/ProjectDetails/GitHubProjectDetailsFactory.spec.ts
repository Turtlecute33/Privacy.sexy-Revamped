import { describe, it, expect } from 'vitest';
import { VersionStub } from '@tests/unit/shared/Stubs/VersionStub';
import type { PropertyKeys } from '@/TypeHelpers';
import type { ProjectDetailsParameters } from '@/application/Application/Loader/ProjectDetails/ProjectDetailsFactory';
import { createGitHubProjectDetails } from '@/application/Application/Loader/ProjectDetails/GitHubProjectDetailsFactory';
import { ProjectDetailsParametersStub } from '@tests/unit/shared/Stubs/ProjectDetailsParametersStub';
import type { ProjectDetails } from '@/domain/Project/ProjectDetails';

describe('GitHubProjectDetailsFactory', () => {
  describe('retrieval of property values', () => {
    interface PropertyTestScenario {
      readonly description?: string;
      readonly expectedValue: string;
      readonly prepareParams: (
        params: ProjectDetailsParametersStub,
        expected: string,
      ) => ProjectDetailsParameters;
      readonly getActualValue: (sut: ProjectDetails) => string;
    }
    const propertyTestScenarios: {
      readonly [K in PropertyKeys<ProjectDetails>]:
      readonly PropertyTestScenario[];
    } = {
      name: [{
        expectedValue: 'expected-app-name',
        prepareParams: (params, expected) => params
          .withName(expected),
        getActualValue: (sut) => sut.name,
      }],
      version: [{
        expectedValue: '0.11.3',
        prepareParams: (params, expected) => params
          .withVersion(new VersionStub(expected)),
        getActualValue: (sut) => sut.version.toString(),
      }],
      slogan: [{
        expectedValue: 'expected-slogan',
        prepareParams: (params, expected) => params
          .withSlogan(expected),
        getActualValue: (sut) => sut.slogan,
      }],
      repositoryUrl: [{
        description: 'without `.git` suffix',
        expectedValue: 'expected-repository-url',
        prepareParams: (builder, expected) => builder
          .withRepositoryUrl(expected),
        getActualValue: (sut) => sut.repositoryUrl,
      }, {
        description: 'with `.git` suffix',
        expectedValue: 'expected-repository-url',
        prepareParams: (builder, expected) => builder
          .withRepositoryUrl(expected),
        getActualValue: (sut) => sut.repositoryUrl,
      }],
      repositoryWebUrl: [{
        description: 'without `.git` suffix',
        expectedValue: 'expected-repository-url',
        prepareParams: (params, expected) => params
          .withRepositoryUrl(expected),
        getActualValue: (sut) => sut.repositoryWebUrl,
      }, {
        description: 'with `.git` suffix',
        expectedValue: 'expected-repository-url',
        prepareParams: (params, expected) => params
          .withRepositoryUrl(`${expected}.git`),
        getActualValue: (sut) => sut.repositoryWebUrl,
      }],
      homepage: [{
        expectedValue: 'expected-homepage',
        prepareParams: (params, expected) => params
          .withHomepage(expected),
        getActualValue: (sut) => sut.homepage,
      }],
      feedbackUrl: [{
        description: 'without `.git` suffix',
        expectedValue: 'https://github.com/Turtlecute33/Privacy.sexy-Revamped/issues',
        prepareParams: (params) => params
          .withRepositoryUrl('https://github.com/Turtlecute33/Privacy.sexy-Revamped'),
        getActualValue: (sut) => sut.feedbackUrl,
      }, {
        description: 'with `.git` suffix',
        expectedValue: 'https://github.com/Turtlecute33/Privacy.sexy-Revamped/issues',
        prepareParams: (params) => params
          .withRepositoryUrl('https://github.com/Turtlecute33/Privacy.sexy-Revamped.git'),
        getActualValue: (sut) => sut.feedbackUrl,
      }],
    };
    Object.entries(propertyTestScenarios).forEach(([propertyName, testList]) => {
      testList.forEach(({
        description, prepareParams, expectedValue, getActualValue,
      }) => {
        it(`${propertyName}${description ? ` (${description})` : ''}`, () => {
          // arrange
          const params = prepareParams(
            new ProjectDetailsParametersStub(),
            expectedValue,
          );

          // act
          const sut = create(() => params);
          const actual = getActualValue(sut);

          // assert
          expect(actual).to.equal(expectedValue);
        });
      });
    });
  });
});

function create(
  prepareParams?: (params: ProjectDetailsParametersStub) => ProjectDetailsParameters,
) {
  const params: ProjectDetailsParameters = prepareParams
    ? prepareParams(new ProjectDetailsParametersStub())
    : new ProjectDetailsParametersStub();
  return createGitHubProjectDetails(params);
}
