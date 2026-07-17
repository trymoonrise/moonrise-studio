/**
 * Vercel serverless entry — re-exports the Express worker app.
 * Routes are rewritten to /api so /health, /generate, etc. keep working.
 */
module.exports = require("../worker/server.js");
