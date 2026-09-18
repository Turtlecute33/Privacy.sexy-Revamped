/**
 * The editor chunk is fetched lazily, once the code pane approaches the viewport or the visitor
 * interacts with the page, so the highlight attribute only carries a real value after the editor
 * has been built. Cypress's default viewport is wide enough for the pane to be on screen from the
 * start, but that is an accident of the header height rather than something the specs state, so
 * bring the pane into view and wait for the shell to report it is no longer loading the editor.
 */
export function getCurrentHighlightRange() {
  cy.get('#codeEditor').scrollIntoView();
  cy.get('.code-area-shell[aria-busy="false"]');
  return cy
    .get('#codeEditor')
    .invoke('attr', 'data-test-highlighted-range')
    .should('be.a', 'string')
    .should('not.equal', '');
}
