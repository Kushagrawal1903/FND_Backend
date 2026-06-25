import mongoose from 'mongoose';
import { config } from './env.js';

/**
 * Connects to MongoDB database using config URL
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoose.url);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Exit with failure
  }
};

export default connectDB;
