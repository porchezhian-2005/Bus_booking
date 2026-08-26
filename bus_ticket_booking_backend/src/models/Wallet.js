import { EntitySchema } from "typeorm";

export const WalletEntity = new EntitySchema({
  name: "Wallet",
  tableName: "wallets",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    userId: {
      type: "uuid",
      unique: true,
    },
    balance: {
      type: "decimal",
      precision: 10,
      scale: 2,
      default: 0.00,
    },
    currency: {
      type: "varchar",
      length: 10,
      default: "INR",
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
      type: "one-to-one",
      joinColumn: { name: "userId" },
      onDelete: "CASCADE",
    },
  },
});

export default WalletEntity;
