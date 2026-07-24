<template>
  <div>
    <div class="footer">
      <div class="footer__section">
        <div class="footer__section__item">
          <a :href="feedbackUrl" target="_blank" rel="noopener noreferrer">
            <AppIcon class="icon" icon="face-smile" />
            <span>Feedback</span>
          </a>
        </div>
        <div class="footer__section__item">
          <a :href="repositoryUrl" target="_blank" rel="noopener noreferrer">
            <AppIcon class="icon" icon="github" />
            <span>Source Code</span>
          </a>
        </div>
        <div class="footer__section__item">
          <FlatButton
            label="Privacy"
            icon="user-secret"
            flat
            @click="showPrivacyDialog()"
          />
        </div>
      </div>
    </div>
    <ModalDialog v-model="isPrivacyDialogVisible">
      <PrivacyPolicy />
    </ModalDialog>
  </div>
</template>

<script lang="ts">
import {
  defineComponent, ref, computed,
} from 'vue';
import ModalDialog from '@/presentation/components/Shared/Modal/ModalDialog.vue';
import AppIcon from '@/presentation/components/Shared/Icon/AppIcon.vue';
import { injectKey } from '@/presentation/injectionSymbols';
import FlatButton from '@/presentation/components/Shared/FlatButton.vue';
import PrivacyPolicy from './PrivacyPolicy.vue';

export default defineComponent({
  components: {
    ModalDialog,
    PrivacyPolicy,
    AppIcon,
    FlatButton,
  },
  setup() {
    const { projectDetails } = injectKey((keys) => keys.useApplication);

    const isPrivacyDialogVisible = ref(false);

    const repositoryUrl = computed<string>(() => projectDetails.repositoryWebUrl);

    const feedbackUrl = computed<string>(() => projectDetails.feedbackUrl);

    function showPrivacyDialog() {
      isPrivacyDialogVisible.value = true;
    }

    return {
      isPrivacyDialogVisible,
      showPrivacyDialog,
      repositoryUrl,
      feedbackUrl,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.icon {
  margin-right: $spacing-relative-small;
}

.footer {
  display: flex;
  justify-content: space-between;
  @media screen and (max-width: $media-screen-big-width) {
    flex-direction: column;
    align-items: center;
  }
  &__section {
    display: flex;
    flex-wrap: wrap;

    @media screen and (max-width: $media-screen-big-width) {
      justify-content: space-around;
      width: 100%;
      column-gap: $spacing-relative-medium;
      &:not(:first-child) {
        margin-top: $spacing-relative-small;
      }
    }

    &__item:not(:first-child) {
      &::before {
        content: "|";
        padding: 0 $spacing-relative-small;
      }
      @media screen and (max-width: $media-screen-big-width) {
        margin-top: $spacing-absolute-xx-small;
        &::before {
          content: "";
          padding: 0;
        }
      }
    }
  }
}
</style>
