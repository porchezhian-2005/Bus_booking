import { EntitySchema } from "typeorm";

export const WalletTransactionEntity = new EntitySchema({
  name: "WalletTransaction",
  tableName: "wallet_transactions",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    walletId: {
      type: "uuid",
    },
    userId: {
      type: "uuid",
    },
    amount: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
    type: {
      type: "varchar",
      length: 20, // "CREDIT" or "DEBIT"
    },
    source: {
      type: "varchar",
      length: 50, // "ADD_MONEY", "BOOKING_PAYMENT", "REFUND", "REFERRAL_REWARD"
    },
    description: {
      type: "varchar",
      length: 255,
      nullable: true,
    },
    referenceId: {
      type: "varchar",
      length: 100,
      nullable: true, // Payment ID or Booking ID
    },
    createdAt: {
      type: "timestamp",
      createDate: true,
    },
  },
  relations: {
    wallet: {
      target: "Wallet",
      type: "many-to-one",
      joinColumn: { name: "walletId" },
      onDelete: "CASCADE",
    },
    user: {
      target: "User",
      type: "many-to-one",
      joinColumn: { name: "userId" },
      onDelete: "CASCADE",
    },
  },
});

export default WalletTransactionEntity;
