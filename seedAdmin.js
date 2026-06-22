import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import User from './src/models/user.model.js';
import { ROLES } from './src/config/constants.js';

const seedAdmin = async () => {
  try {
    // 1. Establish connection to database
    console.log('Connecting to database for seeding...');
    await connectDB();

    const adminEmail = 'admin@fakenewsdetection.com';
    const adminPassword = 'AdminSecurePass123!';

    // 2. Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`Admin account with email "${adminEmail}" already exists.`);
      console.log('Updating password and confirming admin role...');
      existingAdmin.password = adminPassword;
      existingAdmin.role = ROLES.ADMIN;
      await existingAdmin.save();
      console.log('Admin account updated successfully!');
    } else {
      console.log(`Creating new admin account with email "${adminEmail}"...`);
      await User.create({
        name: 'System Administrator',
        email: adminEmail,
        password: adminPassword,
        role: ROLES.ADMIN,
      });
      console.log('Admin account created successfully!');
    }

    console.log('\nSeed details:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('Please change the default password after your first login!');

    // 3. Gracefully disconnect
    await mongoose.disconnect();
    console.log('\nDisconnected from database. Seeding script complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error.message);
    process.exit(1);
  }
};

seedAdmin();
