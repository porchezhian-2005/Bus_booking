# 🚌 RedBus PRO — End-to-End Enterprise Bus Ticket Booking System

A full-stack, enterprise-grade, high-performance **Bus Ticket Booking & Fleet Management Application** built with **React (Vite + TailwindCSS)** on the frontend and **Node.js, Express.js, TypeORM, and PostgreSQL** on the backend.

---

## 🌟 Key Features

### 👤 1. User Authentication & Profile Management
- **JWT Session Management**: Secure access and refresh token rotation with automated Axios interceptors.
- **User Registration & Login**: Validated registration with phone/email verification capabilities.
- **Profile Management**: Profile page to view user details, transaction history, and referral stats.

### 🚌 2. Bus Search & Real-Time Filtering
- **Interactive Route Search**: Live search by source city, destination, and departure date.
- **Multi-Category Filters**: Instant filtering by bus type (`AC`, `Sleeper`, `Seater`, `All`).
- **Dynamic Sorting**: Sort buses by `💰 Lowest Ticket Fare`, `⏰ Departure Time`, or `💺 Most Seats Available`.
- **Live Seat Availability**: Real-time available seat count tags updated dynamically per trip.

### 💺 3. Interactive Deck Seat Selection Map
- **Dual Deck Layout**: Seamless switching between **Lower Deck** and **Upper Deck** for Sleeper luxury coaches.
- **Seat Status Badges**: Visual distinction for `Available`, `Selected` (Vibrant Red), `Booked` (Disabled), and `Ladies Seats` (Pink).
- **Seat Number Selection**: Interactive clickable seat grid with dynamic pricing based on berth category (`SLEEPER_LOWER`, `SLEEPER_UPPER`, `SEATER`).

### 💳 4. Booking, Wallet & Payment Processing
- **Razorpay Sandbox Integration**: Payment simulation via UPI/GPay, Credit/Debit Card, NetBanking, or RedBus Wallet.
- **RedBus Wallet System**:
  - Wallet balance display in navbar & dedicated Wallet tab.
  - Wallet top-up via payment gateway simulation.
  - Configurable maximum wallet usage percentage (e.g., max 20% fare deduction per booking).
  - Instant wallet cashback and automated 80% refund processing on ticket cancellations.
- **Exclusive Coupon & Wallet Rule Engine**: Enforces strict business rule — coupons and wallet discounts cannot be stacked together.
- **Promo Coupon System**: Validates minimum booking amount, expiration date, and applies percentage/fixed discounts.

### 🎁 5. 2-Way Referral Reward System
- **Unique Referral Codes**: Automatically generated upon registration (e.g., `REF-POR123`).
- **Automated Reward Credit**: Automatically credits **₹500** to the referrer's wallet after the referee completes their first ticket booking.

### 📄 6. PDF E-Ticket & Email Dispatch
- **PDFKit E-Ticket Generation**: Downloads official RedBus PNR E-Tickets with QR code verification graphic.
- **Automated Email Dispatch**: Sends Nodemailer confirmation emails with attached PDF ticket.

### 📊 7. Admin Dashboard & Fleet Management
- **3-Step Guided Operations Workflow**:
  - **Step 1 (Fleet Buses)**: Add and manage fleet buses (`Bus Name`, `Reg No`, `Bus Type`, `Operator`).
  - **Step 2 (Travel Routes)**: Create travel routes (`Source`, `Destination`, `Distance in KM`, `Duration in Hours`).
  - **Step 3 (Schedule Trips)**: Link buses + routes, set departure date/time/arrival, and publish live.
- **Analytics & Financial Reports**: Revenue metrics in Indian currency format (`K`, `L`, `C`), payment gateway breakdown, and booking status progress bars.
- **Booked Passengers Directory**: Detailed directory of all confirmed passenger contacts with **8-items-per-page server and client pagination**.

### ⚡ 8. High-Performance In-Memory API Caching
- **Sub-Millisecond Search Response**: Integrated zero-latency `MemoryCache` (`cache.js`) for trip searches (`< 2ms`).
- **Automated Cache Invalidation**: Flushes stale cache automatically upon new bus registration, trip scheduling, or ticket booking/cancellation.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React.js (Vite)
- **Styling**: Vanilla CSS Design Tokens + TailwindCSS (Glassmorphism, Day/Night/Eye-Shield Modes)
- **State Management**: Redux Toolkit & React Hooks
- **Icons**: Lucide React
- **HTTP Client**: Axios with automatic token refresh interceptors

### Backend
- **Runtime**: Node.js & Express.js
- **ORM & Database**: TypeORM + PostgreSQL
- **Security**: Helmet, Express Rate Limiter, CORS Policy Configuration
- **Authentication**: Passport.js + JWT (JSON Web Tokens)
- **PDF Generation**: PDFKit
- **Email Delivery**: Nodemailer (SMTP / Gmail)
- **API Documentation**: Swagger UI (`/api-docs`)

---

## 📁 Project Structure

```
Bus_ticket_booking/
├── bus_ticket_booking_backend/
│   ├── src/
│   │   ├── config/          # Database, Passport, & Swagger Config
│   │   ├── controller/      # API Controllers
│   │   ├── middleware/      # JWT Authentication & Validation Middlewares
│   │   ├── models/          # TypeORM Entities (Bus, Route, Trip, Seat, Booking, User, Wallet, Coupon)
│   │   ├── routes/          # Express API Routes
│   │   ├── services/        # Business Logic Services
│   │   └── utils/           # MemoryCache, PNR Generator, & Logger
│   ├── .env                 # Backend Environment Variables
│   ├── server.js            # Express Application Entry Point
│   └── package.json
│
└── bus_ticket_booking_frontend/
    ├── src/
    │   ├── components/      # Navbar, Footer, SeatMapModal, Theme Controls
    │   ├── constants/       # Global Configuration & API Base URL
    │   ├── pages/           # Home, AdminDashboard, Checkout, MyBookings, Profile, Wallet, Login, Register
    │   ├── services/        # Axios API Client with Interceptors
    │   ├── store/           # Redux Slices (Auth, Booking, Bus)
    │   └── index.css        # Global CSS, Theme Overrides & Background Bus Image
    ├── public/              # Hero Volvo Bus Background Asset (/hero_bus.jpg)
    ├── .env                 # Frontend Environment Variables (VITE_API_BASE_URL)
    └── package.json
```

---

## ⚙️ Environment Configuration

### Backend `.env` (`bus_ticket_booking_backend/.env`)
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# PostgreSQL Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=root
DB_NAME=bus_booking_db

# Admin Default Credentials
ADMIN_EMAIL=admin@busticket.com
ADMIN_PASSWORD=Admin@123456

# JWT Cryptographic Secrets
JWT_ACCESS_SECRET=a8f9d0c2e4b6173894a05b1c7d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=b7e6f5d4c3b2a109876543210fedcba9876543210fedcba9876543210fedcba9
JWT_REFRESH_EXPIRES_IN=7d

# Nodemailer SMTP Configuration
EMAIL_SERVICE=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=porchezhian.doodleblue@gmail.com
SMTP_PASS=uuat ikiu xxey pxee

# Payment Gateway Sandbox Credentials
RAZORPAY_KEY_ID=rzp_test_TTyQMXAh4sO3t2
RAZORPAY_KEY_SECRET=U35lqA2ZXNh1B7FUYf4puSMF
```

### Frontend `.env` (`bus_ticket_booking_frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: Installed and running locally on port `5432` with database `bus_booking_db` created.

### 2. Backend Setup
```bash
# Navigate to backend directory
cd bus_ticket_booking_backend

# Install dependencies
npm install

# Start backend server in development mode
npm run dev
```
*The backend server will automatically connect to PostgreSQL, synchronize tables, seed initial sample buses/trips if empty, and listen on `http://localhost:5000`.*

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd bus_ticket_booking_frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
*The frontend Vite dev server will run on `http://localhost:5173`.*

---

## 📌 API Endpoints Overview

| Category | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth/register` | `POST` | User registration |
| **Auth** | `/api/auth/login` | `POST` | User login & token dispatch |
| **Buses** | `/api/buses/search` | `GET` | Search trips with filters, sorting & pagination |
| **Buses** | `/api/buses/add-bus` | `POST` | Admin: Add new bus to fleet |
| **Buses** | `/api/buses/add-route` | `POST` | Admin: Create travel route |
| **Buses** | `/api/buses/create-trip` | `POST` | Admin: Link bus + route & schedule trip |
| **Bookings** | `/api/bookings/create` | `POST` | Create booking with wallet/coupon validation |
| **Bookings** | `/api/bookings/my-bookings` | `GET` | Get logged-in user's bookings |
| **Bookings** | `/api/bookings/cancel` | `POST` | Cancel ticket with 80% wallet refund |
| **Tickets** | `/api/tickets/:pnr/pdf` | `GET` | Download official PDF E-Ticket |
| **Wallet** | `/api/wallet/balance` | `GET` | Get user wallet balance & transaction history |
| **Wallet** | `/api/wallet/add-money` | `POST` | Top-up user wallet balance |
| **Coupons** | `/api/coupons/validate` | `POST` | Validate coupon code |
| **System** | `/health` | `GET` | Backend API health check |

---

## 📄 License
This project is open-source and available under the **MIT License**.
