import AppDataSource from "../config/database.js";
import CouponEntity from "../models/Coupon.js";
import BookingEntity from "../models/Booking.js";
import CouponService from "../services/couponService.js";

const couponRepository = AppDataSource.getRepository(CouponEntity);
const bookingRepository = AppDataSource.getRepository(BookingEntity);
const couponService = new CouponService(couponRepository, bookingRepository);

export const createCoupon = async (req, res) => {
  try {
    const coupon = await couponService.createCoupon(req.body);
    return res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const coupon = await couponService.updateCoupon(req.params.id, req.body);
    return res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    await couponService.deleteCoupon(req.params.id);
    return res.status(200).json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const getActiveCoupons = async (req, res) => {
  try {
    const coupons = await couponService.getActiveCoupons();
    return res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const { code, bookingAmount, useWallet } = req.body;
    const userId = req.user ? req.user.id : null;
    const result = await couponService.validateCoupon(code, bookingAmount, useWallet, userId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

