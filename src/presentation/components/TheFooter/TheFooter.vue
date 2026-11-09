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
      Debloat Windows 11, disable telemetry, and harden macOS and Linux. Every command is
      shown before you run it.
    </p>
    <div class="footer__links">
      <a :href="feedbackUrl" target="_blank" rel="noopener noreferrer">
        <AppIcon class="icon" icon="face-smile" />
        <span>Feedback</span>
      </a>
      <a :href="repositoryUrl" target="_blank" rel="noopener noreferrer">
        <AppIcon class="icon" icon="github" />
        <span>Source code</span>
      </a>
    </div>
  </footer>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import AppIcon from '@/presentation/components/Shared/Icon/AppIcon.vue';
import { injectKey } from '@/presentation/injectionSymbols';

export default defineComponent({
  components: {
    AppIcon,
  },
  setup() {
    const { projectDetails } = injectKey((keys) => keys.useApplication);

    const repositoryUrl = computed<string>(() => projectDetails.repositoryWebUrl);

    const feedbackUrl = computed<string>(() => projectDetails.feedbackUrl);

    const slogan = computed<string>(() => projectDetails.slogan);

    return {
      repositoryUrl,
      feedbackUrl,
      slogan,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.icon {
  font-size: 12px;
}

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

      // The leading icon already marks these as outbound; the global external-link glyph doubles it.
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
