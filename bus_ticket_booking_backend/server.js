import app from "./src/app.js";
import { connectDB } from "./src/config/database.js";
import { seedAdminUser } from "./seeders/adminSeeder.js";
import { seedBusesAndTrips } from "./seeders/busSeeder.js";
import { initWelcomeEmailCron } from "./src/cron/welcomeEmailCron.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // 1. Connect to PostgreSQL via TypeORM
  await connectDB();

  // 2. Seed Admin User & Default Buses/Trips with Email Change OTP Verification
  await seedAdminUser();
  await seedBusesAndTrips();

  // 3. Initialize Cron Jobs
  initWelcomeEmailCron();

  // 4. Start Listening on HTTP Port
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
};

startServer();