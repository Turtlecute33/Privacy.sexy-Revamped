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

.footer {
  border-top: 1px solid $color-border;
  background: $color-surface-elevated;

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    width: min(1440px, calc(100% - 64px));
    min-height: 112px;
    margin: 0 auto;
    padding: 24px 0;
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 16px;

    > div {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    strong {
      color: $color-primary-darkest;
      font-size: $font-size-absolute-normal;
    }

    span {
      color: $color-on-surface-muted;
      font-size: $font-size-absolute-small;
    }
  }

  &__mark {
    display: block;
    width: 30px;
    height: 34px;
    flex: 0 0 auto;
    background: $color-primary;
    clip-path: polygon(50% 0, 100% 20%, 92% 72%, 50% 100%, 8% 72%, 0 20%);
  }

  &__section {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 9px 13px;
      border: 1px solid $color-border;
      border-radius: 10px;
      color: $color-on-surface;
      text-decoration: none;
      transition:
        border-color $motion-duration-fast $motion-ease-standard,
        color $motion-duration-fast $motion-ease-standard,
        background-color $motion-duration-fast $motion-ease-standard,
        transform $motion-duration-standard $motion-ease-out;

      &:hover {
        border-color: rgba($color-primary, 0.45);
        background: $color-primary-light;
        color: $color-primary-dark;
        text-decoration: none;
        transform: translateY(-1px);
      }
    }
  }
}

@media screen and (max-width: $media-screen-medium-width) {
  .footer {
    &__inner {
      align-items: flex-start;
      flex-direction: column;
      width: min(100% - 32px, 1440px);
      min-height: 0;
      padding: 28px 0;
    }
  }
}
</style>
