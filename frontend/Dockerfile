# # Build
# FROM node:22-alpine AS build
# WORKDIR /app
# COPY frontend/package*.json ./
# RUN npm ci
# COPY frontend/ ./

# # Inject public runtime config at build time
# ARG NEXT_PUBLIC_API_URL
# ARG NEXT_BASEPATH
# ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# ENV NEXT_BASEPATH=$NEXT_BASEPATH

# # Optional: if you add in next.config.js -> module.exports = { output: 'standalone' }
# # you can later copy only .next/standalone
# RUN npm run build

# # Run
# FROM node:22-alpine AS runner
# WORKDIR /app
# ENV NODE_ENV=production
# COPY --from=build /app ./
# EXPOSE 3000
# CMD ["npm", "run", "start"]

# FROM node:22-alpine

# WORKDIR /app/frontend

# # Install system dependencies if needed (e.g., sharp dependencies)
# RUN apk add --no-cache libc6-compat

# # Copy package files and install dependencies
# # We do this in the Dockerfile so the container HAS node_modules 
# # even before the volume mount kicks in.
# COPY frontend/package*.json ./
# RUN npm install

# # In Dev, we don't COPY the rest of the code here because 
# # the docker-compose volume will mount it live.

# EXPOSE 3000

# # Default to dev mode
# CMD ["npm", "run", "dev"]


FROM node:22-slim

# Set the working directory
WORKDIR /app/frontend

ARG NEXT_PUBLIC_API_URL
ARG NEXT_BASEPATH
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_BASEPATH=$NEXT_BASEPATH

# Install procps (used by many Node.js tools for process management)
# and clean up to keep the image small
RUN apt-get update && apt-get install -y procps && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY frontend/package*.json ./

# Install dependencies 
# (Since architecture matches host, this will be compatible)
RUN npm install

RUN npm install -D tailwindcss postcss autoprefixer
# Expose the port
EXPOSE 3000

# Start in dev mode
CMD ["npm", "run", "dev"]