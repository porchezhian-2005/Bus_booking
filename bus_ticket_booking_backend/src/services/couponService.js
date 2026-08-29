/**
 * Coupon Service
 * Handles coupon creation, listing, validation & rule enforcement
 */
export class CouponService {
  constructor(couponModel) {
    this.couponModel = couponModel;
  }

  /**
   * Admin: Create Coupon
   */
  async createCoupon(couponData) {
    const { code, discountType, discountValue, minBookingAmount, expiryDate } = couponData;
    let discountPercent = 10;
    let maxDiscountAmount = 200;

    if (discountType === "PERCENT") {
      discountPercent = parseFloat(discountValue) || 10;
      maxDiscountAmount = 500;
    } else {
      // FIXED AMOUNT DISCOUNT: calculate percent equivalent or set fixed value
      discountPercent = Math.min(parseFloat(discountValue) || 10, 100);
      maxDiscountAmount = parseFloat(discountValue) || 200;
    }

    const coupon = this.couponModel.create({
      code,
      discountPercent,
      maxDiscountAmount,
      minBookingAmount: parseFloat(minBookingAmount) || 0,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString().split("T")[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      isActive: true,
    });
    return await this.couponModel.save(coupon);
  }

  /**
   * Get Active Coupons for Users
   */
  async getActiveCoupons() {
    return await this.couponModel.find({ where: { isActive: true } });
  }

  /**
   * Validate Coupon code & calculate discount
   */
  async validateCoupon(code, bookingAmount, useWallet = false) {
    // ENFORCE RULE: Coupons cannot be used together with Wallet
    if (useWallet) {
      const error = new Error("Coupons and Wallet payment cannot be used together for the same booking.");
      error.statusCode = 400;
      throw error;
    }

    const coupon = await this.couponModel.findOne({ where: { code, isActive: true } });
    if (!coupon) {
      const error = new Error("Invalid or inactive coupon code.");
      error.statusCode = 404;
      throw error;
    }

    // Check expiry date
    const today = new Date().toISOString().split("T")[0];
    if (coupon.expiryDate < today) {
      const error = new Error("Coupon code has expired.");
      error.statusCode = 400;
      throw error;
    }

    // Check minimum booking amount
    if (parseFloat(bookingAmount) < parseFloat(coupon.minBookingAmount)) {
      const error = new Error(`Minimum booking amount to use this coupon is ₹${coupon.minBookingAmount}`);
      error.statusCode = 400;
      throw error;
    }

    // Calculate discount amount
    let discount = (parseFloat(bookingAmount) * parseFloat(coupon.discountPercent)) / 100;
    if (coupon.maxDiscountAmount && discount > parseFloat(coupon.maxDiscountAmount)) {
      discount = parseFloat(coupon.maxDiscountAmount);
    }

    return {
      couponCode: coupon.code,
      discountAmount: discount.toFixed(2),
      finalAmount: (parseFloat(bookingAmount) - discount).toFixed(2),
    };
  }
}

export default CouponService;
