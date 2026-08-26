import { EntitySchema } from "typeorm";

export const BusEntity = new EntitySchema({
  name: "Bus",
  tableName: "buses",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    name: {
      type: "varchar",
      length: 100,
    },
    busNumber: {
      type: "varchar",
      length: 50,
      unique: true,
    },
    busType: {
      type: "varchar",
      length: 50, // "AC Sleeper", "Non-AC Sleeper", "AC Seater", "Non-AC Seater"
    },
    totalSeats: {
      type: "int",
      default: 30,
    },
    operatorName: {
      type: "varchar",
      length: 100,
    },
    amenities: {
      type: "simple-array", // e.g. "WiFi,Charging Point,Water Bottle,Blanket"
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
});

export default BusEntity;
