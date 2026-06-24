import dns from 'dns';
import app from './app.js';
import connectDB from './config/db.js';
import { config } from './config/env.js';

import "./telegramBot.js";

// Set DNS servers for MongoDB Atlas SRV resolution
if (config.dnsServers && config.dnsServers.length > 0) {
  try {
    dns.setServers(config.dnsServers);
    console.log(`DNS Resolver configured with: ${config.dnsServers.join(', ')}`);
  } catch (dnsErr) {
    console.error(`Error configuring DNS servers: ${dnsErr.message}`);
  }
}

// Handle uncaught exceptions globally
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

// Connect to MongoDB Database
connectDB();

const port = config.port || 5000;
const server = app.listen(port, () => {
  console.log(`Application running in ${config.env} mode on port ${port}`);
});

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down gracefully...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
