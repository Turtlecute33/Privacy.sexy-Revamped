export function openCategory(options: {
  readonly categoryIndex: number;
}) {
  cy.get('.rail__item')
    .eq(options.categoryIndex)
    .click();
}

export const RevertToggleSelector = '.row__revert .toggle-switch';

/**
 * Picks the first script offering a revert switch, rather than the first script overall.
 * Each runner loads the collection of its own operating system, and in the Windows and Linux
 * collections the first reversible script sits far enough down the list for the panel to scroll
 * its switch out of view. Clicking the row brings it back into view.
 */
export function selectFirstVisibleReversibleScript() {
  cy.get('.row')
    .filter(':visible')
    .filter((_, row) => row.querySelector(RevertToggleSelector) !== null)
    .first()
    .find('.row__label')
    .click();
}
