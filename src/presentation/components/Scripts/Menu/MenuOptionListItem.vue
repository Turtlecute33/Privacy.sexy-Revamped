<template>
  <span>
    <!--
      Parent wrapper allows `MenuOptionList` to safely add content inside
      such as adding content in `::before` block without making it clickable.
    -->
    <FlatButton
      :pressed="!enabled"
      :label="label"
      flat
      @click="onClicked()"
    />
  </span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import FlatButton from '@/presentation/components/Shared/FlatButton.vue';

export default defineComponent({
  components: { FlatButton },
  props: {
    enabled: {
      type: Boolean,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
  },
  emits: [
    'click',
  ],
  setup(props, { emit }) {
    const onClicked = () => {
      if (!props.enabled) {
        return;
      }
      emit('click');
    };

    return {
      onClicked,
    };
  },
});
</script>
