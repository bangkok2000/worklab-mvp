/**
 * Script to clear all vectors from Pinecone
 * 
 * Usage:
 *   node scripts/clear-pinecone.js [YOUR_SESSION_TOKEN]
 * 
 * Or set PINECONE_CLEAR_TOKEN environment variable:
 *   PINECONE_CLEAR_TOKEN=your_token node scripts/clear-pinecone.js
 * 
 * To get your session token:
 *   1. Open your browser's developer console
 *   2. Go to Application > Local Storage
 *   3. Find the Supabase auth token or use your session access_token
 */

const token = process.argv[2] || process.env.PINECONE_CLEAR_TOKEN;
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

if (!token) {
  console.error('Error: No authentication token provided.');
  console.error('\nUsage:');
  console.error('  node scripts/clear-pinecone.js YOUR_SESSION_TOKEN');
  console.error('\nOr set environment variable:');
  console.error('  PINECONE_CLEAR_TOKEN=your_token node scripts/clear-pinecone.js');
  process.exit(1);
}

async function clearPinecone() {
  try {
    console.log('🚀 Starting Pinecone clear operation...');
    console.log(`📡 Calling: ${apiUrl}/api/pinecone/clear`);
    
    const response = await fetch(`${apiUrl}/api/pinecone/clear`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error:', data.error || data.message || 'Unknown error');
      if (data.details) {
        console.error('Details:', data.details);
      }
      process.exit(1);
    }

    console.log('✅ Success!');
    console.log(`📊 Deleted ${data.deletedCount || 0} vectors`);
    console.log(`📝 Message: ${data.message}`);
    if (data.note) {
      console.log(`⚠️  Note: ${data.note}`);
    }
    console.log(`🕐 Timestamp: ${data.timestamp}`);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

clearPinecone();
