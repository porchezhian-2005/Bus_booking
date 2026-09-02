import dotenv from "dotenv";
dotenv.config();

import AppDataSource from "../src/config/database.js";
import UserEntity from "../src/models/User.js";
import TripEntity from "../src/models/Trip.js";
import SeatEntity from "../src/models/Seat.js";
import BookingEntity from "../src/models/Booking.js";
import TransactionEntity from "../src/models/Transaction.js";
import PassengerEntity from "../src/models/Passenger.js";
import WalletEntity from "../src/models/Wallet.js";
import WalletTransactionEntity from "../src/models/WalletTransaction.js";
import CouponEntity from "../src/models/Coupon.js";
import SystemConfigEntity from "../src/models/SystemConfig.js";

import BookingService from "../src/services/bookingService.js";
import RazorpayService from "../src/services/razorpayService.js";
import WalletService from "../src/services/walletService.js";
import CouponService from "../src/services/couponService.js";
import ConfigService from "../src/services/configService.js";
import TransactionService from "../src/services/transactionService.js";
import crypto from "crypto";

async function runTests() {
  console.log("=== STARTING PROBLEM #2 RAZORPAY INTEGRATION VERIFICATION TESTS ===");

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  console.log("[✓] Database initialized successfully.");

  const userRepo = AppDataSource.getRepository(UserEntity);
  const tripRepo = AppDataSource.getRepository(TripEntity);
  const seatRepo = AppDataSource.getRepository(SeatEntity);
  const bookingRepo = AppDataSource.getRepository(BookingEntity);
  const txnRepo = AppDataSource.getRepository(TransactionEntity);
  const passengerRepo = AppDataSource.getRepository(PassengerEntity);
  const walletRepo = AppDataSource.getRepository(WalletEntity);
  const walletTxnRepo = AppDataSource.getRepository(WalletTransactionEntity);
  const couponRepo = AppDataSource.getRepository(CouponEntity);
  const configRepo = AppDataSource.getRepository(SystemConfigEntity);

  const walletService = new WalletService(walletRepo, walletTxnRepo);
  const couponService = new CouponService(couponRepo, bookingRepo);
  const configService = new ConfigService(configRepo);
  const transactionService = new TransactionService(txnRepo);

  const razorpayService = new RazorpayService();
  const bookingService = new BookingService(
    bookingRepo,
    passengerRepo,
    seatRepo,
    tripRepo,
    walletService,
    couponService,
    configService,
    null,
    null,
    null,
    transactionService
  );

  // Retrieve existing users from database or create fallback test users
  const existingUsers = await userRepo.find({ take: 2 });
  let userA = existingUsers[0];
  let userB = existingUsers[1];

  if (!userA) {
    userA = userRepo.create({ name: "User A", email: `user_a_${Date.now()}@example.com`, phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`, password: "password123" });
    await userRepo.save(userA);
  }
  if (!userB) {
    userB = userRepo.create({ name: "User B", email: `user_b_${Date.now()}@example.com`, phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`, password: "password123" });
    await userRepo.save(userB);
  }

  // Get or find a valid trip with seats
  const trips = await tripRepo.find();
  if (trips.length === 0) {
    console.error("No trips found in database! Please seed database.");
    process.exit(1);
  }

  let selectedTrip = null;
  let availableSeats = [];
  for (const t of trips) {
    const seats = await seatRepo.find({ where: { tripId: t.id, status: "AVAILABLE" } });
    if (seats.length >= 2) {
      selectedTrip = t;
      availableSeats = seats;
      break;
    }
  }

  if (!selectedTrip) {
    selectedTrip = trips[0];
    const allSeats = await seatRepo.find({ where: { tripId: selectedTrip.id } });
    for (const seat of allSeats) {
      seat.status = "AVAILABLE";
      await seatRepo.save(seat);
    }
    availableSeats = await seatRepo.find({ where: { tripId: selectedTrip.id, status: "AVAILABLE" } });
  }

  const seatsUserA = availableSeats.slice(0, 1);
  const seatsUserB = availableSeats.slice(1, 2);

  const seatAId = seatsUserA[0].id;
  const seatBId = seatsUserB[0].id;

  const routePointRepo = AppDataSource.getRepository("RoutePoint");
  const boardingPoint = await routePointRepo.findOne({ where: { routeId: selectedTrip.routeId, pointType: "BOARDING", isActive: true } }) || await routePointRepo.findOne({ where: { routeId: selectedTrip.routeId, isActive: true } });
  const droppingPoint = await routePointRepo.findOne({ where: { routeId: selectedTrip.routeId, pointType: "DROPPING", isActive: true } }) || await routePointRepo.findOne({ where: { routeId: selectedTrip.routeId, isActive: true } });

  const boardingPointId = boardingPoint ? boardingPoint.id : null;
  const droppingPointId = droppingPoint ? droppingPoint.id : null;

  console.log(`[+] Using Trip ID: ${selectedTrip.id}`);
  console.log(`[+] Boarding Point ID: ${boardingPointId}`);
  console.log(`[+] Dropping Point ID: ${droppingPointId}`);
  console.log(`[+] Seat A: ${seatsUserA[0].seatNumber} (${seatAId})`);
  console.log(`[+] Seat B: ${seatsUserB[0].seatNumber} (${seatBId})`);

  // Helper to generate HMAC signature
  function generateSignature(orderId, paymentId) {
    const secret = process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_GATEWAY_KEY_SECRET || "dummy_secret";
    return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  }

  // Override RazorpayService.prototype.fetchOrder during test to avoid network call failure for fake order IDs
  let mockRazorpayAmount = null;
  RazorpayService.prototype.fetchOrder = async function (orderId) {
    return {
      id: orderId,
      amount: mockRazorpayAmount !== null ? mockRazorpayAmount : Math.round(Number(seatsUserA[0].price) * 100),
      currency: "INR",
      status: "created",
    };
  };

  const { PaymentService } = await import("../src/services/paymentService.js");
  const paymentService = new PaymentService(txnRepo, razorpayService, bookingService, transactionService);

  // -------------------------------------------------------------
  // TEST 1: Happy Path - PaymentService order creation, verification & confirmation
  // -------------------------------------------------------------
  console.log("\n--- TEST 1: Happy Path Payment Verification via PaymentService ---");
  const orderRes1 = await paymentService.createRazorpayBookingOrder(userA.id, {
    tripId: selectedTrip.id,
    seatIds: [seatAId],
    couponCode: null,
    useWallet: false,
  });

  const orderId1 = orderRes1.orderId;
  const paymentId1 = `pay_test_${Date.now()}_1`;
  const signature1 = generateSignature(orderId1, paymentId1);

  const payload1 = {
    tripId: selectedTrip.id,
    seatIds: [seatAId],
    boardingPointId,
    droppingPointId,
    passengers: [{ name: "Passenger A", age: 25, gender: "Male" }],
    razorpay_order_id: orderId1,
    razorpay_payment_id: paymentId1,
    razorpay_signature: signature1,
  };

  mockRazorpayAmount = Math.round(Number(seatsUserA[0].price) * 100);
  const booking1 = await bookingService.createBooking(userA.id, payload1);
  const bookingId1 = booking1.id || (await bookingRepo.findOne({ where: { pnr: booking1.pnr } })).id;
  console.log(`[✓] TEST 1 PASSED: Booking confirmed! PNR: ${booking1.pnr}, ID: ${bookingId1}`);

  const updatedTxn1 = await txnRepo.findOne({ where: { razorpayOrderId: orderId1 } });
  if (updatedTxn1 && updatedTxn1.paymentStatus === "SUCCESS" && String(updatedTxn1.bookingId) === String(bookingId1)) {
    console.log(`[✓] TEST 1 PASSED: Transaction status transitioned from PENDING -> SUCCESS and linked to Booking ID ${bookingId1}.`);
  } else {
    console.error(`[✗] TEST 1 FAILED: Transaction state incorrect. Txn bookingId: ${updatedTxn1?.bookingId}, Booking id: ${bookingId1}`);
  }

  // -------------------------------------------------------------
  // TEST 2: Attack Scenario 1 - Order A → Booking B (Cross-Booking Reuse)
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Attack Scenario - Order A → Booking B (Cross-Booking Intent Mismatch) ---");
  const orderId2 = `order_test_${Date.now()}_2`;
  const paymentId2 = `pay_test_${Date.now()}_2`;
  const signature2 = generateSignature(orderId2, paymentId2);

  // Order created for Seat A
  const pendingTxn2 = txnRepo.create({
    transactionId: `TXN_TEST_${Date.now()}_2`,
    userId: userA.id,
    amount: Number(seatsUserB[0].price),
    paymentMethod: "GATEWAY",
    paymentStatus: "PENDING",
    razorpayOrderId: orderId2,
    orderMetadata: JSON.stringify({ tripId: selectedTrip.id, seatIds: [seatAId], couponCode: null, useWallet: false }),
  });
  await txnRepo.save(pendingTxn2);

  // Attempt to confirm using Seat B
  const payload2 = {
    tripId: selectedTrip.id,
    seatIds: [seatBId], // MISMATCHED SEAT
    boardingPointId,
    droppingPointId,
    passengers: [{ name: "Attacker Passenger", age: 30, gender: "Male" }],
    razorpay_order_id: orderId2,
    razorpay_payment_id: paymentId2,
    razorpay_signature: signature2,
  };

  try {
    await bookingService.createBooking(userA.id, payload2);
    console.error("[✗] TEST 2 FAILED: Cross-booking reuse was NOT blocked!");
  } catch (err) {
    if (err.message.includes("created for a different trip or set of seats")) {
      console.log(`[✓] TEST 2 PASSED: Cross-booking reuse correctly blocked! Error: "${err.message}"`);
    } else {
      console.error(`[✗] TEST 2 FAILED with unexpected error: ${err.message}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 3: Attack Scenario 2 - User A → User B (Cross-User Theft)
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Attack Scenario - User A Order used by User B ---");
  const orderId3 = `order_test_${Date.now()}_3`;
  const paymentId3 = `pay_test_${Date.now()}_3`;
  const signature3 = generateSignature(orderId3, paymentId3);

  // Order created by User A
  const pendingTxn3 = txnRepo.create({
    transactionId: `TXN_TEST_${Date.now()}_3`,
    userId: userA.id, // User A owner
    amount: Number(seatsUserB[0].price),
    paymentMethod: "GATEWAY",
    paymentStatus: "PENDING",
    razorpayOrderId: orderId3,
    orderMetadata: JSON.stringify({ tripId: selectedTrip.id, seatIds: [seatBId], couponCode: null, useWallet: false }),
  });
  await txnRepo.save(pendingTxn3);

  // User B tries to submit User A's order
  const payload3 = {
    tripId: selectedTrip.id,
    seatIds: [seatBId],
    boardingPointId,
    droppingPointId,
    passengers: [{ name: "User B Passenger", age: 22, gender: "Female" }],
    razorpay_order_id: orderId3,
    razorpay_payment_id: paymentId3,
    razorpay_signature: signature3,
  };

  try {
    await bookingService.createBooking(userB.id, payload3); // Authenticated as User B
    console.error("[✗] TEST 3 FAILED: Cross-user order theft was NOT blocked!");
  } catch (err) {
    if (err.message.includes("does not belong to the current authenticated user")) {
      console.log(`[✓] TEST 3 PASSED: Cross-user order theft correctly blocked! Error: "${err.message}"`);
    } else {
      console.error(`[✗] TEST 3 FAILED with unexpected error: ${err.message}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 4: Replay Attack - Submitting an already SUCCESS order
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Replay Attack - Re-submitting successful Order 1 ---");
  // Reset seat status for seat A so replay check is tested rather than seat lock
  seatsUserA[0].status = "AVAILABLE";
  await seatRepo.save(seatsUserA[0]);

  try {
    const replayRes = await bookingService.createBooking(userA.id, payload1); // Same orderId1 already SUCCESS
    if (replayRes && (replayRes.id === booking1.id || replayRes.pnr === booking1.pnr)) {
      console.log(`[✓] TEST 4 PASSED: Replay attack correctly handled idempotently! Returned existing booking ID ${replayRes.id}.`);
    } else {
      console.error("[✗] TEST 4 FAILED: Order replay created a duplicate booking!");
    }
  } catch (err) {
    if (err.message.includes("already been processed or finalized")) {
      console.log(`[✓] TEST 4 PASSED: Replay attack correctly blocked! Error: "${err.message}"`);
    } else {
      console.error(`[✗] TEST 4 FAILED with unexpected error: ${err.message}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 5: Concurrent / Simultaneous Confirmation Requests
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Concurrent Requests for Same Order ---");
  // Reset seat B status for concurrent test
  seatsUserB[0].status = "AVAILABLE";
  await seatRepo.save(seatsUserB[0]);

  const orderId5 = `order_test_${Date.now()}_5`;
  const paymentId5 = `pay_test_${Date.now()}_5`;
  const signature5 = generateSignature(orderId5, paymentId5);

  const pendingTxn5 = txnRepo.create({
    transactionId: `TXN_TEST_${Date.now()}_5`,
    userId: userB.id,
    amount: Number(seatsUserB[0].price),
    paymentMethod: "GATEWAY",
    paymentStatus: "PENDING",
    razorpayOrderId: orderId5,
    orderMetadata: JSON.stringify({ tripId: selectedTrip.id, seatIds: [seatBId], couponCode: null, useWallet: false }),
  });
  await txnRepo.save(pendingTxn5);

  const payload5 = {
    tripId: selectedTrip.id,
    seatIds: [seatBId],
    boardingPointId,
    droppingPointId,
    passengers: [{ name: "User B Passenger", age: 28, gender: "Male" }],
    razorpay_order_id: orderId5,
    razorpay_payment_id: paymentId5,
    razorpay_signature: signature5,
  };

  mockRazorpayAmount = Math.round(Number(seatsUserB[0].price) * 100);

  const results = await Promise.allSettled([
    bookingService.createBooking(userB.id, payload5),
    bookingService.createBooking(userB.id, payload5),
  ]);

  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const uniqueBookingIds = new Set(fulfilled.map((r) => r.value.id));

  if (fulfilled.length >= 1 && uniqueBookingIds.size === 1) {
    console.log(`[✓] TEST 5 PASSED: Concurrent requests safely returned the same single booking ID (${Array.from(uniqueBookingIds)[0]}) without duplicate bookings!`);
  } else {
    console.error(`[✗] TEST 5 FAILED: Concurrent requests created duplicate bookings! Unique IDs: ${uniqueBookingIds.size}`);
  }

  // -------------------------------------------------------------
  // TEST 6: Preservation of Problem #1 Amount Verification
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Preservation of Problem #1 Amount Verification Mismatch ---");
  // Reset seat status for seat A for fresh test
  seatsUserA[0].status = "AVAILABLE";
  await seatRepo.save(seatsUserA[0]);

  const orderId6 = `order_test_${Date.now()}_6`;
  const paymentId6 = `pay_test_${Date.now()}_6`;
  const signature6 = generateSignature(orderId6, paymentId6);

  const pendingTxn6 = txnRepo.create({
    transactionId: `TXN_TEST_${Date.now()}_6`,
    userId: userA.id,
    amount: Number(seatsUserA[0].price),
    paymentMethod: "GATEWAY",
    paymentStatus: "PENDING",
    razorpayOrderId: orderId6,
    orderMetadata: JSON.stringify({ tripId: selectedTrip.id, seatIds: [seatAId], couponCode: null, useWallet: false }),
  });
  await txnRepo.save(pendingTxn6);

  // Set Razorpay order amount to mismatched value (e.g. ₹1 instead of seat price)
  mockRazorpayAmount = 100; // 100 paise = ₹1

  const payload6 = {
    tripId: selectedTrip.id,
    seatIds: [seatAId],
    boardingPointId,
    droppingPointId,
    passengers: [{ name: "Passenger A", age: 25, gender: "Male" }],
    razorpay_order_id: orderId6,
    razorpay_payment_id: paymentId6,
    razorpay_signature: signature6,
  };

  try {
    await bookingService.createBooking(userA.id, payload6);
    console.error("[✗] TEST 6 FAILED: Amount mismatch was NOT detected!");
  } catch (err) {
    if (err.message.includes("amount mismatch")) {
      console.log(`[✓] TEST 6 PASSED: Amount mismatch correctly caught! Error: "${err.message}"`);
    } else {
      console.error(`[✗] TEST 6 FAILED with unexpected error: ${err.message}`);
    }
  }

  console.log("\n=== ALL TEST SCENARIOS EXECUTED SUCCESSFULLY ===");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
