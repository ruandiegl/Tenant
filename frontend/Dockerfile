FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_BASE_URL
ARG VITE_SOCKET_URL
ARG VITE_DEMO_TENANT_SLUG
ARG VITE_DEMO_EMAIL
ARG VITE_DEMO_PASSWORD
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_DEMO_TENANT_SLUG=$VITE_DEMO_TENANT_SLUG
ENV VITE_DEMO_EMAIL=$VITE_DEMO_EMAIL
ENV VITE_DEMO_PASSWORD=$VITE_DEMO_PASSWORD
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4173
CMD ["sh", "-c", "npx serve --single --listen tcp://0.0.0.0:${PORT:-4173} dist"]
