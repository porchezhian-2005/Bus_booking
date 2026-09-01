import { EntitySchema } from "typeorm";

export const BookingEntity = new EntitySchema({
  name: "Booking",
  tableName: "bookings",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    pnr: {
      type: "varchar",
      length: 20,
      unique: true,
    },
    userId: {
      type: "uuid",
    },
    tripId: {
      type: "uuid",
    },
    totalAmount: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
    discountAmount: {
      type: "decimal",
      precision: 10,
      scale: 2,
      default: 0.00,
    },
    walletAmountUsed: {
      type: "decimal",
      precision: 10,
      scale: 2,
      default: 0.00,
    },
    finalAmountPaid: {
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
      length: 20,
      default: "PAID",
    },
    bookingStatus: {
      type: "varchar",
      length: 20,
      default: "CONFIRMED", // "CONFIRMED", "CANCELLED"
    },
    couponCode: {
      type: "varchar",
      length: 50,
      nullable: true,
    },
    boardingPointId: {
      type: "uuid",
      nullable: true,
    },
    droppingPointId: {
      type: "uuid",
      nullable: true,
    },
    boardingPointName: {
      type: "varchar",
      length: 150,
      nullable: true,
    },
    droppingPointName: {
      type: "varchar",
      length: 150,
      nullable: true,
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
    user: {
      target: "User",
      type: "many-to-one",
      joinColumn: { name: "userId" },
      onDelete: "RESTRICT",
    },
    trip: {
      target: "Trip",
      type: "many-to-one",
      joinColumn: { name: "tripId" },
      onDelete: "RESTRICT",
    },
    boardingPoint: {
      target: "RoutePoint",
      type: "many-to-one",
      joinColumn: { name: "boardingPointId" },
      onDelete: "RESTRICT",
      nullable: true,
    },
    droppingPoint: {
      target: "RoutePoint",
      type: "many-to-one",
      joinColumn: { name: "droppingPointId" },
      onDelete: "RESTRICT",
      nullable: true,
    },
    passengers: {
      target: "Passenger",
      type: "one-to-many",
      inverseSide: "booking",
    },
  },
});

export default BookingEntity;
