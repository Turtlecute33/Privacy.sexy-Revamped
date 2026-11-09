# Build
# Pinned to the major version CI and the deploy use, so the image builds the same as production.
FROM node:22-alpine AS build-stage
# The build needs neither Puppeteer's nor Cypress's browser, only the test and prerender steps do.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    CYPRESS_INSTALL_BINARY=0
WORKDIR /app
COPY . .
RUN npm run install-deps -- --ci
RUN npm run build \
    && npm run check:verify-build-artifacts -- --web
RUN mkdir /dist \
    && dist_directory=$(node 'scripts/print-dist-dir.js' --web) \
    && cp -a "${dist_directory}/." '/dist'

# Production stage
FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
