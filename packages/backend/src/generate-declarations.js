// generate-declarations.js

const fs = require('fs');

// List of module names
const modules = [
  'crypto-js',
  // Add other module names here
];

// Generate declarations
const declarations = modules.map(module => `declare module '${module}';`).join('\n');

// Write to custom-modules.d.ts
fs.writeFileSync('types/custom-modules.d.ts', declarations, 'utf8');
