import { describe, expect, it } from 'vitest';
import packageJson from '@/../package.json' with { type: 'json' };

/*
  The two display faces in `_fonts.scss` ('Slabo 27px' for the `.brand` <h1>, 'Yesteryear' for the
  `.slogan`) are ASCII subsets: every codepoint outside U+0020-007E was stripped to get the
  preloaded Slabo file from 19,068 B down to 10,300 B. Those two elements render nothing but
  `projectDetails.name` and `projectDetails.slogan`, which come straight from package.json.

  So the subset is only safe for as long as those two strings stay ASCII. Rename the project to
  something with a "é" or an em dash and the character is outside the face's `unicode-range`, the
  wordmark silently drops to the serif/cursive fallback for that one glyph, and nothing else in the
  build complains. This test is the thing that complains.

  The literal "Revamped" in TheHeader.vue is covered by the same subset but is hard-coded ASCII in
  the template, so it cannot drift the way these two can.
*/
describe('display font subset', () => {
  const printableAsciiOnly = /^[ -~]+$/;
  const subsettedStrings: Readonly<Record<string, string>> = {
    name: packageJson.name,
    slogan: packageJson.slogan,
  };

  Object.entries(subsettedStrings).forEach(([propertyName, value]) => {
    it(`renders package.json \`${propertyName}\` with printable ASCII only`, () => {
      expect(value).toMatch(printableAsciiOnly);
    });
  });
});
