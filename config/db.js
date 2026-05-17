const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = (async () => {
      const client = new MongoClient(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 60000,
        maxIdleTimeMS: 10000,
      });

      await client.connect();

      try {
        const { attachDatabasePool } = require('@vercel/functions/db-connections');
        if (client.topology) {
          if (!client.topology.options) client.topology.options = {};
          client.topology.options.maxIdleTimeMS = 10000;
          attachDatabasePool(client.topology);
        }
      } catch (e) {
        console.warn('Pool attach skipped:', e.message);
      }

      mongoose.connections[0].setClient(client);
      await mongoose.connections[0].asPromise();

      return mongoose;
    })();
  }
  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
};

module.exports = connectDB;
