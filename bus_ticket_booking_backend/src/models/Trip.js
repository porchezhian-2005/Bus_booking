import { EntitySchema } from "typeorm";

export const TripEntity = new EntitySchema({
  name: "Trip",
  tableName: "trips",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    busId: {
      type: "uuid",
    },
    routeId: {
      type: "uuid",
    },
    departureDate: {
      type: "date",
    },
    departureTime: {
      type: "varchar",
      length: 20, // e.g. "08:00 AM"
    },
    arrivalTime: {
      type: "varchar",
      length: 20, // e.g. "04:00 PM"
    },
    basePrice: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
    status: {
      type: "varchar",
      length: 20,
      default: "SCHEDULED", // "SCHEDULED", "COMPLETED", "CANCELLED"
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
    bus: {
      target: "Bus",
      type: "many-to-one",
      joinColumn: { name: "busId" },
      onDelete: "CASCADE",
    },
    route: {
      target: "Route",
      type: "many-to-one",
      joinColumn: { name: "routeId" },
      onDelete: "CASCADE",
    },
  },
});

export default TripEntity;
