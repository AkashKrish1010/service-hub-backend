const mongoose = require('mongoose');

let mongod = null;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/service_hub', {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[Database] Local MongoDB not reachable (${error.message}).`);
    console.log('[Database] Starting embedded in-memory MongoDB instance...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`[Database] In-Memory MongoDB Connected at ${uri}`);

      // Auto seed in-memory DB with demo accounts & service providers
      const seedData = require('../seed');
      if (typeof seedData === 'function') {
        console.log('[Database] Auto-seeding in-memory database with demo records...');
        await seedData(true);
      }
    } catch (memErr) {
      console.error(`[Database] Failed to start in-memory MongoDB: ${memErr.message}`);
    }
  }
};

module.exports = connectDB;
