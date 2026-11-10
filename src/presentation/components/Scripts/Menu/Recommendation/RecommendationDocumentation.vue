<template>
  <section>
    <p class="privacy-rating">
      Privacy: <CircleRating :rating="privacyRating" />
    </p>
    <hr />
    <p>
      {{ description }}
    </p>
    <p class="recommendation">
      {{ recommendation }}
    </p>
    <div
      v-if="includes?.length > 0"
      class="includes"
    >
      <strong>Includes</strong>
      <ul>
        <li
          v-for="inclusionItem in includes"
          :key="inclusionItem"
        >
          {{ inclusionItem }}
        </li>
      </ul>
    </div>
    <div
      v-if="considerations?.length > 0"
      class="considerations"
    >
      <strong>Considerations</strong>
      <ul>
        <li
          v-for="considerationItem in considerations"
          :key="considerationItem"
        >
          {{ considerationItem }}
        </li>
      </ul>
    </div>
  </section>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import CircleRating from './Rating/CircleRating.vue';

export default defineComponent({
  components: {
    CircleRating,
  },
  props: {
    privacyRating: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    recommendation: {
      type: String,
      required: true,
    },
    includes: {
      type: Array as PropType<ReadonlyArray<string>>,
      default: () => [],
    },
    considerations: {
      type: Array as PropType<ReadonlyArray<string>>,
      default: () => [],
    },
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

/*
  Plain text, no icons: a lead paragraph, then labelled lists. `div`, not `p`, for the lists'
  containers, which a `p` cannot hold; the margin keeps the spacing `p` elements get globally.
*/
.includes, .considerations {
  &:not(:last-child) {
    margin-bottom: $spacing-relative-medium;
  }

  ul {
    margin-top: $spacing-relative-x-small;
  }
}

.privacy-rating {
  text-align: center;
}
</style>
