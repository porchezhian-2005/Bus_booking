import { EntitySchema } from "typeorm";

export const ReferralEntity = new EntitySchema({
  name: "Referral",
  tableName: "referrals",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    referrerId: {
      type: "uuid",
    },
    refereeId: {
      type: "uuid",
      unique: true,
    },
    referralCode: {
      type: "varchar",
      length: 20,
    },
    status: {
      type: "varchar",
      length: 20,
      default: "PENDING", // "PENDING" or "SUCCESSFUL"
    },
    rewardAmount: {
      type: "decimal",
      precision: 10,
      scale: 2,
      default: 500.00,
    },
    rewardCredited: {
      type: "boolean",
      default: false,
    },
    createdAt: {
      type: "timestamp",
      createDate: true,
    },
    updatedAt: {
      type: "timestamp",
      updateDate: true,
    },
  },
  relations: {
    referrer: {
      target: "User",
      type: "many-to-one",
      joinColumn: { name: "referrerId" },
      onDelete: "CASCADE",
    },
    referee: {
      target: "User",
      type: "one-to-one",
      joinColumn: { name: "refereeId" },
      onDelete: "CASCADE",
    },
  },
});

export default ReferralEntity;
