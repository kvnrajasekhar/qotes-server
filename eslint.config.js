const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  // 1. Global Ignores (Replaces --ignore-pattern and .eslintignore)
  {
    ignores: ["dist/**", "build/**", "node_modules/**"],
  },

  // 2. Core JavaScript Recommended Rules
  js.configs.recommended,

  // 3. Environment and Custom Rules Config
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs", // Matches your package.json type
      globals: {
        ...globals.node, // Enables Node.js global variables (require, module, process)
        ...globals.jest, // Optional: Enables Jest testing globals if you use them
      },
    },
    rules: {
      // You can add custom rule overrides here if needed, for example:
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },
];
