import { describe, expect, it } from 'vitest';
import { ToBase64BatchLines } from '@/application/Application/Loader/Collections/Compiler/Executable/Script/Compiler/Expressions/Pipes/PipeDefinitions/ToBase64BatchLines';

describe('ToBase64BatchLines', () => {
  it('encodes Unicode text as UTF-8 Base64 batch output', () => {
    // 16 UTF-8 bytes, so the encoding is padded as well as multi-byte.
    const input = 'GDID é privacy.';
    const expectedBase64 = 'R0RJRCDDqSBwcml2YWN5Lg==';
    const sut = new ToBase64BatchLines();

    const actual = sut.apply(input);

    expect(actual).to.equal(`echo(${expectedBase64}`);
  });

  it('splits output into bounded batch lines', () => {
    const sut = new ToBase64BatchLines(4);

    const actual = sut.apply('abcdef');

    expect(actual).to.equal('echo(YWJj\necho(ZGVm');
  });

  it.each([0, -1, 1.5])('rejects invalid chunk length %s', (chunkLength) => {
    const act = () => new ToBase64BatchLines(chunkLength);

    expect(act).to.throw(`Chunk length must be a positive integer: ${chunkLength}`);
  });
});
