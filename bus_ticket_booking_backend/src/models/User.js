import { EntitySchema } from "typeorm";

export const UserEntity = new EntitySchema({
  name: "User",
  tableName: "users",
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
    email: {
      type: "varchar",
      length: 150,
      unique: true,
    },
    phone: {
      type: "varchar",
      length: 20,
      unique: true,
    },
    password: {
      type: "varchar",
    },
    role: {
      type: "varchar",
      default: "user", // "user" or "admin"
    },
    isVerified: {
      type: "boolean",
      default: false,
    },
    emailOtp: {
      type: "varchar",
      nullable: true,
    },
    emailOtpExpires: {
      type: "timestamp",
      nullable: true,
    },
    resetPasswordToken: {
      type: "varchar",
      nullable: true,
    },
    resetPasswordExpires: {
      type: "timestamp",
      nullable: true,
    },
    welcomeEmailSent: {
      type: "boolean",
      default: false,
    },
    referralCode: {
      type: "varchar",
      unique: true,
      nullable: true,
    },
    isLoggedIn: {
      type: "boolean",
      default: false,
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

export default UserEntity;
