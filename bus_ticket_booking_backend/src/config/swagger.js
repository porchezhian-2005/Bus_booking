import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Bus Ticket Booking System API",
      version: "1.0.0",
      description:
        "Comprehensive API documentation for Bus Search, Booking, Wallet, Referral, Coupon, and Ticket Management System (Razorpay TEST/SANDBOX Mode).",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT Access Token. Format: Bearer <token>",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "John Doe" },
            email: { type: "string", example: "john@example.com" },
            phone: { type: "string", example: "9876543210" },
            role: { type: "string", enum: ["user", "admin"], example: "user" },
            referralCode: { type: "string", example: "USER6105" },
            isVerified: { type: "boolean", example: true },
          },
        },
        Bus: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Volvo Multi-Axle AC" },
            busNumber: { type: "string", example: "TN-01-AB-1234" },
            busType: { type: "string", example: "AC Sleeper" },
            totalSeats: { type: "integer", example: 30 },
            operatorName: { type: "string", example: "Express Travels" },
          },
        },
        Route: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            source: { type: "string", example: "Chennai" },
            destination: { type: "string", example: "Bangalore" },
            distanceKm: { type: "number", example: 350 },
            durationHours: { type: "number", example: 6.5 },
            stops: {
              type: "array",
              items: { type: "string" },
              example: ["Vellore", "Hosur"],
            },
          },
        },
        Trip: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            busId: { type: "string", format: "uuid" },
            routeId: { type: "string", format: "uuid" },
            departureDate: { type: "string", example: "2026-09-01" },
            departureTime: { type: "string", example: "10:00 PM" },
            arrivalTime: { type: "string", example: "05:00 AM" },
            basePrice: { type: "string", example: "850.00" },
            availableSeats: { type: "integer", example: 24 },
            bus: { $ref: "#/components/schemas/Bus" },
            route: { $ref: "#/components/schemas/Route" },
          },
        },
        Seat: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tripId: { type: "string", format: "uuid" },
            seatNumber: { type: "string", example: "S1" },
            seatType: { type: "string", enum: ["SEATER", "SLEEPER_LOWER", "SLEEPER_UPPER"], example: "SEATER" },
            price: { type: "string", example: "850.00" },
            status: { type: "string", enum: ["AVAILABLE", "BOOKED", "SELECTED"], example: "AVAILABLE" },
            isLadiesSeat: { type: "boolean", example: false },
          },
        },
        Passenger: {
          type: "object",
          required: ["name", "age", "gender"],
          properties: {
            name: { type: "string", example: "John Passenger" },
            age: { type: "integer", example: 28 },
            gender: { type: "string", enum: ["Male", "Female", "Other"], example: "Male" },
            seatNumber: { type: "string", example: "S1" },
          },
        },
        Booking: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            pnr: { type: "string", example: "PNR12345678" },
            userId: { type: "string", format: "uuid" },
            tripId: { type: "string", format: "uuid" },
            totalAmount: { type: "string", example: "1000.00" },
            discountAmount: { type: "string", example: "100.00" },
            walletAmountUsed: { type: "string", example: "200.00" },
            finalAmountPaid: { type: "string", example: "700.00" },
            paymentMethod: { type: "string", enum: ["GATEWAY", "WALLET", "MIXED"], example: "GATEWAY" },
            bookingStatus: { type: "string", enum: ["CONFIRMED", "CANCELLED"], example: "CONFIRMED" },
            couponCode: { type: "string", nullable: true, example: "SAVE10" },
            passengers: {
              type: "array",
              items: { $ref: "#/components/schemas/Passenger" },
            },
          },
        },
        Wallet: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            balance: { type: "string", example: "500.00" },
          },
        },
        WalletTransaction: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            walletId: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            amount: { type: "string", example: "200.00" },
            type: { type: "string", enum: ["CREDIT", "DEBIT"], example: "CREDIT" },
            description: { type: "string", example: "Razorpay wallet top-up" },
            referenceId: { type: "string", example: "RAZORPAY-TOPUP-pay_12345" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Coupon: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            code: { type: "string", example: "SAVE10" },
            discountPercent: { type: "number", example: 10 },
            maxDiscountAmount: { type: "number", example: 200 },
            minBookingAmount: { type: "number", example: 500 },
            expiryDate: { type: "string", example: "2028-12-31" },
            maxUsagePerUser: { type: "integer", example: 1 },
            isActive: { type: "boolean", example: true },
          },
        },
        Referral: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            referrerId: { type: "string", format: "uuid" },
            refereeId: { type: "string", format: "uuid" },
            status: { type: "string", enum: ["PENDING", "SUCCESSFUL"], example: "PENDING" },
            rewardAmount: { type: "number", example: 500 },
            rewardCredited: { type: "boolean", example: false },
          },
        },
        SystemConfig: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            walletMaxUsagePercent: { type: "number", example: 20 },
            referralAmount: { type: "number", example: 500 },
          },
        },
        Transaction: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            transactionId: { type: "string", example: "TXN-123456" },
            userId: { type: "string", format: "uuid" },
            bookingId: { type: "string", format: "uuid", nullable: true },
            amount: { type: "string", example: "850.00" },
            paymentMethod: { type: "string", example: "RAZORPAY_GATEWAY" },
            paymentStatus: { type: "string", example: "SUCCESS" },
            gatewayReferenceId: { type: "string", example: "pay_987654321" },
          },
        },
        ApiResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Operation completed successfully" },
            data: { type: "object" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Error message details" },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js"],
};


const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("Swagger API Documentation available at http://localhost:5000/api-docs");
};

export default setupSwagger;
