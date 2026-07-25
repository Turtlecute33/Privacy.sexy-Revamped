import { createApp } from 'vue';
import App from './components/App.vue';
import { ApplicationBootstrapper } from './bootstrapping/ApplicationBootstrapper';

const APP_SELECTOR = '#app';

/*
 * `scripts/prerender.mjs` bakes a fully rendered snapshot into index.html for crawlers.
 * Vue's mount clears that markup and rebuilds it, and because bootstrapping and the initial
 * render run in one uninterrupted task, the browser never gets a frame in between: the
 * snapshot sits in the DOM unpainted and first contentful paint waits for the client render.
 * Yielding once lets the browser paint the snapshot first, which is pixel-identical to what
 * the render produces, so the wait buys nothing visually.
 *
 * Only worth doing when a snapshot is actually present; on a plain client-rendered document
 * (dev server, non-prerendered builds) there is nothing to paint and the frame would be a
 * pure delay.
 */
function hasPrerenderedContent(): boolean {
  const container = document.querySelector(APP_SELECTOR);
  return (container?.childElementCount ?? 0) > 0;
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });
}

const app = createApp(App);

await new ApplicationBootstrapper()
  .bootstrap(app);

if (hasPrerenderedContent()) {
  await nextPaint();
}

app.mount(APP_SELECTOR);
