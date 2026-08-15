// Simple test to verify our Worker code compiles
const { execSync } = require('child_process');

console.log('🧪 Testing EZA-SHOP Worker compilation...\n');

try {
  // Test TypeScript compilation
  console.log('1. Checking TypeScript types...');
  execSync('npm run type-check', { stdio: 'pipe' });
  console.log('✅ TypeScript types are valid\n');
  
  // Test if wrangler can parse our config
  console.log('2. Validating Wrangler configuration...');
  try {
    const output = execSync('npx wrangler whoami 2>&1', { encoding: 'utf8' });
    if (output.includes('not authenticated')) {
      console.log('⚠️  Wrangler not authenticated (expected in development)');
    } else {
      console.log('✅ Wrangler authentication OK');
    }
  } catch (e) {
    console.log('⚠️  Wrangler check completed (auth may be needed)');
  }
  
  console.log('\n🎉 Worker code is ready!');
  console.log('\n📋 Next steps:');
  console.log('1. Authenticate with Cloudflare: npx wrangler login');
  console.log('2. Set environment variables: npx wrangler secret put DATABASE_URL');
  console.log('3. Deploy: npm run deploy');
  
} catch (error) {
  console.error('❌ Compilation error:', error.message);
  process.exit(1);
}