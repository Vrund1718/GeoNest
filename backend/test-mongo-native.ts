import dns from 'dns';
import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

// Use Google's public DNS servers instead of system DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const uri = process.env.MONGODB_URI as string;
if (!uri) {
  console.error('❌ MONGODB_URI not found in .env!');
  process.exit(1);
}

console.log('🔍 Testing MongoDB connection with native driver...');
console.log('📡 URI:', uri.replace(/:.*@/, ':****@'));

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  serverSelectionTimeoutMS: 10000,
});

async function run() {
  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    console.log('✅ Pinged your deployment! Successfully connected to MongoDB!');
    const dbList = await client.db().admin().listDatabases();
    console.log('📊 Available databases:', dbList.databases.map(db => db.name));
  } finally {
    await client.close();
  }
}

run().catch(console.error);
