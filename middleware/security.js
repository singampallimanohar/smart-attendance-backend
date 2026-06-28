const helmet = require("helmet");

function security(app) {
  app.use(helmet());

  // Hide Express version
  app.disable("x-powered-by");
}

module.exports = security;