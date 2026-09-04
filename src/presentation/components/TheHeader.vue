<template>
  <header class="hero">
    <div class="hero__inner">
      <div class="hero__copy">
        <p class="hero__eyebrow">
          <span class="hero__eyebrow-mark" />
          Open-source privacy workbench
        </p>
        <h1 class="brand">
          {{ title }}<span class="brand__suffix">Revamped</span>
        </h1>
        <p class="slogan">
          {{ subtitle }}
        </p>
        <!--
          The fork relationship belongs in the rendered body, not only in <title> and meta. Before
          this line the deployed HTML contained the words "Revamped" and "fork" zero times, so the
          only brand the page asserted on-page was the upstream one, and the terms the site is
          meant to be found for appeared nowhere a crawler or an AI scraper reads.
        -->
        <p class="hero__lede">
          Independently maintained fork of privacy.sexy, not affiliated with the original.
          Debloat Windows 11, disable telemetry, and harden macOS and Linux. Every command is
          shown before you run it.
        </p>
      </div>
      <div class="hero__art" aria-hidden="true">
        <svg viewBox="0 0 520 420" role="presentation">
          <g class="poly poly--back">
            <polygon points="258,14 468,116 409,344 238,405 52,300 73,93" />
            <polygon points="258,14 280,142 73,93" />
            <polygon points="468,116 280,142 258,14" />
            <polygon points="409,344 327,255 468,116" />
            <polygon points="238,405 327,255 409,344" />
            <polygon points="52,300 181,236 238,405" />
            <polygon points="73,93 181,236 52,300" />
          </g>
          <g class="poly poly--shield">
            <polygon points="267,86 403,140 385,273 267,347 149,273 131,140" />
            <polygon points="267,86 267,217 131,140" />
            <polygon points="403,140 267,217 267,86" />
            <polygon points="385,273 267,217 403,140" />
            <polygon points="267,347 267,217 385,273" />
            <polygon points="149,273 267,217 267,347" />
            <polygon points="131,140 267,217 149,273" />
          </g>
          <path class="shield-check" d="M211 217l38 38 78-85" />
        </svg>
      </div>
    </div>
  </header>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { injectKey } from '@/presentation/injectionSymbols';

export default defineComponent({
  setup() {
    const { projectDetails } = injectKey((keys) => keys.useApplication);

    const title = computed(() => projectDetails.name);
    const subtitle = computed(() => projectDetails.slogan);

    return {
      title,
      subtitle,
    };
  },
});

</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.hero {
  position: relative;
  overflow: hidden;
  background: $color-surface;
  color: $color-on-surface;
}

.hero__inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 170px;
  align-items: center;
  gap: 24px;
  width: min(1440px, calc(100% - 64px));
  min-height: 132px;
  margin: 0 auto;
  padding: 14px 0;
}

.hero__copy {
  max-width: 760px;
}

.hero__eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 8px;
  color: $color-primary-dark;
  font-size: $font-size-absolute-x-small;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.hero__eyebrow-mark {
  width: 9px;
  height: 9px;
  background: $color-secondary;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

.brand {
  margin: 0;
  color: $color-primary-darkest;
  font-family: $font-family-logo;
  font-size: clamp(44px, 4.5vw, 58px);
  font-weight: 400;
  line-height: 0.88;
  letter-spacing: -0.055em;
}

/*
  Reads as part of the wordmark rather than an appended word: same family, roughly a third of the
  size, lifted off the baseline and in the accent colour so "privacy.sexy" stays the dominant form.
*/
.brand__suffix {
  margin-left: 0.16em;
  color: $color-secondary;
  font-size: 0.34em;
  letter-spacing: 0;
  vertical-align: 0.62em;
}

.slogan {
  margin: 10px 0 0;
  color: $color-primary;
  font-family: $font-family-cursive;
  font-size: clamp(22px, 2.5vw, 28px);
  font-weight: 400;
  line-height: 1;
}

.hero__lede {
  max-width: 62ch;
  margin: 8px 0 0;
  color: $color-on-surface-muted;
  font-size: $font-size-absolute-small;
  line-height: 1.45;
}

.hero__art {
  width: min(100%, 170px);
  justify-self: end;

  svg {
    display: block;
    width: 100%;
    height: auto;
    filter: drop-shadow(0 18px 36px rgba($color-primary-darkest, 0.25));
  }
}

.poly polygon {
  stroke: rgba($color-primary-darkest, 0.08);
  stroke-width: 1.5;
}

.poly--back {
  polygon:nth-child(1) { fill: rgba($color-primary, 0.04); }
  polygon:nth-child(2) { fill: rgba($color-primary, 0.08); }
  polygon:nth-child(3) { fill: rgba($color-primary, 0.12); }
  polygon:nth-child(4) { fill: rgba($color-secondary, 0.1); }
  polygon:nth-child(5) { fill: rgba($color-primary, 0.1); }
  polygon:nth-child(6) { fill: rgba($color-secondary, 0.08); }
  polygon:nth-child(7) { fill: rgba($color-primary, 0.14); }
}

.poly--shield {
  polygon:nth-child(1) { fill: $color-primary; }
  polygon:nth-child(2) { fill: #4575df; }
  polygon:nth-child(3) { fill: #2f59bd; }
  polygon:nth-child(4) { fill: #20b893; }
  polygon:nth-child(5) { fill: #189d80; }
  polygon:nth-child(6) { fill: #2fcdaa; }
  polygon:nth-child(7) { fill: $color-primary; }
}

.shield-check {
  fill: none;
  stroke: $color-on-primary;
  stroke-linecap: square;
  stroke-linejoin: miter;
  stroke-width: 17;
}

@media screen and (max-width: $media-screen-big-width) {
  .hero__inner {
    grid-template-columns: minmax(0, 1fr) 150px;
  }
}

@media screen and (max-width: $media-screen-medium-width) {
  .hero__inner {
    grid-template-columns: minmax(0, 1fr) 120px;
    width: min(100% - 32px, 1440px);
    min-height: 140px;
    padding: 16px 0;
  }

  .hero__art {
    width: 120px;
    opacity: 0.72;
  }

  .hero__copy {
    position: relative;
    z-index: 1;
  }
}

@media screen and (max-width: 600px) {
  .hero__inner {
    grid-template-columns: minmax(0, 1fr);
    min-height: 132px;
  }

  .hero__copy {
    padding-right: 64px;
  }

  .hero__art {
    position: absolute;
    right: 0;
    width: 92px;
    opacity: 0.2;
  }

  .brand {
    font-size: clamp(44px, 13vw, 54px);
  }
}

@media screen and (max-width: $media-screen-small-width) {
  .hero__inner {
    width: min(100% - 20px, 1440px);
  }

  .hero__eyebrow {
    max-width: 210px;
    line-height: 1.4;
  }

  .hero__copy {
    padding-right: 48px;
  }
}
</style>
