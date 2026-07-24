export function openCategory(options: {
  readonly categoryIndex: number;
}) {
  cy.get('.rail__item')
    .eq(options.categoryIndex)
    .click();
}

export function selectFirstVisibleScript() {
  cy.get('.row__label')
    .filter(':visible')
    .first()
    .click();
}
