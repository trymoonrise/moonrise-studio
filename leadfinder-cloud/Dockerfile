# LeadFinder Cloud — Playwright Chromium on Render Cron
FROM mcr.microsoft.com/playwright:v1.51.0-jammy

WORKDIR /app

ENV NODE_ENV=production
ENV HEADLESS=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src
COPY seeds ./seeds

# Cron process must exit when done
CMD ["node", "src/cloudRun.js"]
