import { ViewportTestScenarios, LargeScreen } from './support/scenarios/viewport-test-scenarios';
import { openCategory } from './support/interactions/category';
import { selectAllScripts, unselectAllScripts } from './support/interactions/script-selection';
import { assertLayoutStability } from './support/assert/layout-stability';

describe('Layout stability', () => {
  ViewportTestScenarios.forEach(({ // some shifts are observed only on extra small or large screens
    name, width, height,
  }) => {
    // Regression test for a bug where selecting a script with an open card caused layout shift
    describe('Initial script selection', () => {
      it(name, () => {
        // arrange
        cy.viewport(width, height);
        cy.visit('/');
        cy.contains('span', 'Windows')
          .click();
        // act & assert
        assertLayoutStability('#app', () => {
          openCategory({
            categoryIndex: 0,
          });
          selectAllScripts();
        });
      });
    });

    // Regression test for a bug where unselecting selected with an open card caused layout shift
    describe('Deselection script selection', () => {
      it(name, () => {
        // arrange
        cy.viewport(width, height);
        cy.visit('/');
        cy.contains('span', 'Windows')
          .click();
        openCategory({
          categoryIndex: 0,
        });
        selectAllScripts();
        // act & assert
        assertLayoutStability('#app', () => {
          unselectAllScripts();
        });
      });
    });
  });

  // Regression test for bug on Chromium where horizontal scrollbar visibility causes layout shifts.
  it('Scrollbar visibility', () => {
    // arrange
    cy.viewport(LargeScreen.width, LargeScreen.height);
    cy.visit('/');
    openCategory({
      categoryIndex: 0,
    });
    // act
    assertLayoutStability('.app__wrapper', () => {
      cy.viewport(LargeScreen.width, 100); // Set small height to trigger horizontal scrollbar.
    }, { excludeHeight: true });
  });
});
