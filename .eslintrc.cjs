module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint", "deprecation"],
  rules: {
    indent: [
      "error",
      2,
      {
        SwitchCase: 1,
        // Note: offsetTernaryExpressions is broken, see eslint/issues/14058
        offsetTernaryExpressions: true,
      },
    ],
    "linebreak-style": ["error", "unix"],
    quotes: ["error", "double"],
    semi: ["error", "always"],
    "deprecation/deprecation": "warn",
  },
  overrides: [
    {
      extends: ["plugin:@typescript-eslint/disable-type-checked"],
      files: ["webpack.*.js"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
  ],
};
