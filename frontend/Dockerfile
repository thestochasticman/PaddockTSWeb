# Build
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./

# Inject public runtime config at build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_BASEPATH
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_BASEPATH=$NEXT_BASEPATH

# Optional: if you add in next.config.js -> module.exports = { output: 'standalone' }
# you can later copy only .next/standalone
RUN npm run build

# Run
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "run", "start"]
