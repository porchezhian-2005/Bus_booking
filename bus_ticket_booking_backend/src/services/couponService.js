/**
 * Coupon Service
 * Handles coupon creation, listing, validation & rule enforcement
 */
export class CouponService {
  constructor(couponModel, bookingModel = null) {
    this.couponModel = couponModel;
    this.bookingModel = bookingModel;
  }

  /**
   * Admin: Create Coupon
   */
  async createCoupon(couponData) {
    const { code, discountType, discountValue, minBookingAmount, expiryDate, maxUsagePerUser } = couponData;
    let discountPercent = 10;
    let maxDiscountAmount = 200;

    if (discountType === "PERCENT") {
      discountPercent = parseFloat(discountValue) || 10;
      maxDiscountAmount = 500;
    } else {
      discountPercent = Math.min(parseFloat(discountValue) || 10, 100);
      maxDiscountAmount = parseFloat(discountValue) || 200;
    }

    const coupon = this.couponModel.create({
      code: code.toUpperCase(),
      discountPercent,
      maxDiscountAmount,
      minBookingAmount: parseFloat(minBookingAmount) || 0,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString().split("T")[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      maxUsagePerUser: parseInt(maxUsagePerUser) || 1,
      isActive: true,
    });
    return await this.couponModel.save(coupon);
  }

  /**
   * Admin: Update Coupon
   */
  async updateCoupon(id, updateData) {
    const coupon = await this.couponModel.findOne({ where: { id } });
    if (!coupon) {
      const error = new Error("Coupon not found");
      error.statusCode = 404;
      throw error;
    }
    Object.assign(coupon, updateData);
    return await this.couponModel.save(coupon);
  }

  /**
   * Admin: Delete Coupon
   */
  async deleteCoupon(id) {
    const coupon = await this.couponModel.findOne({ where: { id } });
    if (!coupon) {
      const error = new Error("Coupon not found");
      error.statusCode = 404;
      throw error;
    }
    return await this.couponModel.remove(coupon);
  }

  /**
   * Get Active Coupons for Users
   */
  async getActiveCoupons() {
    return await this.couponModel.find({ where: { isActive: true } });
  }

  /**
   * Validate Coupon code & calculate discount with Per-User Usage Limit Enforcement
   */
  async validateCoupon(code, bookingAmount, useWallet = false, userId = null, transactionalManager = null) {
    if (!code) {
      const error = new Error("Coupon code is required");
      error.statusCode = 400;
      throw error;
    }

    // ENFORCE RULE: Coupons cannot be used together with Wallet
    if (useWallet) {
      const error = new Error("Coupons and Wallet payment cannot be used together for the same booking.");
      error.statusCode = 400;
      throw error;
    }

    const couponRepo = transactionalManager ? transactionalManager.getRepository(this.couponModel.target || "Coupon") : this.couponModel;
    const coupon = await couponRepo.findOne({ where: { code: code.toUpperCase(), isActive: true } });
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

    // ENFORCE RULE: Per-user usage limit check
    if (userId && this.bookingModel) {
      const bookingRepo = transactionalManager ? transactionalManager.getRepository(this.bookingModel.target || "Booking") : this.bookingModel;
      const userUsageCount = await bookingRepo.count({
        where: {
          userId,
          couponCode: coupon.code,
        },
      });

      const maxLimit = coupon.maxUsagePerUser || 1;
      if (userUsageCount >= maxLimit) {
        const error = new Error(`You have reached the maximum allowed usage limit (${maxLimit}) for coupon code ${coupon.code}`);
        error.statusCode = 400;
        throw error;
      }
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

