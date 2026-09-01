import { EntitySchema } from "typeorm";

export const PassengerEntity = new EntitySchema({
  name: "Passenger",
  tableName: "passengers",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    bookingId: {
      type: "uuid",
    },
    seatNumber: {
      type: "varchar",
      length: 10,
    },
    name: {
      type: "varchar",
      length: 100,
    },
    age: {
      type: "int",
    },
    gender: {
      type: "varchar",
      length: 10, // "Male", "Female", "Other"
    },
  },
  relations: {
    booking: {
      target: "Booking",
      type: "many-to-one",
      joinColumn: { name: "bookingId" },
      onDelete: "RESTRICT",
    },
  },
});

export default PassengerEntity;
