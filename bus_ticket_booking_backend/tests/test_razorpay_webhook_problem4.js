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
import PaymentService from "../src/services/paymentService.js";

async function runProblem4WebhookTests() {
  console.log("=== STARTING PROBLEM #4 RAZORPAY WEBHOOK VERIFICATION TESTS ===");

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

  const testWebhookSecret = "test_webhook_secret_12345";
  process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;

  // Setup Test User
  let user = await userRepo.findOne({ where: { email: "webhook_user_test@example.com" } });
  if (!user) {
    user = userRepo.create({
      name: "Webhook Test User",
      email: "webhook_user_test@example.com",
      phone: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: "password123",
      walletBalance: 0,
    });
    await userRepo.save(user);
  }

  const trips = await tripRepo.find({ relations: { route: true, bus: true } });
  if (!trips || trips.length === 0) {
    throw new Error("No trips found in database to run tests!");
  }

  const selectedTrip = trips[0];
  const points = await pointRepo.find({ where: { routeId: selectedTrip.routeId } });
  if (points.length < 2) {
    throw new Error("Trip route does not have at least 2 route points!");
  }
  const boardingPointId = points[0].id;
  const droppingPointId = points[1].id;

  const tripSeats = await seatRepo.find({ where: { tripId: selectedTrip.id } });
  if (tripSeats.length < 5) {
    throw new Error("Trip must have at least 5 seats for tests!");
  }

  // Reset 5 test seats to AVAILABLE
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

  console.log(`[+] Using Trip ID: ${selectedTrip.id}`);
  console.log(`[+] Seat 1: ${seat1.seatNumber} (${seat1.id})`);
  console.log(`[+] Seat 2: ${seat2.seatNumber} (${seat2.id})`);

  // Mock Razorpay SDK Prototype
  let mockRazorpayAmount = null;
  RazorpayService.prototype.createOrder = async function (amountInINR, receipt, notesPayload) {
    mockRazorpayAmount = Math.round(Number(amountInINR) * 100);
    return {
      id: `order_webhook_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
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

  const { bookingService } = await import("../src/controller/bookingController.js");
  const busService = new BusService(AppDataSource.getRepository("Bus"), AppDataSource.getRepository("Route"), tripRepo, seatRepo, bookingRepo);
  const transactionService = new TransactionService(txnRepo);
  const paymentService = new PaymentService(txnRepo, new RazorpayService(), bookingService, transactionService);

  const generateWebhookSignature = (rawBodyString, secret = testWebhookSecret) => {
    return crypto.createHmac("sha256", secret).update(rawBodyString).digest("hex");
  };

  // -------------------------------------------------------------
  // TEST 1: Valid payment.captured Webhook Event
  // -------------------------------------------------------------
  console.log("\n--- TEST 1: Valid payment.captured Webhook Event ---");
  const passengers1 = [{ seatNumber: seat1.seatNumber, name: "Alice Test", age: 28, gender: "Female" }];
  const orderRes1 = await paymentService.createRazorpayBookingOrder(user.id, {
    tripId: selectedTrip.id,
    seatIds: [seat1.id],
    boardingPointId,
    droppingPointId,
    passengers: passengers1,
    couponCode: null,
    useWallet: false,
  });

  const paymentId1 = `pay_wh_${Date.now()}_1`;
  const webhookBody1 = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: paymentId1,
          order_id: orderRes1.orderId,
          amount: orderRes1.amount,
          currency: "INR",
          status: "captured",
        },
      },
    },
  });

  const signature1 = generateWebhookSignature(webhookBody1);

  const webhookResult1 = await paymentService.handleRazorpayWebhook(webhookBody1, signature1, JSON.parse(webhookBody1));
  if (!webhookResult1.success || !webhookResult1.pnr) {
    throw new Error(`TEST 1 FAILED: Webhook failed to confirm booking! Result: ${JSON.stringify(webhookResult1)}`);
  }

  const checkSeat1 = await seatRepo.findOne({ where: { id: seat1.id } });
  const checkTxn1 = await txnRepo.findOne({ where: { razorpayOrderId: orderRes1.orderId } });

  if (checkSeat1.status !== "BOOKED" || checkTxn1.paymentStatus !== "SUCCESS") {
    throw new Error(`TEST 1 FAILED: DB states were not updated! Seat=${checkSeat1.status}, Txn=${checkTxn1.paymentStatus}`);
  }
  console.log(`[✓] TEST 1 PASSED: Webhook payment.captured processed! PNR: ${webhookResult1.pnr}, Seat: BOOKED, Transaction: SUCCESS`);

  // -------------------------------------------------------------
  // TEST 2: Invalid Webhook HMAC Signature
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Invalid Webhook HMAC Signature ---");
  try {
    await paymentService.handleRazorpayWebhook(webhookBody1, "invalid_hmac_signature", JSON.parse(webhookBody1));
    throw new Error("TEST 2 FAILED: Webhook accepted an invalid HMAC signature!");
  } catch (err) {
    if (err.statusCode !== 400) throw err;
    console.log(`[✓] TEST 2 PASSED: Invalid signature correctly rejected with 400 Bad Request! Error: "${err.message}"`);
  }

  // -------------------------------------------------------------
  // TEST 3: Duplicate Webhook Idempotency
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Duplicate Webhook Idempotency ---");
  const webhookResult3 = await paymentService.handleRazorpayWebhook(webhookBody1, signature1, JSON.parse(webhookBody1));
  if (!webhookResult3.success || !webhookResult3.message.includes("already processed")) {
    throw new Error(`TEST 3 FAILED: Duplicate webhook was not handled idempotently! Result: ${JSON.stringify(webhookResult3)}`);
  }
  console.log(`[✓] TEST 3 PASSED: Duplicate webhook handled idempotently! Message: "${webhookResult3.message}"`);

  // -------------------------------------------------------------
  // TEST 4: payment.failed Event & Active Seat Hold Retention
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: payment.failed Event & Seat Hold Retention ---");
  const orderRes4 = await paymentService.createRazorpayBookingOrder(user.id, {
    tripId: selectedTrip.id,
    seatIds: [seat2.id],
    boardingPointId,
    droppingPointId,
    passengers: [{ seatNumber: seat2.seatNumber, name: "Bob Test", age: 32, gender: "Male" }],
    couponCode: null,
    useWallet: false,
  });

  const paymentId4 = `pay_wh_${Date.now()}_4`;
  const webhookBody4 = JSON.stringify({
    event: "payment.failed",
    payload: {
      payment: {
        entity: {
          id: paymentId4,
          order_id: orderRes4.orderId,
          amount: orderRes4.amount,
          currency: "INR",
          status: "failed",
        },
      },
    },
  });
  const signature4 = generateWebhookSignature(webhookBody4);

  const webhookResult4 = await paymentService.handleRazorpayWebhook(webhookBody4, signature4, JSON.parse(webhookBody4));
  const checkSeat2 = await seatRepo.findOne({ where: { id: seat2.id } });

  if (checkSeat2.status !== "HELD" || checkSeat2.heldBy !== user.id) {
    throw new Error(`TEST 4 FAILED: Active seat hold was wiped out prematurely on payment.failed! Seat status=${checkSeat2.status}`);
  }
  console.log(`[✓] TEST 4 PASSED: payment.failed logged successfully without wiping active seat hold! Seat remains HELD until expiry.`);

  // -------------------------------------------------------------
  // TEST 5: Webhook Before Frontend Race Condition
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Webhook Arrives BEFORE Frontend /bookings Call ---");
  const orderRes5 = await paymentService.createRazorpayBookingOrder(user.id, {
    tripId: selectedTrip.id,
    seatIds: [seat3.id],
    boardingPointId,
    droppingPointId,
    passengers: [{ seatNumber: seat3.seatNumber, name: "Charlie Test", age: 29, gender: "Male" }],
    couponCode: null,
    useWallet: false,
  });

  const paymentId5 = `pay_wh_${Date.now()}_5`;
  const webhookBody5 = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: paymentId5,
          order_id: orderRes5.orderId,
          amount: orderRes5.amount,
          currency: "INR",
          status: "captured",
        },
      },
    },
  });
  const signature5 = generateWebhookSignature(webhookBody5);

  // 1. Webhook processes first
  const whRes5 = await paymentService.handleRazorpayWebhook(webhookBody5, signature5, JSON.parse(webhookBody5));
  console.log(`[+] Webhook processed first! PNR: ${whRes5.pnr}`);

  // 2. Frontend calls /bookings afterward
  const frontendBooking5 = await bookingService.createBooking(user.id, {
    tripId: selectedTrip.id,
    seatIds: [seat3.id],
    boardingPointId,
    droppingPointId,
    passengers: [{ seatNumber: seat3.seatNumber, name: "Charlie Test", age: 29, gender: "Male" }],
    razorpay_order_id: orderRes5.orderId,
    razorpay_payment_id: paymentId5,
    razorpay_signature: "mock_signature",
  });

  if (frontendBooking5.id !== whRes5.bookingId) {
    throw new Error(`TEST 5 FAILED: Frontend call created a duplicate booking ID instead of recovering existing booking!`);
  }
  console.log(`[✓] TEST 5 PASSED: Webhook before frontend race resolved idempotently! Returned existing booking PNR: ${frontendBooking5.pnr}`);

  // -------------------------------------------------------------
  // TEST 6: Late Webhook After Seat Hold Expiration
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Late Webhook After Seat Hold Expiration ---");
  const pastTimestamp = new Date(Date.now() - 5 * 60 * 1000); // 5 mins ago
  seat4.status = "HELD";
  seat4.heldBy = user.id;
  seat4.heldUntil = pastTimestamp;
  await seatRepo.save(seat4);

  const orderId6 = `order_webhook_expired_${Date.now()}`;
  const pendingTxn6 = txnRepo.create({
    transactionId: `TXN_WH_EXPIRED_${Date.now()}`,
    userId: user.id,
    bookingId: null,
    amount: Number(seat4.price),
    paymentMethod: "GATEWAY",
    paymentStatus: "PENDING",
    razorpayOrderId: orderId6,
    orderMetadata: JSON.stringify({
      tripId: selectedTrip.id,
      seatIds: [seat4.id],
      boardingPointId,
      droppingPointId,
      passengers: [{ seatNumber: seat4.seatNumber, name: "Expired Passenger", age: 40, gender: "Male" }],
      couponCode: null,
      useWallet: false,
    }),
  });
  await txnRepo.save(pendingTxn6);

  const paymentId6 = `pay_wh_${Date.now()}_6`;
  const webhookBody6 = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: paymentId6,
          order_id: orderId6,
          amount: Math.round(Number(seat4.price) * 100),
          currency: "INR",
          status: "captured",
        },
      },
    },
  });
  const signature6 = generateWebhookSignature(webhookBody6);

  try {
    await paymentService.handleRazorpayWebhook(webhookBody6, signature6, JSON.parse(webhookBody6));
    throw new Error("TEST 6 FAILED: Webhook created booking for an expired seat hold!");
  } catch (err) {
    if (err.statusCode !== 409) throw err;
    console.log(`[✓] TEST 6 PASSED: Late webhook payment after hold expiry cleanly rejected! Error: "${err.message}"`);
  }

  console.log("\n=== ALL PROBLEM #4 RAZORPAY WEBHOOK TEST SCENARIOS EXECUTED SUCCESSFULLY ===");
}

runProblem4WebhookTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ TEST FAILED:", err);
    process.exit(1);
  });
