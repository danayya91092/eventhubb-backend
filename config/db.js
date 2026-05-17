const mongoose = require('mongoose');

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 60000,
      maxIdleTimeMS: 10000,
    }).then(m => m);
  }
  try {
    cached.conn = await cached.promise;

    try {
      const { attachDatabasePool } = require('@vercel/functions/db-connections');
      const client = mongoose.connection.getClient();
      if (client) {
        const topology = client.topology;
        if (topology && typeof topology.on === 'function') {
          if (!topology.options) topology.options = {};
          if (!('maxIdleTimeMS' in topology.options)) topology.options.maxIdleTimeMS = 10000;
          attachDatabasePool(topology);
        }
      }
    } catch (poolError) {
      console.warn('Vercel pool attachment skipped:', poolError.message);
    }

    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
};

module.exports = connectDB;
