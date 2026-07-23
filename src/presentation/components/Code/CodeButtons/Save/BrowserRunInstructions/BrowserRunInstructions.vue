<template>
  <section>
    <p>
      The script was downloaded to your device. Run it locally by following these steps:
    </p>
    <p>
      Tap or hover on an information
      <InfoTooltipInline>Engage with icons like this for extra wisdom!</InfoTooltipInline>
      icon for more detail about a step.
    </p>
    <p>
      <PlatformInstructionSteps :filename="filename" />
    </p>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import InfoTooltipInline from './Help/InfoTooltipInline.vue';
import PlatformInstructionSteps from './Steps/PlatformInstructionSteps.vue';

export default defineComponent({
  components: {
    InfoTooltipInline,
    PlatformInstructionSteps,
  },
  props: {
    filename: {
      type: String,
      required: true,
    },
  },
});
</script>

<style scoped lang="scss">
</style>
