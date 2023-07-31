module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "standard",
  ],
  overrides: [
    {
      env: {
        node: true,
      },
      files: [
        ".eslintrc.{js,cjs}",
      ],
      parserOptions: {
        sourceType: "script",
      },
    },
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    indent: ["error", 2],
    quotes: ["error", "double"],
    semi: [
      "error",
      "always",
    ],
    "comma-dangle": ["error", {
      arrays: "always-multiline",
      objects: "always-multiline",
      imports: "always-multiline",
      exports: "always-multiline",
      functions: "never",
    }],
    "space-before-function-paren": ["error", "never"],
    "no-console": "off",
    "no-extend-native": [2, { exceptions: ["String"] }],
    "no-var": "error",
    "prefer-const": "error",
    "standard/no-callback-literal": "off",
    "object-curly-spacing": ["error", "always"],
    "array-bracket-spacing": ["error", "never"],
    "no-param-reassign": "error",
    "comma-spacing": ["error", { before: false, after: true }],
    "padding-line-between-statements": ["error",
      { blankLine: "always", prev: ["const", "let", "var", "import"], next: "*" },
      { blankLine: "any", prev: ["const", "let", "var", "import"], next: ["const", "let", "var", "import"] },
    ],
    "no-undef": "off",
    "no-useless-return": "off",
    "no-mixed-operators": "off",
    "no-unused-vars": "off",
    "array-callback-return": "off",
    camelcase: "off",
    "n/no-callback-literal": "off",
    "vue/require-prop-types": "off",
  },
};
