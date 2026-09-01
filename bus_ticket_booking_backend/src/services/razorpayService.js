import Razorpay from "razorpay";
import crypto from "crypto";

export class RazorpayService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || process.env.PAYMENT_GATEWAY_KEY_ID || "rzp_test_dummy",
      key_secret: process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_GATEWAY_KEY_SECRET || "dummy_secret",
    });
  }

  /**
   * Create Razorpay Order
   */
  async createOrder(amountInINR, receiptId) {
    const options = {
      amount: Math.round(amountInINR * 100), // Amount in paise (e.g. ₹500 = 50000 paise)
      currency: "INR",
      receipt: receiptId,
    };

    return await this.razorpay.orders.create(options);
  }

  /**
   * Verify Razorpay Payment Signature
   */
  verifyPaymentSignature(orderId, paymentId, signature) {
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_GATEWAY_KEY_SECRET || "dummy_secret")
      .update(body.toString())
      .digest("hex");

    return expectedSignature === signature;
  }

  /**
   * Fetch Razorpay Order by ID
   */
  async fetchOrder(orderId) {
    return await this.razorpay.orders.fetch(orderId);
  }

  /**
   * Fetch Razorpay Payment by ID
   */
  async fetchPayment(paymentId) {
    return await this.razorpay.payments.fetch(paymentId);
  }
}

export default RazorpayService;
