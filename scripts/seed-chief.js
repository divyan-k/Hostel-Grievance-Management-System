const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hostel_mvp";
const chiefName = process.env.SEED_CHIEF_NAME || "System Chief";
const chiefEmail = process.env.SEED_CHIEF_EMAIL;
const chiefPassword = process.env.SEED_CHIEF_PASSWORD;

async function run() {
  if (!chiefEmail || !chiefPassword) {
    throw new Error("SEED_CHIEF_EMAIL and SEED_CHIEF_PASSWORD are required");
  }

  await mongoose.connect(MONGODB_URI);

  const existingUser = await User.findOne({ email: chiefEmail.toLowerCase() });
  if (existingUser) {
    console.log(`Chief user already exists: ${existingUser.email}`);
    await mongoose.disconnect();
    return;
  }

  const password = await bcrypt.hash(chiefPassword, 10);
  const user = await User.create({
    name: chiefName,
    email: chiefEmail,
    password,
    role: "chief",
    room: "HQ"
  });

  console.log(`Created chief user: ${user.email}`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Chief seed failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch (_error) {
    // Ignore disconnect errors on failed connection attempts.
  }
  process.exit(1);
});
