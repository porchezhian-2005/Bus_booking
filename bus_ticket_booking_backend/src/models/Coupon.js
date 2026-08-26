import { EntitySchema } from "typeorm";

export const CouponEntity = new EntitySchema({
  name: "Coupon",
  tableName: "coupons",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    code: {
      type: "varchar",
      length: 50,
      unique: true,
    },
    discountPercent: {
      type: "decimal",
      precision: 5,
      scale: 2,
    },
    maxDiscountAmount: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
    minBookingAmount: {
      type: "decimal",
      precision: 10,
      scale: 2,
      default: 0.00,
    },
    expiryDate: {
      type: "date",
    },
    maxUsagePerUser: {
      type: "int",
      default: 1,
    },
    isActive: {
      type: "boolean",
      default: true,
    },
    createdAt: {
      type: "timestamp",
      createDate: true,
    },
  },
});

export default CouponEntity;
