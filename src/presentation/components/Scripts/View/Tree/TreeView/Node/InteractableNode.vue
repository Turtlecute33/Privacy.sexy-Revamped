<template>
  <div
    class="focusable-node"
    tabindex="-1"
    :class="{
      'keyboard-focus': hasKeyboardFocus,
      'is-expandable': isBranchNode,
    }"
    @click.stop="onRowClick"
    @focus="onNodeFocus"
  >
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, toRef } from 'vue';
import { useCurrentTreeNodes } from '../UseCurrentTreeNodes';
import { useNodeState } from './UseNodeState';
import { useKeyboardInteractionState } from './UseKeyboardInteractionState';
import type { TreeRoot } from '../TreeRoot/TreeRoot';
import type { TreeNode, TreeNodeId } from './TreeNode';
import type { PropType } from 'vue';

export default defineComponent({
  props: {
    nodeId: {
      type: String as PropType<TreeNodeId>,
      required: true,
    },
    treeRoot: {
      type: Object as PropType<TreeRoot>,
      required: true,
    },
  },
  setup(props) {
    const { isKeyboardBeingUsed } = useKeyboardInteractionState();
    const { nodes } = useCurrentTreeNodes(toRef(props, 'treeRoot'));
    const currentNode = computed<TreeNode>(() => nodes.value.getNodeById(props.nodeId));
    const { state } = useNodeState(currentNode);

    const hasKeyboardFocus = computed<boolean>(() => {
      if (!isKeyboardBeingUsed.value) {
        return false;
      }
      return state.value.isFocused;
    });

    const onNodeFocus = () => {
      props.treeRoot.focus.setSingleFocus(currentNode.value);
    };

    const isBranchNode = computed<boolean>(() => currentNode.value.hierarchy.isBranchNode);

    // Clicking the row/title expands or collapses a section; individual scripts
    // (leaf nodes) are selected only via their checkbox, so a row click is a no-op.
    function onRowClick() {
      if (!isBranchNode.value) {
        return;
      }
      currentNode.value.state.toggleExpand();
    }

    return {
      onNodeFocus,
      onRowClick,
      currentNode,
      hasKeyboardFocus,
      isBranchNode,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.focusable-node {
  border-radius: 8px;
  outline: none; // We handle keyboard focus through own styling

  // Only expandable rows (sections) are clickable; leaf rows are not.
  &.is-expandable {
    @include clickable;
  }

  &.keyboard-focus {
    outline: 2px solid rgba($color-secondary, 0.6);
    outline-offset: -2px;
  }
}
</style>
