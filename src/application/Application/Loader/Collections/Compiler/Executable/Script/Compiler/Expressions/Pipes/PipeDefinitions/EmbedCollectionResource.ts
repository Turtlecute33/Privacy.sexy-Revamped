import DegdidPowerShell from '@/application/collections/resources/windows/degdid.ps1?raw';
import ManagePaintAiPowerShell from '@/application/collections/resources/windows/manage-paint-ai.ps1?raw';
import type { Pipe } from '../Pipe';

const CollectionResources: ReadonlyMap<string, string> = new Map([
  ['windows/degdid.ps1', DegdidPowerShell],
  ['windows/manage-paint-ai.ps1', ManagePaintAiPowerShell],
]);

export class EmbedCollectionResource implements Pipe {
  public readonly name: string = 'embedCollectionResource';

  public constructor(
    private readonly resources: ReadonlyMap<string, string> = CollectionResources,
  ) { }

  public apply(resourceName: string): string {
    const resource = this.resources.get(resourceName);
    if (resource === undefined) {
      throw new Error(`Unknown collection resource: "${resourceName}"`);
    }
    return resource;
  }
}
