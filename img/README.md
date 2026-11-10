# img

Images used by the repository and its documentation.

## logo.svg

[`logo.svg`](./logo.svg) serves as the primary logo from which all other icons and images are derived.
Only modify this file manually.
After making changes, execute `npm run icons:build` to regenerate logo files in various formats.

## readme

[`readme/`](./readme/) holds the images shown in the repository README: the app icon, a light and a
dark variant of each screenshot, and `social-preview.png`, the card GitHub shows when the repository
link is shared. Regenerate them after UI changes with `npm run build && npm run generate:readme-images`
(see [`generate-readme-images.mjs`](../scripts/generate-readme-images.mjs)), then upload the new
social preview under the repository's *Settings > General > Social preview*.
