import { describe, it, expect } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import TheHeader from '@/presentation/components/TheHeader.vue';
import { InjectionKeys } from '@/presentation/injectionSymbols';
import { UseApplicationStub } from '@tests/unit/shared/Stubs/UseApplicationStub';
import { ApplicationStub } from '@tests/unit/shared/Stubs/ApplicationStub';
import { ProjectDetailsStub } from '@tests/unit/shared/Stubs/ProjectDetailsStub';
import { VersionStub } from '@tests/unit/shared/Stubs/VersionStub';
import { SITE_DOMAIN } from '@/presentation/components/Shared/SiteIdentity';

const DOM_SELECTOR_VERSION = '.topbar__version';

describe('TheHeader', () => {
  it('names the site by its own domain', () => {
    // arrange
    const expectedName = SITE_DOMAIN;

    // act
    const wrapper = mountComponent(new ProjectDetailsStub());

    // assert
    const headingText = wrapper.find('h1').text();
    expect(headingText).to.equal(expectedName);
  });

  it('shows the running version', () => {
    // arrange
    const version = '1.2.3';
    const expectedText = `v${version}`;
    const projectDetails = new ProjectDetailsStub()
      .withVersion(new VersionStub(version));

    // act
    const wrapper = mountComponent(projectDetails);

    // assert
    const actualText = wrapper.find(DOM_SELECTOR_VERSION).text();
    expect(actualText).to.equal(expectedText);
  });

  it('links the version to its release notes', () => {
    // arrange
    const version = '1.2.3';
    const repositoryWebUrl = 'https://github.com/owner/repository';
    const expectedUrl = `${repositoryWebUrl}/releases/tag/v${version}`;
    const projectDetails = new ProjectDetailsStub()
      .withVersion(new VersionStub(version))
      .withRepositoryWebUrl(repositoryWebUrl);

    // act
    const wrapper = mountComponent(projectDetails);

    // assert
    const actualUrl = wrapper.find(DOM_SELECTOR_VERSION).attributes('href');
    expect(actualUrl).to.equal(expectedUrl);
  });

  it('keeps the version out of the page heading', () => {
    // arrange
    const version = '1.2.3';
    const projectDetails = new ProjectDetailsStub()
      .withVersion(new VersionStub(version));

    // act
    const wrapper = mountComponent(projectDetails);

    // assert
    const headingText = wrapper.find('h1').text();
    expect(headingText).not.to.include(version);
  });
});

function mountComponent(projectDetails: ProjectDetailsStub) {
  const application = new ApplicationStub().withProjectDetails(projectDetails);
  return shallowMount(TheHeader, {
    global: {
      provide: {
        [InjectionKeys.useApplication.key]: new UseApplicationStub()
          .withState(application)
          .get(),
      },
    },
  });
}
