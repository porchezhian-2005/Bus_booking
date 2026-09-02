import Razorpay from "razorpay";
import crypto from "crypto";

export class RazorpayService {
  constructor() {
    this._razorpay = null;
  }

  /**
   * Lazy-initialize Razorpay SDK Instance with strict credential validation
   */
  getRazorpayClient() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      const error = new Error("Razorpay configuration error: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured in environment.");
      error.statusCode = 500;
      throw error;
    }

    if (!this._razorpay) {
      this._razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    }

    return this._razorpay;
  }

  /**
   * Create Razorpay Order
   */
  async createOrder(amountInINR, receiptId, notes = null) {
    const client = this.getRazorpayClient();
    const options = {
      amount: Math.round(amountInINR * 100), // Amount in paise (e.g. ₹500 = 50000 paise)
      currency: "INR",
      receipt: receiptId,
    };
    if (notes) {
      options.notes = notes;
    }

    return await client.orders.create(options);
  }

  /**
   * Verify Razorpay Payment Signature
   */
  verifyPaymentSignature(orderId, paymentId, signature) {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      const error = new Error("Razorpay configuration error: RAZORPAY_KEY_SECRET is missing for payment signature verification.");
      error.statusCode = 500;
      throw error;
    }

    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body.toString())
      .digest("hex");

    return expectedSignature === signature;
  }

  /**
   * Verify Razorpay Webhook HMAC Signature
   */
  verifyWebhookSignature(rawBody, signature, secret = null) {
    const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!rawBody || !signature) {
      return false;
    }
    if (!webhookSecret) {
      const error = new Error("Razorpay webhook configuration error: RAZORPAY_WEBHOOK_SECRET is not configured.");
      error.statusCode = 500;
      throw error;
    }

    try {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      return expectedSignature === signature;
    } catch (e) {
      return false;
    }
  }

  /**
   * Fetch Razorpay Order by ID
   */
  async fetchOrder(orderId) {
    const client = this.getRazorpayClient();
    return await client.orders.fetch(orderId);
  }

  /**
   * Fetch Razorpay Payment by ID
   */
  async fetchPayment(paymentId) {
    const client = this.getRazorpayClient();
    return await client.payments.fetch(paymentId);
  }
}

export default RazorpayService;
