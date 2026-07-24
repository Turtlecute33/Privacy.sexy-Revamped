import { OperatingSystem } from '@/domain/OperatingSystem';
import { getOperatingSystemDisplayName } from '@/presentation/components/Shared/OperatingSystemNames';
import { AllSupportedOperatingSystems } from '@tests/shared/TestCases/SupportedOperatingSystems';

describe('operating system selector', () => {
  // Regression test for a bug where switching between operating systems caused uncaught exceptions.
  it('switches between operating systems successfully', () => {
    // arrange
    cy.visit('/');
    getSupportedOperatingSystemsList().forEach((operatingSystem) => {
      // act
      selectOperatingSystem(operatingSystem);
      // assert
      assertExpectedActions();
    });
  });
});

function getSupportedOperatingSystemsList() {
  /*
    Marked: refactor-with-aot-compilation
      The operating systems list is hardcoded due to the challenge of loading
      the application within Cypress, as its compilation is tightly coupled with Vite.
      Ideally, this should dynamically fetch the list from the compiled application.
  */
  return AllSupportedOperatingSystems;
}

function assertExpectedActions() {
  /*
    Marked: refactor-with-aot-compilation
      Assertions are currently hardcoded due to the inability to load the application within
      Cypress, as compilation is tightly coupled with Vite. Future refactoring should dynamically
      assert the visibility of all actions (e.g., `actions.map((a) => cy.contains(a.title))`)
      once the application's compilation process is decoupled from Vite.
  */
  cy.contains('Privacy cleanup');
}

function selectOperatingSystem(operatingSystem: OperatingSystem) {
  const operatingSystemLabel = getOperatingSystemDisplayName(operatingSystem);
  if (!operatingSystemLabel) {
    throw new Error(`Label does not exist for operating system: ${OperatingSystem[operatingSystem]}`);
  }
  cy.log(`Visiting operating system: ${operatingSystemLabel}`);
  cy
    .contains('span', operatingSystemLabel)
    .click();
}
