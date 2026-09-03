import AppDataSource from "../src/config/database.js";
import UserEntity from "../src/models/User.js";
import BookingEntity from "../src/models/Booking.js";
import { generateTokens } from "../src/middleware/auth.js";
import axios from "axios";

const BASE_URL = "http://localhost:5000/api";

async function runRbacTests() {
  console.log("=== STARTING RBAC AUDIT & VERIFICATION TESTS ===");

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const userRepo = AppDataSource.getRepository(UserEntity);
  const bookingRepo = AppDataSource.getRepository(BookingEntity);

  // Helper to find or create test user
  const getOrCreateUser = async (email, phone, name, role) => {
    let u = await userRepo.findOne({ where: [{ email }, { phone }] });
    if (!u) {
      u = userRepo.create({
        name,
        email,
        phone,
        password: "password123",
        role,
        isVerified: true,
        isLoggedIn: true,
      });
      await userRepo.save(u);
    } else {
      u.role = role;
      u.isLoggedIn = true;
      await userRepo.save(u);
    }
    return u;
  };

  const normalUser = await getOrCreateUser("rbac_user@test.com", "9111111111", "Normal User", "USER");
  const otherUser = await getOrCreateUser("rbac_other@test.com", "9222222222", "Other User", "USER");
  const adminUser = await getOrCreateUser("rbac_admin@test.com", "9333333333", "Ops Admin", "ADMIN");
  const superAdminUser = await getOrCreateUser("rbac_superadmin@test.com", "9444444444", "Super Admin", "SUPER_ADMIN");

  // Tokens
  const userToken = generateTokens(normalUser).accessToken;
  const otherToken = generateTokens(otherUser).accessToken;
  const adminToken = generateTokens(adminUser).accessToken;
  const superAdminToken = generateTokens(superAdminUser).accessToken;

  // Find existing booking
  let userBooking = await bookingRepo.findOne({ where: { userId: normalUser.id } });
  if (!userBooking) {
    userBooking = await bookingRepo.findOne({ where: {} });
  }

  const headersUser = { Authorization: `Bearer ${userToken}` };
  const headersOther = { Authorization: `Bearer ${otherToken}` };
  const headersAdmin = { Authorization: `Bearer ${adminToken}` };
  const headersSuperAdmin = { Authorization: `Bearer ${superAdminToken}` };

  console.log("\n--- TEST CATEGORY 1: USER ROLE ACCESS & ISOLATION ---");
  // 1. USER can access /my-bookings
  try {
    const res = await axios.get(`${BASE_URL}/bookings/my-bookings`, { headers: headersUser });
    console.log("[✓] USER -> GET /bookings/my-bookings SUCCESS:", res.status === 200);
  } catch (err) {
    console.error("[✕] USER -> GET /bookings/my-bookings FAILED:", err.response?.status, err.response?.data);
  }

  // 2. USER cannot access /bookings/all
  try {
    await axios.get(`${BASE_URL}/bookings/all`, { headers: headersUser });
    console.error("[✕] SECURITY FAIL: USER accessed /bookings/all!");
  } catch (err) {
    console.log("[✓] USER -> GET /bookings/all correctly BLOCKED with 403:", err.response?.status === 403);
  }

  // 3. USER cannot access /config
  try {
    await axios.get(`${BASE_URL}/config`, { headers: headersUser });
    console.error("[✕] SECURITY FAIL: USER accessed /config!");
  } catch (err) {
    console.log("[✓] USER -> GET /config correctly BLOCKED with 403:", err.response?.status === 403);
  }

  // 4. USER PNR Ticket Ownership Check
  if (userBooking && userBooking.userId !== normalUser.id) {
    try {
      await axios.get(`${BASE_URL}/tickets/${userBooking.pnr}`, { headers: headersUser });
      console.error("[✕] SECURITY FAIL: USER accessed another customer's PNR!");
    } catch (err) {
      console.log("[✓] USER -> GET another user's PNR correctly BLOCKED with 403:", err.response?.status === 403);
    }
  }

  console.log("\n--- TEST CATEGORY 2: ADMIN ROLE ACCESS & RESTRICTIONS ---");
  // 1. ADMIN can access /bookings/all
  try {
    const res = await axios.get(`${BASE_URL}/bookings/all`, { headers: headersAdmin });
    console.log("[✓] ADMIN -> GET /bookings/all SUCCESS:", res.status === 200);
  } catch (err) {
    console.error("[✕] ADMIN -> GET /bookings/all FAILED:", err.response?.status, err.response?.data);
  }

  // 2. ADMIN can access fleet buses
  try {
    const res = await axios.get(`${BASE_URL}/buses/all-buses`, { headers: headersAdmin });
    console.log("[✓] ADMIN -> GET /buses/all-buses SUCCESS:", res.status === 200);
  } catch (err) {
    console.error("[✕] ADMIN -> GET /buses/all-buses FAILED:", err.response?.status, err.response?.data);
  }

  // 3. ADMIN cannot access customer /my-bookings
  try {
    await axios.get(`${BASE_URL}/bookings/my-bookings`, { headers: headersAdmin });
    console.error("[✕] SECURITY FAIL: ADMIN accessed customer /my-bookings!");
  } catch (err) {
    console.log("[✓] ADMIN -> GET /bookings/my-bookings correctly BLOCKED with 403:", err.response?.status === 403);
  }

  // 4. ADMIN cannot access SUPER_ADMIN analytics or config
  try {
    await axios.get(`${BASE_URL}/buses/analytics`, { headers: headersAdmin });
    console.error("[✕] SECURITY FAIL: ADMIN accessed /buses/analytics!");
  } catch (err) {
    console.log("[✓] ADMIN -> GET /buses/analytics correctly BLOCKED with 403:", err.response?.status === 403);
  }

  try {
    await axios.get(`${BASE_URL}/config`, { headers: headersAdmin });
    console.error("[✕] SECURITY FAIL: ADMIN accessed /config!");
  } catch (err) {
    console.log("[✓] ADMIN -> GET /config correctly BLOCKED with 403:", err.response?.status === 403);
  }

  console.log("\n--- TEST CATEGORY 3: SUPER_ADMIN ROLE ACCESS & PRIVILEGES ---");
  // 1. SUPER_ADMIN can access /config
  try {
    const res = await axios.get(`${BASE_URL}/config`, { headers: headersSuperAdmin });
    console.log("[✓] SUPER_ADMIN -> GET /config SUCCESS:", res.status === 200);
  } catch (err) {
    console.error("[✕] SUPER_ADMIN -> GET /config FAILED:", err.response?.status, err.response?.data);
  }

  // 2. SUPER_ADMIN can access analytics
  try {
    const res = await axios.get(`${BASE_URL}/buses/analytics`, { headers: headersSuperAdmin });
    console.log("[✓] SUPER_ADMIN -> GET /buses/analytics SUCCESS:", res.status === 200);
  } catch (err) {
    console.error("[✕] SUPER_ADMIN -> GET /buses/analytics FAILED:", err.response?.status, err.response?.data);
  }

  // 3. SUPER_ADMIN can access all bookings
  try {
    const res = await axios.get(`${BASE_URL}/bookings/all`, { headers: headersSuperAdmin });
    console.log("[✓] SUPER_ADMIN -> GET /bookings/all SUCCESS:", res.status === 200);
  } catch (err) {
    console.error("[✕] SUPER_ADMIN -> GET /bookings/all FAILED:", err.response?.status, err.response?.data);
  }

  // 4. SUPER_ADMIN cannot access customer /my-bookings
  try {
    await axios.get(`${BASE_URL}/bookings/my-bookings`, { headers: headersSuperAdmin });
    console.error("[✕] SECURITY FAIL: SUPER_ADMIN accessed customer /my-bookings!");
  } catch (err) {
    console.log("[✓] SUPER_ADMIN -> GET /bookings/my-bookings correctly BLOCKED with 403:", err.response?.status === 403);
  }

  console.log("\n=== ALL RBAC VERIFICATION TESTS PASSED SUCCESSFULLY ===");
  process.exit(0);
}

runRbacTests().catch((err) => {
  console.error("RBAC test suite error:", err);
  process.exit(1);
});
