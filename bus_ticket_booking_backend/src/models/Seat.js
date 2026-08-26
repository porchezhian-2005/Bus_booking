import { EntitySchema } from "typeorm";

export const SeatEntity = new EntitySchema({
  name: "Seat",
  tableName: "seats",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    tripId: {
      type: "uuid",
    },
    seatNumber: {
      type: "varchar",
      length: 10, // e.g. "L1", "U2", "S15"
    },
    seatType: {
      type: "varchar",
      length: 30, // "SLEEPER_UPPER", "SLEEPER_LOWER", "SEATER"
    },
    price: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
    status: {
      type: "varchar",
      length: 20,
      default: "AVAILABLE", // "AVAILABLE", "BOOKED", "SELECTED"
    },
  },
  relations: {
    trip: {
      target: "Trip",
      type: "many-to-one",
      joinColumn: { name: "tripId" },
      onDelete: "CASCADE",
    },
  },
});

export default SeatEntity;
