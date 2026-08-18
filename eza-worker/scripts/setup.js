#!/usr/bin/env node

/**
 * Vibe Lifestyle Cloudflare Worker Setup Script
 * This script helps set up environment variables and deploy the worker
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

async function setup() {
  console.log('🚀 Vibe Lifestyle Cloudflare Worker Setup');
  console.log('=====================================\n');

  console.log('This script will help you configure your Cloudflare Worker.\n');

  // Check if wrangler is installed
  try {
    execSync('wrangler --version', { stdio: 'ignore' });
    console.log('✅ Wrangler CLI is installed');
  } catch {
    console.log('❌ Wrangler CLI not found. Installing...');
    try {
      execSync('npm install -g wrangler', { stdio: 'inherit' });
      console.log('✅ Wrangler CLI installed successfully');
    } catch (error) {
      console.error('❌ Failed to install Wrangler CLI');
      process.exit(1);
    }
  }

  console.log('\n📋 Please provide the following information:');
  console.log('(You can also set these later using: wrangler secret put <NAME>)\n');

  // Get environment variables
  const secrets = {
    'DATABASE_URL': 'Neon PostgreSQL connection string',
    'BOT_TOKEN': 'Telegram Bot Token (from @BotFather)',
    'SUPERADMIN_ID': 'Your Telegram User ID (admin access)',
    'SESSION_SECRET': 'JWT session secret (32+ characters)',
    'CLOUDINARY_CLOUD_NAME': 'Cloudinary cloud name (optional)',
    'CLOUDINARY_API_KEY': 'Cloudinary API key (optional)',
    'CLOUDINARY_API_SECRET': 'Cloudinary API secret (optional)',
  };

  const shouldSetSecrets = await question('Do you want to set up secrets now? (y/n): ');
  
  if (shouldSetSecrets.toLowerCase() === 'y') {
    console.log('\n🔐 Setting up secrets...\n');
    
    for (const [key, description] of Object.entries(secrets)) {
      const required = !key.includes('CLOUDINARY');
      const prompt = `${required ? '* ' : '  '}${key} (${description}): `;
      
      let value = await question(prompt);
      
      if (required && !value.trim()) {
        console.log(`❌ ${key} is required!`);
        value = await question(prompt);
      }
      
      if (value.trim()) {
        try {
          execSync(`wrangler secret put ${key}`, { 
            input: value, 
            stdio: ['pipe', 'inherit', 'inherit'] 
          });
          console.log(`✅ ${key} set successfully`);
        } catch (error) {
          console.log(`❌ Failed to set ${key}`);
        }
      }
    }
  } else {
    console.log('\n📝 You can set secrets later using:');
    Object.keys(secrets).forEach(key => {
      console.log(`   wrangler secret put ${key}`);
    });
  }

  console.log('\n🚀 Ready to deploy!');
  const shouldDeploy = await question('Deploy to Cloudflare Workers now? (y/n): ');
  
  if (shouldDeploy.toLowerCase() === 'y') {
    const env = await question('Deploy to which environment? (development/staging/production) [development]: ');
    const targetEnv = env.trim() || 'development';
    
    try {
      if (targetEnv === 'development') {
        execSync('npm run deploy', { stdio: 'inherit' });
      } else {
        execSync(`npm run deploy:${targetEnv}`, { stdio: 'inherit' });
      }
      console.log('\n✅ Deployment completed!');
      
      // Show next steps
      console.log('\n🎉 Your Vibe Lifestyle API is now live!');
      console.log('\n📋 Next steps:');
      console.log('1. Test your API endpoints');
      console.log('2. Update your Telegram Mini App to use the new API');
      console.log('3. Monitor performance in Cloudflare dashboard');
      
    } catch (error) {
      console.log('\n❌ Deployment failed. Please check your configuration.');
    }
  }

  rl.close();
}

setup().catch(console.error);