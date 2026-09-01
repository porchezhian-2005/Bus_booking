import { EntitySchema } from "typeorm";

export const RoutePointEntity = new EntitySchema({
  name: "RoutePoint",
  tableName: "route_points",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    routeId: {
      type: "uuid",
    },
    locationName: {
      type: "varchar",
      length: 150,
    },
    landmark: {
      type: "varchar",
      length: 255,
      nullable: true,
    },
    pointType: {
      type: "enum",
      enum: ["BOARDING", "DROPPING", "BOTH"],
    },
    sequenceOrder: {
      type: "int",
    },
    timeOffsetMinutes: {
      type: "int",
      nullable: true,
    },
    isActive: {
      type: "boolean",
      default: true,
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
  indices: [
    {
      name: "IDX_ROUTE_POINTS_LOOKUP",
      columns: ["routeId", "pointType", "sequenceOrder"],
    },
  ],
  relations: {
    route: {
      target: "Route",
      type: "many-to-one",
      joinColumn: { name: "routeId" },
      onDelete: "RESTRICT",
    },
  },
});

export default RoutePointEntity;
