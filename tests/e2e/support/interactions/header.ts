import { SITE_DOMAIN } from '@/presentation/components/Shared/SiteIdentity';

export function getHeaderBrandTitle() {
  cy.contains('h1', SITE_DOMAIN);
}
