#!/usr/bin/env node

/**
 * Database setup script for AECC Election
 * Creates the database and runs migrations
 */

const mysql = require('mysql2/promise');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');

async function setupDatabase() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  AECC Election - Database Setup                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // Read .env.local
    if (!fs.existsSync(envPath)) {
      console.error('❌ .env.local not found');
      process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const dbUrlMatch = envContent.match(/DATABASE_URL="mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)"/);
    
    if (!dbUrlMatch) {
      console.error('❌ Invalid DATABASE_URL format in .env.local');
      process.exit(1);
    }

    const [, user, password, host, port, dbName] = dbUrlMatch;

    console.log('▶ Connecting to MySQL...');
    
    const connection = await mysql.createConnection({
      host,
      user,
      password: password || undefined,
      port: parseInt(port),
    });

    console.log('✓ Connected to MySQL\n');

    // Create database
    console.log(`▶ Creating database '${dbName}' if not exists...`);
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✓ Database '${dbName}' ready\n`);

    await connection.end();

    // Run Prisma migrations
    console.log('▶ Running Prisma migrations...\n');
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✓ Database setup completed successfully!                     ║');
    console.log('║                                                               ║');
    console.log('║  Next: npm run dev                                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();
