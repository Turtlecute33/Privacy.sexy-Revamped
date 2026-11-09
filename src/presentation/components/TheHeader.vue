<template>
  <!--
    One floating glass bar holds everything that applies to the whole selection: which system the
    script is for, a preset to start from, and search. The workbench below is then purely about
    browsing, choosing and reviewing.
  -->
  <header class="topbar">
    <div class="topbar__brand">
      <span class="topbar__logo" aria-hidden="true">
        <AppIcon icon="logo" />
      </span>
      <h1 class="brand">
        {{ title }} <span class="brand__suffix">Revamped</span>
      </h1>
      <!--
        The release this page is running, so a visitor (or a bug report) can tell whether a cached
        tab is behind the latest deploy. Outside the <h1>, which stays the site's name, and linked
        to that release's notes.
      -->
      <a
        class="topbar__version"
        :href="releaseNotesUrl"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`Version ${version}, release notes`"
      >v{{ version }}</a>
    </div>
    <TheScriptsMenu class="topbar__menu" />
    <TheSearchBar class="topbar__search" />
  </header>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { injectKey } from '@/presentation/injectionSymbols';
import AppIcon from '@/presentation/components/Shared/Icon/AppIcon.vue';
import TheScriptsMenu from '@/presentation/components/Scripts/Menu/TheScriptsMenu.vue';
import TheSearchBar from '@/presentation/components/TheSearchBar.vue';

export default defineComponent({
  components: {
    AppIcon,
    TheScriptsMenu,
    TheSearchBar,
  },
  setup() {
    const { projectDetails } = injectKey((keys) => keys.useApplication);

    const title = computed(() => projectDetails.name);

    const version = computed(() => projectDetails.version.toString());

    const releaseNotesUrl = computed(() => `${projectDetails.repositoryWebUrl}/releases/tag/v${version.value}`);

    return {
      title,
      version,
      releaseNotesUrl,
    };
  },
});

</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.topbar {
  @include glass-surface($radius: 20px);
  display: flex;
  align-items: center;
  gap: 20px;
  min-height: 60px;
  padding: 9px 10px 9px 12px;
}

.topbar__brand {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 11px;
}

/*
  The mark sits on a small glossy tile, the way an app icon does: an accent gradient, a lit top
  edge and a soft drop, so it reads as a solid object floating on the glass bar.
*/
.topbar__logo {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 55%),
    linear-gradient(140deg, #6f97ff 0%, #2f62e0 52%, #14a58a 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.45),
    inset 0 -1px 0 rgba(0, 0, 0, 0.12),
    0 4px 12px -2px rgba(47, 98, 224, 0.45);
  color: #fff;
  font-size: 21px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text);
  font-family: $font-family-display;
  font-size: 18px;
  font-weight: 650;
  line-height: 1;
  letter-spacing: -0.025em;
  white-space: nowrap;
}

.brand__suffix {
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-text);
  font-family: $font-family-main;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

/* Quieter than the "Revamped" pill: reference information, not branding. */
.topbar__version {
  flex: 0 0 auto;
  margin-left: -5px;
  padding: 3px 6px;
  border-radius: 999px;
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-decoration: none;

  // The global external-link glyph would be wider than the label itself.
  &::after {
    display: none;
  }

  &:hover {
    background: var(--fill-hover);
    color: var(--text-secondary);
    text-decoration: none;
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
  }
}

.topbar__menu {
  flex: 1 1 auto;
  min-width: 0;
}

.topbar__search {
  flex: 0 1 320px;
  min-width: 200px;
}

@media screen and (max-width: 1180px) {
  .topbar {
    gap: 14px;
  }

  .brand__suffix {
    display: none;
  }

  .topbar__search {
    flex-basis: 240px;
    min-width: 170px;
  }
}

/* Stacked: brand and search share the first row, the two pickers take the full second row. */
@media screen and (max-width: $media-vertical-view-breakpoint) {
  .topbar {
    flex-wrap: wrap;
    gap: 10px 12px;
    padding: 10px;
  }

  .brand__suffix {
    display: inline-block;
  }

  .topbar__search {
    flex: 1 1 220px;
  }

  .topbar__menu {
    order: 3;
    flex-basis: 100%;
  }
}

@media screen and (max-width: $media-screen-small-width) {
  .brand__suffix {
    display: none;
  }
}
</style>
