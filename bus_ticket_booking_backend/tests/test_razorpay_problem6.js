import dotenv from "dotenv";
dotenv.config();

import crypto from "crypto";
import RazorpayService from "../src/services/razorpayService.js";
import PaymentService from "../src/services/paymentService.js";

async function runProblem6CredentialsTests() {
  console.log("=== STARTING PROBLEM #6 CREDENTIAL VALIDATION & FALLBACK REMOVAL TESTS ===");

  // Store original env vars
  const origKeyId = process.env.RAZORPAY_KEY_ID;
  const origKeySecret = process.env.RAZORPAY_KEY_SECRET;
  const origWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const testKeyId = "rzp_test_valid_prob6_key";
  const testKeySecret = "valid_prob6_secret_key";
  const testWebhookSecret = "valid_prob6_webhook_secret";

  process.env.RAZORPAY_KEY_ID = testKeyId;
  process.env.RAZORPAY_KEY_SECRET = testKeySecret;
  process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;

  const razorpayService = new RazorpayService();

  // -------------------------------------------------------------
  // TEST 1: Operation-Level Valid Credentials Performance
  // -------------------------------------------------------------
  console.log("\n--- TEST 1: Valid Environment Credentials Performance ---");
  const orderId1 = "order_prob6_123";
  const paymentId1 = "pay_prob6_456";
  const validPaymentSig = crypto.createHmac("sha256", testKeySecret).update(`${orderId1}|${paymentId1}`).digest("hex");

  const isSigValid = razorpayService.verifyPaymentSignature(orderId1, paymentId1, validPaymentSig);
  if (!isSigValid) {
    throw new Error("TEST 1 FAILED: Valid payment signature verification failed!");
  }
  console.log("[✓] TEST 1.1 PASSED: verifyPaymentSignature correctly validated signature using RAZORPAY_KEY_SECRET.");

  const rawBody1 = JSON.stringify({ event: "payment.captured", id: "evt_123" });
  const validWebhookSig = crypto.createHmac("sha256", testWebhookSecret).update(rawBody1).digest("hex");

  const isWebhookSigValid = razorpayService.verifyWebhookSignature(rawBody1, validWebhookSig);
  if (!isWebhookSigValid) {
    throw new Error("TEST 1 FAILED: Valid webhook signature verification failed!");
  }
  console.log("[✓] TEST 1.2 PASSED: verifyWebhookSignature correctly validated HMAC using RAZORPAY_WEBHOOK_SECRET.");

  // -------------------------------------------------------------
  // TEST 2: Missing RAZORPAY_KEY_ID Error Handling
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Missing RAZORPAY_KEY_ID Error Handling ---");
  delete process.env.RAZORPAY_KEY_ID;
  const freshService2 = new RazorpayService();

  try {
    freshService2.getRazorpayClient();
    throw new Error("TEST 2 FAILED: SDK initialization did not throw when RAZORPAY_KEY_ID was missing!");
  } catch (err) {
    if (!err.message.includes("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured")) {
      throw new Error(`TEST 2 FAILED: Unexpected error message: ${err.message}`);
    }
    console.log(`[✓] TEST 2 PASSED: Missing RAZORPAY_KEY_ID correctly threw configuration error: "${err.message}"`);
  }
  process.env.RAZORPAY_KEY_ID = testKeyId;

  // -------------------------------------------------------------
  // TEST 3: Missing RAZORPAY_KEY_SECRET Error Handling
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Missing RAZORPAY_KEY_SECRET Error Handling ---");
  delete process.env.RAZORPAY_KEY_SECRET;
  const freshService3 = new RazorpayService();

  try {
    freshService3.verifyPaymentSignature(orderId1, paymentId1, validPaymentSig);
    throw new Error("TEST 3 FAILED: verifyPaymentSignature did not throw when RAZORPAY_KEY_SECRET was missing!");
  } catch (err) {
    if (!err.message.includes("RAZORPAY_KEY_SECRET is missing")) {
      throw new Error(`TEST 3 FAILED: Unexpected error message: ${err.message}`);
    }
    console.log(`[✓] TEST 3 PASSED: Missing RAZORPAY_KEY_SECRET correctly threw configuration error: "${err.message}"`);
  }
  process.env.RAZORPAY_KEY_SECRET = testKeySecret;

  // -------------------------------------------------------------
  // TEST 4: Missing RAZORPAY_WEBHOOK_SECRET Error Handling
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Missing RAZORPAY_WEBHOOK_SECRET Error Handling ---");
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  const freshService4 = new RazorpayService();

  try {
    freshService4.verifyWebhookSignature(rawBody1, validWebhookSig);
    throw new Error("TEST 4 FAILED: verifyWebhookSignature did not throw when RAZORPAY_WEBHOOK_SECRET was missing!");
  } catch (err) {
    if (!err.message.includes("RAZORPAY_WEBHOOK_SECRET is not configured")) {
      throw new Error(`TEST 4 FAILED: Unexpected error message: ${err.message}`);
    }
    console.log(`[✓] TEST 4 PASSED: Missing RAZORPAY_WEBHOOK_SECRET correctly threw configuration error: "${err.message}"`);
  }
  process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;

  // -------------------------------------------------------------
  // TEST 5: Deprecation of Legacy PAYMENT_GATEWAY_* Fallbacks
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Verify Legacy PAYMENT_GATEWAY_* Fallbacks are Removed ---");
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.PAYMENT_GATEWAY_KEY_ID = "legacy_gateway_key_id";
  process.env.PAYMENT_GATEWAY_KEY_SECRET = "legacy_gateway_key_secret";

  const legacyService = new RazorpayService();
  try {
    legacyService.getRazorpayClient();
    throw new Error("TEST 5 FAILED: Legacy PAYMENT_GATEWAY_KEY_ID fallback was accepted when RAZORPAY_KEY_ID was missing!");
  } catch (err) {
    if (!err.message.includes("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured")) {
      throw new Error(`TEST 5 FAILED: Unexpected error message: ${err.message}`);
    }
    console.log(`[✓] TEST 5 PASSED: Legacy PAYMENT_GATEWAY_* variables are cleanly ignored and rejected!`);
  }

  // Restore env variables
  delete process.env.PAYMENT_GATEWAY_KEY_ID;
  delete process.env.PAYMENT_GATEWAY_KEY_SECRET;

  if (origKeyId) process.env.RAZORPAY_KEY_ID = origKeyId;
  else process.env.RAZORPAY_KEY_ID = testKeyId;

  if (origKeySecret) process.env.RAZORPAY_KEY_SECRET = origKeySecret;
  else process.env.RAZORPAY_KEY_SECRET = testKeySecret;

  if (origWebhookSecret) process.env.RAZORPAY_WEBHOOK_SECRET = origWebhookSecret;
  else process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;

  console.log("\n=== ALL PROBLEM #6 CREDENTIAL VALIDATION & CLEANUP TESTS PASSED SUCCESSFULLY ===");
}

runProblem6CredentialsTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ TEST FAILED:", err);
    process.exit(1);
  });
