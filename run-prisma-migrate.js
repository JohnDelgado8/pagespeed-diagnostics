// run-prisma-migrate.js
const { config } = require('dotenv');
const { execSync } = require('child_process');

// Explicitly load .env.local from the current directory
const envConfig = config({ path: '.env.local', debug: true }); // Added debug: true

if (envConfig.error) {
  console.error('Error loading .env.local:', envConfig.error);
} else {
  console.log('Parsed .env.local content:', envConfig.parsed);
}

console.log('---');
console.log('Attempting to run Prisma migrate...');
console.log('DATABASE_URL from process.env before Prisma:', process.env.DATABASE_URL);
console.log('---');

try {
  // This command assumes 'npx' is in your PATH and can find 'prisma'
  execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
  console.log('Prisma migrate command executed (or attempted).');
} catch (error) {
  console.error('Error received from Prisma migrate command execution:', error.message);
}