#!/usr/bin/env node
// Run once after cloning: `node scripts/setup-hooks.mjs`
// Installs a pre-commit hook that runs the link checker before every commit.
import { writeFileSync, chmodSync, mkdirSync, existsSync } from 'node:fs';

const HOOK = `#!/bin/sh
npm run check:links
`;

if (!existsSync('.git')) {
  console.error('Not a git repository. Run this from the project root.');
  process.exit(1);
}

mkdirSync('.git/hooks', { recursive: true });
writeFileSync('.git/hooks/pre-commit', HOOK);
chmodSync('.git/hooks/pre-commit', '755');
console.log('✓ pre-commit hook installed (runs check:links before every commit)');
