/*
  Every expression starts with this token. Parsers check for it before running their regular
  expressions: compiling the collections scans tens of thousands of fully rendered snippets that
  contain no expression at all, and skipping those cuts compile time by about a third.
*/
export const ExpressionStartToken = '{{';

export class ExpressionRegexBuilder {
  private readonly parts = new Array<string>();

  public expectCharacters(characters: string) {
    return this.addRawRegex(
      characters
        .replaceAll('$', '\\$')
        .replaceAll('.', '\\.'),
    );
  }

  public expectOneOrMoreWhitespaces() {
    return this
      .addRawRegex('\\s+');
  }

  public captureOptionalPipeline() {
    return this
      .addRawRegex('((?:\\|\\s*\\b[a-zA-Z]+\\b\\s*)*)');
  }

  public captureUntilWhitespaceOrPipe() {
    return this
      .addRawRegex('([^|\\s]+)');
  }

  public captureMultilineAnythingExceptSurroundingWhitespaces() {
    return this
      .expectOptionalWhitespaces()
      .addRawRegex('([\\s\\S]*\\S)')
      .expectOptionalWhitespaces();
  }

  public expectExpressionStart() {
    return this
      .expectCharacters(ExpressionStartToken)
      .expectOptionalWhitespaces();
  }

  public expectExpressionEnd() {
    return this
      .expectOptionalWhitespaces()
      .expectCharacters('}}');
  }

  public expectOptionalWhitespaces() {
    return this
      .addRawRegex('\\s*');
  }

  public buildRegExp(): RegExp {
    return new RegExp(this.parts.join(''), 'g');
  }

  private addRawRegex(regex: string) {
    this.parts.push(regex);
    return this;
  }
}
