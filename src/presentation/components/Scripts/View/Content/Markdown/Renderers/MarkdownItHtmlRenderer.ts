import MarkdownIt from 'markdown-it';
import type { MarkdownRenderer } from '../MarkdownRenderer';
import type { RenderRule } from 'markdown-it/lib/renderer.mjs'; // eslint-disable-line import/extensions

export class MarkdownItHtmlRenderer implements MarkdownRenderer {
  public render(markdownContent: string): string {
    return sharedMarkdownParser.render(markdownContent);
  }
}

/*
  The parser is built once for the whole module instead of once per `render()` call.
  Opening the first Windows category mounts 161 markdown texts (script names, script docs and
  category docs); constructing and configuring a parser for each of them measured 53.8 ms cold /
  28.7 ms warm, against 21.0 ms / 4.1 ms when the instance is shared. Sharing is safe because
  `MarkdownIt.prototype.render` defaults its `env` sandbox to a fresh `{}` on every call, so no
  state leaks between renders.

  Construction and link configuration must stay together in this single initialization: calling
  `configureLinksToOpenInNewTab` again on an already-configured parser would wrap the previous
  `link_open` rule inside a new one, growing an unbounded chain of wrappers.
*/
const sharedMarkdownParser = createMarkdownParser();

function createMarkdownParser(): MarkdownIt {
  const markdownParser = new MarkdownIt({
    html: true, // Enable HTML tags in source to allow other custom rendering logic.
    linkify: false, // Disables auto-linking; handled manually for custom formatting.
    breaks: false, // Disables conversion of single newlines (`\n`) to HTML breaks (`<br>`).
  });
  configureLinksToOpenInNewTab(markdownParser);
  return markdownParser;
}

function configureLinksToOpenInNewTab(markdownParser: MarkdownIt): void {
  // https://github.com/markdown-it/markdown-it/blob/14.0.0/docs/architecture.md#renderer
  const defaultLinkRenderer = getDefaultRenderer(markdownParser, 'link_open');
  markdownParser.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const currentToken = tokens[index];
    Object.entries(AnchorAttributesForExternalLinks).forEach(([attribute, value]) => {
      currentToken.attrSet(attribute, value);
    });
    return defaultLinkRenderer(tokens, index, options, env, self);
  };
}

function getDefaultRenderer(md: MarkdownIt, ruleName: string): RenderRule {
  const ruleRenderer = md.renderer.rules[ruleName];
  const renderTokenAsDefault: RenderRule = (tokens, idx, options, _env, self) => {
    return self.renderToken(tokens, idx, options);
  };
  return ruleRenderer || renderTokenAsDefault;
}

const AnchorAttributesForExternalLinks: Record<string, string> = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const;
