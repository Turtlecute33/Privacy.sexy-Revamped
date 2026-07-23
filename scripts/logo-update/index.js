/**
 * Description:
 *  This script updates the logo images across the project based on the primary
 *  logo file ('img/logo.svg' file).
 *
 *  It handles the creation and update of various icon sizes for different purposes,
 *  including web favicons from a single source
 *  SVG logo file.
 *
 * Usage:
 *    node ./scripts/logo-update
 *
 * Notes:
 *    ImageMagick must be installed and accessible in the system's PATH
 */

import { resolve, join, dirname } from 'node:path';
import { stat } from 'node:fs/promises';
import { URL, fileURLToPath } from 'node:url';
import { optimizeSvg } from './svg-optimizer.js'; // eslint-disable-line import/extensions
import { runCommand } from './run-command.js'; // eslint-disable-line import/extensions

class ImageAssetPaths {
  constructor(currentScriptDirectory) {
    const projectRoot = resolve(currentScriptDirectory, '../../');
    this.sourceImage = join(projectRoot, 'img/logo.svg');
    this.publicDirectory = join(projectRoot, 'src/presentation/public');
  }

  get webFaviconFile() {
    return join(this.publicDirectory, 'favicon.ico');
  }

  get appLogoSvgFile() {
    return join(this.publicDirectory, 'icon.svg');
  }

  toString() {
    return `Source image: ${this.sourceImage}`
      + `\nPublic directory: ${this.publicDirectory}`
      + `\n\t App logo SVG file: ${this.appLogoSvgFile}`;
  }
}

async function main() {
  const paths = new ImageAssetPaths(getCurrentScriptDirectory());
  console.log(`Paths:\n\t${paths.toString().replaceAll('\n', '\n\t')}`);
  const convertCommand = await findAvailableImageMagickCommand();
  await generateWebFavicon(
    paths.sourceImage,
    paths.webFaviconFile,
    convertCommand,
  );
  await generateAppLogoSvg(
    paths.sourceImage,
    paths.appLogoSvgFile,
    convertCommand,
  );
  console.log('🎉 (Re)created icons successfully.');
}

async function generateWebFavicon(sourceImage, faviconFilePath, convertCommand) {
  console.log(`Updating favicon at ${faviconFilePath}.`);
  await ensureFileExists(sourceImage);
  await ensureParentFolderExists(faviconFilePath);
  await convertFromSvgToIco(
    convertCommand,
    sourceImage,
    faviconFilePath,
    [16, 24, 32, 48, 64, 128, 256],
  );
}

async function generateAppLogoSvg(sourceImage, targetSvgFile) {
  await ensureFileExists(sourceImage);
  await ensureParentFolderExists(targetSvgFile);
  // Use ImageMagick to do basic SVG processing
  // This won't do extensive optimization but can clean up some aspects
  await optimizeSvg(
    sourceImage,
    targetSvgFile,
  );
  console.log(`Created optimized SVG at ${targetSvgFile}`);
}

async function ensureFileExists(filePath) {
  const path = await stat(filePath);
  if (!path.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }
}

async function ensureFolderExists(folderPath) {
  if (!folderPath) {
    throw new Error('Path is missing');
  }
  const path = await stat(folderPath);
  if (!path.isDirectory()) {
    throw new Error(`Not a directory: ${folderPath}`);
  }
}

function ensureParentFolderExists(filePath) {
  return ensureFolderExists(dirname(filePath));
}

const BaseImageMagickConvertArguments = Object.freeze([
  '-background none', // Transparent, so they do not get filled with white.
  '-strip', // Strip metadata.
  '-gravity Center', // Center the image when there's empty space
]);

async function convertFromSvgToIco(
  convertCommand,
  inputFile,
  outputFile,
  sizes,
) {
  await runCommand(
    convertCommand,
    ...BaseImageMagickConvertArguments,
    `-density ${Math.max(...sizes).toString()}`, // High enough for sharpness
    `-define icon:auto-resize=${sizes.map((s) => s.toString()).join(',')}`, // Automatically store multiple sizes in an ico image
    '-compress None',
    inputFile,
    outputFile,
  );
}

function getCurrentScriptDirectory() {
  return fileURLToPath(new URL('.', import.meta.url));
}

async function findAvailableImageMagickCommand() {
  // Reference: https://web.archive.org/web/20240502120041/https://imagemagick.org/script/convert.php
  const potentialBaseCommands = [
    'convert', // Legacy command, usually available on Linux/macOS installations
    'magick convert', // Newer command, available on Windows installations
  ];
  for (const baseCommand of potentialBaseCommands) {
    const testCommand = `${baseCommand} -version`;
    try {
      await runCommand(testCommand); // eslint-disable-line no-await-in-loop
      console.log(`Confirmed: ImageMagick command '${baseCommand}' is available and operational.`);
      return baseCommand;
    } catch (err) {
      console.log(`Error: The command '${baseCommand}' is not found or failed to execute. Detailed error: ${err.message}"`);
    }
  }
  throw new Error([
    'Unable to locate any operational ImageMagick command.',
    `Attempted commands were: ${potentialBaseCommands.join(', ')}.`,
    'Please ensure ImageMagick is correctly installed and accessible.',
  ].join('\n'));
}

await main();
