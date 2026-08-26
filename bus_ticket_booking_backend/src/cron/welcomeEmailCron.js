import cron from "node-cron";
import AppDataSource from "../config/database.js";
import UserEntity from "../models/User.js";
import EmailService from "../services/emailService.js";

const emailService = new EmailService();

/**
 * Welcome Email Cron Job - Runs every 1 minute ('* * * * *')
 */
export const initWelcomeEmailCron = () => {
  cron.schedule("* * * * *", async () => {
    try {
      if (!AppDataSource.isInitialized) return;

      const userRepository = AppDataSource.getRepository(UserEntity);
      const pendingUsers = await userRepository.find({
        where: {
          isVerified: true,
          welcomeEmailSent: false,
        },
        take: 20,
      });

      if (!pendingUsers || pendingUsers.length === 0) return;

      for (const user of pendingUsers) {
        try {
          await emailService.sendTemplateEmail(
            user.email,
            "Welcome to Bus Ticket Booking System! 🚌",
            "welcome",
            {
              name: user.name,
              referralCode: user.referralCode || "N/A",
            }
          );

          user.welcomeEmailSent = true;
          await userRepository.save(user);
        } catch (err) {
          console.error(`Failed to send welcome email to ${user.email}:`, err.message);
        }
      }
    } catch (error) {
      console.error("Error executing Welcome Email Cron Job:", error.message);
    }
  });
};

export default initWelcomeEmailCron;
