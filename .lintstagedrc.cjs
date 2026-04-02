module.exports = {
  "apps/api/**/*.{js,ts}": [
    "eslint --fix --config apps/api/eslint.config.mjs",
    "prettier --write"
  ],
  "apps/web/**/*.{js,ts,tsx,jsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{js,ts,mts,mjs}": (filenames) => {
    // filter out files inside apps/
    const rootFiles = filenames.filter(f => !/\/apps\//.test(f.replace(/\\/g, '/')));
    if (rootFiles.length === 0) return [];
    return [
      `eslint --fix ${rootFiles.map(f => `"${f}"`).join(' ')}`,
      `prettier --write ${rootFiles.map(f => `"${f}"`).join(' ')}`
    ];
  },
  "*.{json,md,scss,html}": [
    "prettier --write"
  ]
}
