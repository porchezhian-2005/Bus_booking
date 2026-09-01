import crypto from "crypto";
import AppDataSource from "../src/config/database.js";
import UserEntity from "../src/models/User.js";
import SeatEntity from "../src/models/Seat.js";
import TripEntity from "../src/models/Trip.js";
import RoutePointEntity from "../src/models/RoutePoint.js";
import BookingEntity from "../src/models/Booking.js";
import TransactionEntity from "../src/models/Transaction.js";
import RazorpayService from "../src/services/razorpayService.js";
import TransactionService from "../src/services/transactionService.js";
import BusService from "../src/services/busService.js";
import BookingService from "../src/services/bookingService.js";
import PaymentService from "../src/services/paymentService.js";

async function runProblem3Tests() {
  console.log("=== STARTING PROBLEM #3 SEAT HOLD VERIFICATION TESTS ===");

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  console.log("[✓] Database initialized successfully.");

  const userRepo = AppDataSource.getRepository(UserEntity);
  const seatRepo = AppDataSource.getRepository(SeatEntity);
  const tripRepo = AppDataSource.getRepository(TripEntity);
  const pointRepo = AppDataSource.getRepository(RoutePointEntity);
  const bookingRepo = AppDataSource.getRepository(BookingEntity);
  const txnRepo = AppDataSource.getRepository(TransactionEntity);

  // Setup Test Users
  let userA = await userRepo.findOne({ where: { email: "userA_hold_test@example.com" } });
  if (!userA) {
    userA = userRepo.create({
      name: "User A Hold Test",
      email: "userA_hold_test@example.com",
      phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: "password123",
      walletBalance: 0,
    });
    await userRepo.save(userA);
  }

  let userB = await userRepo.findOne({ where: { email: "userB_hold_test@example.com" } });
  if (!userB) {
    userB = userRepo.create({
      name: "User B Hold Test",
      email: "userB_hold_test@example.com",
      phone: `97${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: "password123",
      walletBalance: 0,
    });
    await userRepo.save(userB);
  }

  // Find valid Trip and Route Points
  const trips = await tripRepo.find({ relations: { route: true, bus: true } });
  if (!trips || trips.length === 0) {
    throw new Error("No trips found in database to run tests!");
  }

  const selectedTrip = trips[0];
  console.log(`[+] Using Trip ID: ${selectedTrip.id}`);

  const points = await pointRepo.find({ where: { routeId: selectedTrip.routeId } });
  if (points.length < 2) {
    throw new Error("Trip route does not have at least 2 route points!");
  }
  const boardingPointId = points[0].id;
  const droppingPointId = points[1].id;

  // Clean up existing seats for test setup or fetch seats
  const tripSeats = await seatRepo.find({ where: { tripId: selectedTrip.id } });
  if (tripSeats.length < 5) {
    throw new Error("Trip must have at least 5 seats for tests!");
  }

  // Reset test seats to AVAILABLE
  for (let i = 0; i < 5; i++) {
    tripSeats[i].status = "AVAILABLE";
    tripSeats[i].heldBy = null;
    tripSeats[i].heldUntil = null;
    await seatRepo.save(tripSeats[i]);
  }

  const seat1 = tripSeats[0];
  const seat2 = tripSeats[1];
  const seat3 = tripSeats[2];
  const seat4 = tripSeats[3];
  const seat5 = tripSeats[4];

  console.log(`[+] Seat 1: ${seat1.seatNumber} (${seat1.id})`);
  console.log(`[+] Seat 2: ${seat2.seatNumber} (${seat2.id})`);
  console.log(`[+] Seat 3: ${seat3.seatNumber} (${seat3.id})`);
  console.log(`[+] Seat 4: ${seat4.seatNumber} (${seat4.id})`);
  console.log(`[+] Seat 5: ${seat5.seatNumber} (${seat5.id})`);

  // Mock Razorpay SDK Service Prototype methods
  let mockRazorpayAmount = null;
  RazorpayService.prototype.createOrder = async function (amountInINR, receipt, notesPayload) {
    mockRazorpayAmount = Math.round(Number(amountInINR) * 100);
    return {
      id: `order_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      amount: mockRazorpayAmount,
      currency: "INR",
      status: "created",
    };
  };

  RazorpayService.prototype.verifyPaymentSignature = function (orderId, paymentId, signature) {
    return true;
  };

  RazorpayService.prototype.fetchOrder = async function (orderId) {
    return {
      id: orderId,
      amount: mockRazorpayAmount !== null ? mockRazorpayAmount : 50000,
      currency: "INR",
      status: "created",
    };
  };

  const razorpayService = new RazorpayService();

  const { bookingService } = await import("../src/controller/bookingController.js");
  const busService = new BusService(AppDataSource.getRepository("Bus"), AppDataSource.getRepository("Route"), tripRepo, seatRepo, bookingRepo);
  const transactionService = new TransactionService(txnRepo);
  const paymentService = new PaymentService(txnRepo, razorpayService, bookingService, transactionService);

  const generateSignature = (orderId, paymentId) => {
    const secret = process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_GATEWAY_KEY_SECRET || "mock_secret";
    return crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
  };

  // -------------------------------------------------------------
  // TEST 1: Happy Path AVAILABLE -> HELD (10 mins) -> BOOKED
  // -------------------------------------------------------------
  console.log("\n--- TEST 1: Happy Path AVAILABLE -> HELD -> BOOKED ---");
  const orderRes1 = await paymentService.createRazorpayBookingOrder(userA.id, {
    tripId: selectedTrip.id,
    seatIds: [seat1.id],
    couponCode: null,
    useWallet: false,
  });

  const checkSeat1 = await seatRepo.findOne({ where: { id: seat1.id } });
  if (checkSeat1.status !== "HELD" || checkSeat1.heldBy !== userA.id || !checkSeat1.heldUntil) {
    throw new Error(`TEST 1 FAILED: Seat 1 was not updated to HELD with heldBy userA! Actual: status=${checkSeat1.status}, heldBy=${checkSeat1.heldBy}`);
  }
  console.log(`[✓] TEST 1 PASSED: Seat ${seat1.seatNumber} successfully HELD for User A until ${checkSeat1.heldUntil.toISOString()}`);

  const paymentId1 = `pay_test_${Date.now()}_1`;
  const signature1 = generateSignature(orderRes1.orderId, paymentId1);

  const bookingRes1 = await bookingService.createBooking(userA.id, {
    tripId: selectedTrip.id,
    seatIds: [seat1.id],
    boardingPointId,
    droppingPointId,
    passengers: [{ name: "Passenger 1", age: 25, gender: "MALE" }],
    razorpay_order_id: orderRes1.orderId,
    razorpay_payment_id: paymentId1,
    razorpay_signature: signature1,
  });

  const bookedSeat1 = await seatRepo.findOne({ where: { id: seat1.id } });
  if (bookedSeat1.status !== "BOOKED" || bookedSeat1.heldBy !== null || bookedSeat1.heldUntil !== null) {
    throw new Error(`TEST 1 FAILED: Seat 1 was not transitioned to BOOKED with cleared hold metadata! Actual: status=${bookedSeat1.status}, heldBy=${bookedSeat1.heldBy}`);
  }
  console.log(`[✓] TEST 1 PASSED: Seat ${seat1.seatNumber} successfully BOOKED! PNR: ${bookingRes1.pnr}`);

  // -------------------------------------------------------------
  // TEST 2: Concurrent Seat Hold Race Condition Protection
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Concurrent Seat Hold Attempt on Same Seat ---");
  const reqUserA = paymentService.createRazorpayBookingOrder(userA.id, {
    tripId: selectedTrip.id,
    seatIds: [seat2.id],
    couponCode: null,
    useWallet: false,
  });

  const reqUserB = paymentService.createRazorpayBookingOrder(userB.id, {
    tripId: selectedTrip.id,
    seatIds: [seat2.id],
    couponCode: null,
    useWallet: false,
  });

  const results = await Promise.allSettled([reqUserA, reqUserB]);
  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  if (fulfilled.length !== 1 || rejected.length !== 1) {
    throw new Error(`TEST 2 FAILED: Expected exactly 1 hold success and 1 hold rejection! Fulfilled=${fulfilled.length}, Rejected=${rejected.length}`);
  }
  console.log(`[✓] TEST 2 PASSED: Concurrent hold protected by pessimistic row locking! Succeeded: 1, Rejected: 1. Error: "${rejected[0].reason.message}"`);

  // -------------------------------------------------------------
  // TEST 3: Cross-User Seat Theft Protection (User B tries to book User A's held seat)
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Cross-User Seat Theft Protection ---");
  const orderRes3 = await paymentService.createRazorpayBookingOrder(userA.id, {
    tripId: selectedTrip.id,
    seatIds: [seat3.id],
    couponCode: null,
    useWallet: false,
  });

  try {
    await paymentService.createRazorpayBookingOrder(userB.id, {
      tripId: selectedTrip.id,
      seatIds: [seat3.id],
      couponCode: null,
      useWallet: false,
    });
    throw new Error("TEST 3 FAILED: User B was able to create order for User A's held seat!");
  } catch (err) {
    if (err.statusCode !== 409) {
      throw err;
    }
    console.log(`[✓] TEST 3 PASSED: Cross-user seat theft correctly blocked! Error: "${err.message}"`);
  }

  // -------------------------------------------------------------
  // TEST 4: Manual Seat Hold Cancellation / Release
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Manual Seat Hold Cancellation ---");
  const orderRes4 = await paymentService.createRazorpayBookingOrder(userA.id, {
    tripId: selectedTrip.id,
    seatIds: [seat4.id],
    couponCode: null,
    useWallet: false,
  });

  const releaseRes = await paymentService.cancelHold(userA.id, {
    tripId: selectedTrip.id,
    seatIds: [seat4.id],
  });

  const releasedSeat4 = await seatRepo.findOne({ where: { id: seat4.id } });
  if (releasedSeat4.status !== "AVAILABLE" || releasedSeat4.heldBy !== null) {
    throw new Error(`TEST 4 FAILED: Seat 4 was not released back to AVAILABLE! Actual: status=${releasedSeat4.status}`);
  }
  console.log(`[✓] TEST 4 PASSED: Seat ${seat4.seatNumber} successfully released back to AVAILABLE via cancelHold!`);

  // -------------------------------------------------------------
  // TEST 5: Expired Hold Behavior (Dead Hold Rule)
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Expired Hold Behavior (Dead Hold Rule) ---");
  const pastTimestamp = new Date(Date.now() - 5 * 60 * 1000); // 5 mins in the past
  seat5.status = "HELD";
  seat5.heldBy = userA.id;
  seat5.heldUntil = pastTimestamp;
  await seatRepo.save(seat5);

  const orderId5 = `order_test_${Date.now()}_5`;
  const paymentId5 = `pay_test_${Date.now()}_5`;
  const signature5 = generateSignature(orderId5, paymentId5);

  const pendingTxn5 = txnRepo.create({
    transactionId: `TXN_TEST_${Date.now()}_5`,
    userId: userA.id,
    bookingId: null,
    amount: Number(seat5.price),
    paymentMethod: "GATEWAY",
    paymentStatus: "PENDING",
    razorpayOrderId: orderId5,
    orderMetadata: JSON.stringify({ tripId: selectedTrip.id, seatIds: [seat5.id], couponCode: null, useWallet: false }),
  });
  await txnRepo.save(pendingTxn5);

  try {
    await bookingService.createBooking(userA.id, {
      tripId: selectedTrip.id,
      seatIds: [seat5.id],
      boardingPointId,
      droppingPointId,
      passengers: [{ name: "Late Passenger", age: 30, gender: "MALE" }],
      razorpay_order_id: orderId5,
      razorpay_payment_id: paymentId5,
      razorpay_signature: signature5,
    });
    throw new Error("TEST 5 FAILED: Booking succeeded for an expired seat hold!");
  } catch (err) {
    if (err.statusCode !== 409) {
      throw err;
    }
    console.log(`[✓] TEST 5 PASSED: Expired hold booking cleanly rejected! Error: "${err.message}"`);
  }

  // -------------------------------------------------------------
  // TEST 6: Expired Hold Acquisition by User B
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Expired Hold Acquisition by Another User ---");
  const orderRes6 = await paymentService.createRazorpayBookingOrder(userB.id, {
    tripId: selectedTrip.id,
    seatIds: [seat5.id],
    couponCode: null,
    useWallet: false,
  });

  const reheldSeat5 = await seatRepo.findOne({ where: { id: seat5.id } });
  if (reheldSeat5.status !== "HELD" || reheldSeat5.heldBy !== userB.id) {
    throw new Error(`TEST 6 FAILED: User B was unable to acquire expired seat 5! Actual: status=${reheldSeat5.status}, heldBy=${reheldSeat5.heldBy}`);
  }
  console.log(`[✓] TEST 6 PASSED: User B successfully acquired Seat ${seat5.seatNumber} after User A's hold expired!`);

  console.log("\n=== ALL PROBLEM #3 TEST SCENARIOS EXECUTED SUCCESSFULLY ===");
}

runProblem3Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ TEST FAILED:", err);
    process.exit(1);
  });
