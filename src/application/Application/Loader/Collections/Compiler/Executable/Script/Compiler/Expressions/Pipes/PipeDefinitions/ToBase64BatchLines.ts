import type { Pipe } from '../Pipe';

const Base64Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const DefaultChunkLength = 1024;

export class ToBase64BatchLines implements Pipe {
  public readonly name: string = 'toBaseSixtyFourBatchLines';

  public constructor(private readonly chunkLength: number = DefaultChunkLength) {
    if (!Number.isInteger(chunkLength) || chunkLength <= 0) {
      throw new Error(`Chunk length must be a positive integer: ${chunkLength}`);
    }
  }

  public apply(input: string): string {
    const encoded = encodeUtf8AsBase64(input);
    const chunks = new Array<string>();
    for (let offset = 0; offset < encoded.length; offset += this.chunkLength) {
      chunks.push(encoded.slice(offset, offset + this.chunkLength));
    }
    return chunks.map((chunk) => `echo(${chunk}`).join('\n');
  }
}

function encodeUtf8AsBase64(input: string): string {
  return encodeBytesAsBase64(new TextEncoder().encode(input));
}

function encodeBytesAsBase64(bytes: Uint8Array): string {
  let result = '';
  for (let offset = 0; offset < bytes.length; offset += 3) {
    const first = bytes[offset];
    const hasSecond = offset + 1 < bytes.length;
    const hasThird = offset + 2 < bytes.length;
    const second = hasSecond ? bytes[offset + 1] : 0;
    const third = hasThird ? bytes[offset + 2] : 0;
    const combined = first * 65536 + second * 256 + third;
    result += Base64Alphabet[Math.floor(combined / 262144) % 64];
    result += Base64Alphabet[Math.floor(combined / 4096) % 64];
    result += hasSecond ? Base64Alphabet[Math.floor(combined / 64) % 64] : '=';
    result += hasThird ? Base64Alphabet[combined % 64] : '=';
  }
  return result;
}
