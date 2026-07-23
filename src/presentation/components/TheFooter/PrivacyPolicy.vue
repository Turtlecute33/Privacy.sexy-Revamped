<template>
  <section class="privacy-policy">
    <ul>
      <li>
        <span class="emoji">🚫🍪</span>
        <span>No cookies!</span>
      </li>
      <li>
        <span class="emoji">🚫👀</span>
        <span>No user behavior / IP address collection!</span>
      </li>
      <li>
        <span class="emoji">🤖</span>
        <span>
          All transparent: Deployed automatically from the master branch
          of the <a :href="repositoryUrl" target="_blank" rel="noopener noreferrer">source code</a> with no changes.
        </span>
      </li>
      <li>
        <span class="emoji">📈</span>
        <span>
          Basic <a href="https://aws.amazon.com/cloudfront/reporting/" target="_blank" rel="noopener noreferrer">CDN statistics</a>
          are collected by AWS but they cannot be traced to you or your behavior.
        </span>
      </li>
      <li>
        <span class="emoji">🎉</span>
        <span>
          As almost no data is collected, the application gets better
          only with your active feedback.
          Feel free to <a :href="feedbackUrl" target="_blank" rel="noopener noreferrer">create an issue</a> 😊
        </span>
      </li>
    </ul>
  </section>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { injectKey } from '@/presentation/injectionSymbols';

export default defineComponent({
  setup() {
    const { projectDetails } = injectKey((keys) => keys.useApplication);

    const repositoryUrl = computed<string>(() => projectDetails.repositoryUrl);
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

.privacy-policy {
  display: flex;
  flex-direction: column;
  text-align:center;
}

ul {
  @include reset-ul;
}

.emoji {
  display: block;
}
</style>
