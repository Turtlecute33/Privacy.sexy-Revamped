import { describe, expect, it } from 'vitest';
import { EmbedCollectionResource } from '@/application/Application/Loader/Collections/Compiler/Executable/Script/Compiler/Expressions/Pipes/PipeDefinitions/EmbedCollectionResource';

describe('EmbedCollectionResource', () => {
  it('returns the registered resource', () => {
    const resourceName = 'resource/name';
    const expected = 'resource contents';
    const sut = new EmbedCollectionResource(new Map([[resourceName, expected]]));

    const actual = sut.apply(resourceName);

    expect(actual).to.equal(expected);
  });

  it('throws for an unknown resource', () => {
    const resourceName = 'missing/resource';
    const sut = new EmbedCollectionResource(new Map());

    const act = () => sut.apply(resourceName);

    expect(act).to.throw(`Unknown collection resource: "${resourceName}"`);
  });
});
