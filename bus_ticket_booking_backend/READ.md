# 🚌 Bus Ticket Booking System Backend

A production-ready RESTful API backend built with **Node.js**, **Express**, **TypeORM**, and **PostgreSQL**.

---

## 🌟 Key Features

1. **User Authentication & Authorization**:
   - Email OTP verification before/after registration (1-minute expiration).
   - Passport.js Local Strategy & JWT Access/Refresh tokens.
   - Session-less token blacklisting on logout with database `isLoggedIn` status tracking.
   - Password reset via Email OTP using HTML Handlebars templates.
   - Auto-seeded Super Admin account (`admin@busticket.com`).

2. **Wallet Management System**:
   - User wallet balance tracking & instant wallet creation.
   - Add money to wallet & full transaction history ledger (`CREDIT` / `DEBIT`).
   - Configurable maximum wallet usage percentage during checkout (Default: 20%).

3. **Bus Search & Route Management**:
   - Source, destination, and date-based trip search with bus type filters and price sorting (`price_asc`, `price_desc`).
   - Real-time seat layout availability (Upper/Lower Sleeper & Seater pricing).

4. **Booking & Payment Orchestration**:
   - Seat reservation & 10-digit unique **PNR** generation.
   - Rule enforcement: **Coupons and Wallet cannot be combined on the same booking**.
   - Automated 2-way **₹500 Referral Bonus** credited to both referrer and referee wallets upon 1st booking.

5. **Ticket Management & PDF Generation**:
   - Streamed PDF E-Ticket generation using `PDFKit`.
   - E-Ticket sent via email with PDF attachment and direct download link.
   - Ticket cancellation with an 80% refund credited directly back to the user's wallet.

6. **Interactive OpenAPI Swagger Documentation**:
   - Complete interactive API testing interface at `http://localhost:5000/api-docs`.

---

## 🛠️ Tech Stack & Dependencies

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database & ORM**: PostgreSQL + TypeORM (`EntitySchema`)
- **Authentication**: Passport.js, JWT (`jsonwebtoken`), `bcrypt`
- **Email Engine**: Nodemailer + Handlebars templates (`.hbs`)
- **PDF Generation**: `pdfkit`
- **API Documentation**: `swagger-ui-express` + `swagger-jsdoc`
- **Background Worker**: `node-cron`

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL running locally or on a cloud instance

### 2. Environment Setup
Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Set your PostgreSQL connection details in `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=root
DB_NAME=bus_booking_db
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```

The server will automatically connect to PostgreSQL, synchronize database tables, seed the default Admin user, start background cron jobs, and listen on `http://localhost:5000`.

---

## 📖 API Documentation & Swagger UI

Once the server is running, access the interactive Swagger documentation at:

👉 **[http://localhost:5000/api-docs](http://localhost:5000/api-docs)**

---

## 🔑 Default Admin Credentials

- **Email**: `admin@busticket.com`
- **Password**: `Admin@123456`
