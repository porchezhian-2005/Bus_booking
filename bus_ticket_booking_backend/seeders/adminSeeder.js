import bcrypt from "bcrypt";
import AppDataSource from "../src/config/database.js";
import UserEntity from "../src/models/User.js";

/**
 * Seed Default Admin User into PostgreSQL database if not present
 */
export const seedAdminUser = async () => {
  try {
    if (!AppDataSource.isInitialized) return;

    const userRepository = AppDataSource.getRepository(UserEntity);
    const adminEmail = process.env.ADMIN_EMAIL || "admin@busticket.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";

    const existingAdmin = await userRepository.findOne({ where: { email: adminEmail } });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const adminUser = userRepository.create({
        name: "Super Admin",
        email: adminEmail,
        phone: process.env.ADMIN_PHONE || "9000000000",
        password: hashedPassword,
        role: "SUPER_ADMIN",
        isVerified: true, // Admin is auto-verified
        isLoggedIn: false,
        welcomeEmailSent: true,
        referralCode: "REDBUS500",
      });

      await userRepository.save(adminUser);
      console.log(`✅ Default Super Admin user created with universal referral code (REDBUS500): (${adminEmail})`);
    } else {
      existingAdmin.role = "SUPER_ADMIN";
      existingAdmin.referralCode = "REDBUS500";
      await userRepository.save(existingAdmin);
    }
  } catch (error) {
    console.error("Error seeding default admin user:", error.message);
  }
};

export default seedAdminUser;
