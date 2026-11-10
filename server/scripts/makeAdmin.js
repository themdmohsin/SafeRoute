// Usage: npm run make-admin -- someone@example.com
// Promotes an existing account to admin. The user must log out and back in afterwards.
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run make-admin -- <email>');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is missing from server/.env');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
try {
  const user = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true });
  if (!user) {
    console.error(`No account with email ${email}. Register it in the app first.`);
    process.exitCode = 1;
  } else {
    console.log(`${user.email} is now an admin. Log out and log in again, then open Profile > Open admin console.`);
  }
} finally {
  await mongoose.disconnect();
}
