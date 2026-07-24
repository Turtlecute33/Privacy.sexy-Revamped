<template>
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__brand">
        <span class="footer__mark" aria-hidden="true" />
        <div>
          <strong>Privacy should stay in your hands.</strong>
          <span>Open source, transparent, and free.</span>
        </div>
      </div>
      <div class="footer__section">
        <a :href="feedbackUrl" target="_blank" rel="noopener noreferrer">
          <AppIcon class="icon" icon="face-smile" />
          <span>Feedback</span>
        </a>
        <a :href="repositoryUrl" target="_blank" rel="noopener noreferrer">
          <AppIcon class="icon" icon="github" />
          <span>Source code</span>
        </a>
      </div>
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

    return {
      repositoryUrl,
      feedbackUrl,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.icon {
  margin-right: 8px;
}

/*
  The footer shares the page surface instead of sitting on a band of its own: no
  background fill and no full-bleed rule, so it reads as the tail of the page rather
  than a separate section. Whitespace and muted type carry the separation.
*/
.footer {
  background: transparent;

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px 24px;
    /* Matches `.app__main` so the footer lines up with the workbench edges above it. */
    width: min(1440px, calc(100% - 32px));
    margin: 0 auto;
    padding: 18px 0 28px;
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 12px;

    > div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    strong {
      color: $color-on-surface;
      font-size: $font-size-absolute-small;
      font-weight: 600;
    }

    span {
      color: $color-on-surface-muted;
      font-size: $font-size-absolute-x-small;
    }
  }

  &__mark {
    display: block;
    width: 22px;
    height: 25px;
    flex: 0 0 auto;
    background: rgba($color-primary, 0.8);
    clip-path: polygon(50% 0, 100% 20%, 92% 72%, 50% 100%, 8% 72%, 0 20%);
  }

  /*
    Pulled flush with the container edge: the links keep a comfortable hit area, but the
    padding hangs outside the content width so the labels stay optically aligned.
  */
  &__section {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-right: -10px;

    a {
      display: inline-flex;
      align-items: center;
      padding: 8px 10px;
      border-radius: 8px;
      color: $color-on-surface-muted;
      font-size: $font-size-absolute-small;
      text-decoration: none;
      transition:
        color $motion-duration-fast $motion-ease-standard,
        background-color $motion-duration-fast $motion-ease-standard;

      &:hover {
        background: rgba($color-primary, 0.07);
        color: $color-primary-dark;
        text-decoration: none;
      }

      &:focus-visible {
        outline: 2px solid $color-primary;
        outline-offset: 1px;
      }
    }
  }
}

// Touch targets stay comfortable where the pointer is imprecise.
@media (pointer: coarse) {
  .footer__section a {
    min-height: 44px;
  }
}

@media screen and (max-width: $media-screen-medium-width) {
  .footer {
    &__inner {
      align-items: flex-start;
      flex-direction: column;
      gap: 8px;
      width: min(100% - 32px, 1440px);
      padding: 14px 0 24px;
    }

    // Stacked below the brand, the links align to the left edge instead of the right.
    &__section {
      margin-right: 0;
      margin-left: -10px;
    }
  }
}

@media screen and (max-width: $media-screen-small-width) {
  .footer__inner {
    width: min(100% - 20px, 1440px);
  }
}
</style>
