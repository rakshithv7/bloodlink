require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // Check if super admin already exists
  const existing = await db.collection('users').findOne({ role: 'SUPER_ADMIN' });
  if (existing) {
    console.log('SUPER_ADMIN already exists:', existing.email);
    console.log('Deleting and recreating with fresh password...');
    await db.collection('users').deleteOne({ role: 'SUPER_ADMIN' });
  }

  // Hash password ONCE — insert directly to bypass mongoose pre-save hook
  const password = await bcrypt.hash('Admin@12345', 12);

  await db.collection('users').insertOne({
    name: 'Super Admin',
    email: 'superadmin@bloodlink.com',
    password,
    role: 'SUPER_ADMIN',
    approvalStatus: 'NA',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('✅ SUPER_ADMIN created successfully!');
  console.log('Email:    superadmin@bloodlink.com');
  console.log('Password: Admin@12345');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed error:', err.message);
  process.exit(1);
});