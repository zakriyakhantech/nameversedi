import fs from 'node:fs';
import path from 'node:path';

console.log('Testing if Node.js scripts can run...');

// Test 1: Check if we can read a file
const testPath = path.join(process.cwd(), 'package.json');
try {
  const data = fs.readFileSync(testPath, 'utf8');
  console.log('✓ Can read package.json');
} catch (err) {
  console.log('✗ Cannot read package.json:', err.message);
}

// Test 2: Check if public/names directory exists
const namesDir = path.join(process.cwd(), 'public', 'names');
try {
  const exists = fs.existsSync(namesDir);
  console.log(`✓ public/names exists: ${exists}`);
} catch (err) {
  console.log('✗ Cannot check public/names:', err.message);
}

// Test 3: Try to run generate-manifest.mjs directly
const manifestScript = path.join(process.cwd(), 'scripts', 'generate-manifest.mjs');
try {
  const script = require(manifestScript);
  console.log('✓ Can require generate-manifest.mjs');
} catch (err) {
  console.log('✗ Cannot require generate-manifest.mjs:', err.message);
}

console.log('Basic environment test completed.');