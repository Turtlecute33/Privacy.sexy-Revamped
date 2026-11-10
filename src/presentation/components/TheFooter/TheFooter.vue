<template>
  <footer class="footer">
    <!--
      The fork relationship belongs in the rendered body, not only in <title> and meta. Before
      this line the deployed HTML contained the words "Revamped" and "fork" zero times, so the
      only brand the page asserted on-page was the upstream one, and the terms the site is
      meant to be found for appeared nowhere a crawler or an AI scraper reads. It moved here from
      the old hero when the header became a slim tool bar; it is still visible body text.
    -->
    <p class="footer__lede">
      <strong>{{ slogan }}.</strong>
      Independently maintained fork of privacy.sexy, not affiliated with the original.
    </p>
    <!--
      The static catalog and comparison pages (scripts/generate-catalog-pages) are reachable from
      here and not only from the sitemap. Plain links from the home page are how crawlers find and
      weigh them, and how an AI scraper that reads one page learns the full index exists.
    -->
    <nav class="footer__links" aria-label="Script catalogs and project links">
      <a
        v-for="page in catalogPages"
        :key="page.path"
        :href="page.href"
      >{{ page.label }}</a>
      <span class="footer__divider" aria-hidden="true" />
      <a :href="feedbackUrl" target="_blank" rel="noopener noreferrer">Feedback</a>
      <a :href="repositoryUrl" target="_blank" rel="noopener noreferrer">Source code</a>
    </nav>
  </footer>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { injectKey } from '@/presentation/injectionSymbols';

/* Paths are relative to the deploy base, matching what `generate-catalog-pages` writes. */
const CATALOG_PAGES: readonly { readonly path: string, readonly label: string }[] = [
  { path: 'windows/', label: 'Windows scripts' },
  { path: 'macos/', label: 'macOS scripts' },
  { path: 'linux/', label: 'Linux scripts' },
  { path: 'privacy-sexy-alternatives/', label: 'Alternatives' },
];

export default defineComponent({
  setup() {
    const { projectDetails } = injectKey((keys) => keys.useApplication);

    const repositoryUrl = computed<string>(() => projectDetails.repositoryWebUrl);

    const feedbackUrl = computed<string>(() => projectDetails.feedbackUrl);

    const slogan = computed<string>(() => projectDetails.slogan);

    const catalogPages = CATALOG_PAGES.map((page) => ({
      ...page,
      href: `${import.meta.env.BASE_URL}${page.path}`,
    }));

    return {
      repositoryUrl,
      feedbackUrl,
      slogan,
      catalogPages,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

/*
  A single quiet line under the workbench, on the page itself rather than on glass: it is
  reference material, not part of the tool.
*/
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px 24px;
  min-height: 40px;
  padding: 0 6px 12px;
  color: var(--text-tertiary);
  font-size: $font-size-absolute-x-small;
  line-height: 1.45;

  &__lede {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    strong {
      color: var(--text-secondary);
      font-weight: 600;
    }
  }

  &__links {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    margin-right: -8px;

    a {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 9px;
      border-radius: 999px;
      color: var(--text-tertiary);
      text-decoration: none;
      transition:
        color $motion-duration-fast $motion-ease-standard,
        background-color $motion-duration-fast $motion-ease-standard;

      // A footer of plain links: the global external-link glyph would only add noise.
      &::after {
        display: none;
      }

      &:hover {
        background: var(--fill-hover);
        color: var(--text);
        text-decoration: none;
      }

      &:focus-visible {
        outline: 2px solid var(--focus-ring);
        outline-offset: 1px;
      }
    }
  }
}

.footer__divider {
  width: 1px;
  height: 12px;
  margin: 0 6px;
  background: var(--hairline);
}

// Touch targets stay comfortable where the pointer is imprecise.
@media (pointer: coarse) {
  .footer__links a {
    min-height: 44px;
  }
}

@media screen and (max-width: $media-vertical-view-breakpoint) {
  .footer {
    align-items: flex-start;
    flex-direction: column;
    padding: 4px 6px 20px;

    &__lede {
      white-space: normal;
    }

    &__links {
      margin-right: 0;
      margin-left: -9px;
    }
  }
}
</style>
