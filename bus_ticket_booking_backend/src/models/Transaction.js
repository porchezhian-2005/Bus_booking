import { EntitySchema } from "typeorm";

export const TransactionEntity = new EntitySchema({
  name: "Transaction",
  tableName: "transactions",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    transactionId: {
      type: "varchar",
      length: 50,
      unique: true,
    },
    userId: {
      type: "uuid",
    },
    bookingId: {
      type: "uuid",
      nullable: true,
    },
    amount: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
    paymentMethod: {
      type: "varchar",
      length: 30, // "WALLET", "GATEWAY", "MIXED"
    },
    paymentStatus: {
      type: "varchar",
      length: 20, // "SUCCESS", "PENDING", "FAILED", "REFUNDED"
    },
    gatewayReferenceId: {
      type: "varchar",
      length: 100,
      nullable: true,
    },
    razorpayOrderId: {
      type: "varchar",
      length: 100,
      nullable: true,
      unique: true,
    },
    orderMetadata: {
      type: "text",
      nullable: true,
    },
    createdAt: {
      type: "timestamp",
      createDate: true,
    },
  },
  relations: {
    user: {
      target: "User",
      type: "many-to-one",
      joinColumn: { name: "userId" },
      onDelete: "CASCADE",
    },
    booking: {
      target: "Booking",
      type: "many-to-one",
      joinColumn: { name: "bookingId" },
      onDelete: "SET NULL",
    },
  },
});

export default TransactionEntity;
