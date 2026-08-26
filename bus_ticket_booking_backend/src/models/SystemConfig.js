import { EntitySchema } from "typeorm";

export const SystemConfigEntity = new EntitySchema({
  name: "SystemConfig",
  tableName: "system_configs",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    walletMaxUsagePercent: {
      type: "decimal",
      precision: 5,
      scale: 2,
      default: 20.00,
    },
    referralAmount: {
      type: "decimal",
      precision: 10,
      scale: 2,
      default: 500.00,
    },
    updatedAt: {
      type: "timestamp",
      updateDate: true,
    },
  },
});

export default SystemConfigEntity;
