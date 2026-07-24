import type { MarkdownRenderer } from '@/presentation/components/Scripts/View/Content/Markdown/MarkdownRenderer';

type RenderFunction = MarkdownRenderer['render'];

export function renderMarkdownUsingRenderer(
  MarkdownRendererClass: { new(): MarkdownRenderer ; },
  ...renderArgs: Parameters<RenderFunction>
): ReturnType<RenderFunction> {
  const rendererInstance = new MarkdownRendererClass();
  return rendererInstance.render(...renderArgs);
}
