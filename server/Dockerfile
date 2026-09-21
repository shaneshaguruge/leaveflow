# LeaveFlow API image. Config (DATABASE_URL, JWT_SECRET, PORT) comes from the environment.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

# Dependency layer — cached until package files change
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Source layer — changes often, so it comes last
COPY . .

# Run as the image's unprivileged user rather than root
USER node
EXPOSE 4000
CMD ["node", "src/server.js"]
