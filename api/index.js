// Vercel serverless entry: re-exports the shared Express application.
// Routed to by vercel.json for all /api/* requests.
const app = require('../server');

module.exports = app;
