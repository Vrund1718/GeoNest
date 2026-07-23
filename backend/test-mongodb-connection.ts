import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env file!');
  process.exit(1);
}

console.log('🔍 Testing MongoDB connection...');
console.log(`📡 Connection string: ${MONGODB_URI.replace(/:.*@/, ':****@')}`); // Hide password

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB!');
    // Try to get database info
    const db = mongoose.connection.db!;
    console.log(`🗄️  Connected to database: ${db.databaseName}`);
    return db.admin().listDatabases();
  })
  .then((result) => {
    console.log('📋 Available databases:');
    result.databases.forEach((db) => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk || 0) / 1024 / 1024} MB)`);
    });
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed!');
    console.error('Error details:', error);
    if (error.name === 'MongooseServerSelectionError') {
      console.error('\n💡 Common fixes:');
      console.error('  1. Make sure your IP is whitelisted in MongoDB Atlas > Network Access');
      console.error('  2. Make sure your MongoDB Atlas cluster is in "Available" state');
      console.error('  3. Double-check your MONGODB_URI (username, password, cluster hostname)');
      console.error('  4. Try temporarily adding 0.0.0.0/0 to Network Access for testing');
    }
    process.exit(1);
  });
