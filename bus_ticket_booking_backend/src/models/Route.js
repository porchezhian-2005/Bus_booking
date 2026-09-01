import { EntitySchema } from "typeorm";

export const RouteEntity = new EntitySchema({
  name: "Route",
  tableName: "routes",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    source: {
      type: "varchar",
      length: 100,
    },
    destination: {
      type: "varchar",
      length: 100,
    },
    distanceKm: {
      type: "decimal",
      precision: 10,
      scale: 2,
    },
    durationHours: {
      type: "decimal",
      precision: 5,
      scale: 2,
    },
    stops: {
      type: "simple-json", // Array of stop names e.g. ["Stop A", "Stop B"]
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
    points: {
      target: "RoutePoint",
      type: "one-to-many",
      inverseSide: "route",
    },
  },
});

export default RouteEntity;
