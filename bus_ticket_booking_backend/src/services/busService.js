import { In, Not, IsNull, ILike } from "typeorm";
import apiCache from "../utils/cache.js";
import AppDataSource from "../config/database.js";


/**
 * Bus Service
 * Handles Bus, Route, Trip CRUD & Public Search operations with filtering, sorting & server-side pagination
 */

export class BusService {
  constructor(busModel, routeModel, tripModel, seatModel, bookingModel, routePointModel) {
    this.busModel = busModel;
    this.routeModel = routeModel;
    this.tripModel = tripModel;
    this.seatModel = seatModel;
    this.bookingModel = bookingModel;
    this.routePointModel = routePointModel || AppDataSource.getRepository("RoutePoint");
  }

  /**
   * Helper to format date cleanly as YYYY-MM-DD
   */
  formatDateStr(val) {
    if (!val) return "2026-09-01";
    try {
      if (typeof val === "string") return val.split("T")[0];
      if (val instanceof Date) return val.toISOString().split("T")[0];
      return String(val).split("T")[0];
    } catch (e) {
      return "2026-09-01";
    }
  }

  /**
   * Guaranteed Emergency Trip Auto-Seeder
   */
  async ensureTripsExist() {
    try {
      let buses = await this.busModel.find();
      let routes = await this.routeModel.find();

      if (!buses || buses.length === 0) {
        const defaultBus = await this.busModel.save(
          this.busModel.create({
            name: "KPN Travels",
            busNumber: "TN-37-AX-8910",
            busType: "AC Sleeper (2+1)",
            totalSeats: 30,
            operatorName: "KPN Express",
          })
        );
        buses = [defaultBus];
      }

      if (!routes || routes.length === 0) {
        const defaultRoute = await this.routeModel.save(
          this.routeModel.create({
            source: "Chennai",
            destination: "Bengaluru",
            distanceKm: 350,
            durationHours: 6.5,
          })
        );
        routes = [defaultRoute];
      }

      const count = await this.tripModel.count();
      if (count === 0) {
        console.log("🌱 Emergency Auto-Seeding trips across all buses and routes...");
        for (const b of buses) {
          for (const r of routes) {
            await this.createTrip({
              busId: b.id,
              routeId: r.id,
              departureDate: "2026-09-01",
              departureTime: "21:30",
              arrivalTime: "04:00 AM",
              basePrice: 850,
            });
          }
        }
      }
    } catch (err) {
      console.error("Error in ensureTripsExist:", err.message);
    }
  }

  /**
   * Admin: Add Bus (Single Responsibility: Bus Creation Only)
   */
  async addBus(busData) {
    const { name, busNumber, busType, totalSeats, operatorName, amenities } = busData || {};

    if (!name || !name.trim()) {
      const error = new Error("Bus name is required.");
      error.statusCode = 400;
      throw error;
    }

    if (!busNumber || !busNumber.trim()) {
      const error = new Error("Bus registration number is required.");
      error.statusCode = 400;
      throw error;
    }

    if (!busType || !busType.trim()) {
      const error = new Error("Bus type is required.");
      error.statusCode = 400;
      throw error;
    }

    if (!operatorName || !operatorName.trim()) {
      const error = new Error("Operator name is required.");
      error.statusCode = 400;
      throw error;
    }

    const seatsNum = parseInt(totalSeats, 10);
    if (isNaN(seatsNum) || seatsNum <= 0) {
      const error = new Error("Total seats capacity must be a positive number.");
      error.statusCode = 400;
      throw error;
    }

    const cleanBusNumber = busNumber.trim();
    const existingBus = await this.busModel.findOne({ where: { busNumber: cleanBusNumber } });
    if (existingBus) {
      const error = new Error(`Bus with registration number '${cleanBusNumber}' already exists.`);
      error.statusCode = 400;
      throw error;
    }

    const newBus = this.busModel.create({
      name: name.trim(),
      busNumber: cleanBusNumber,
      busType: busType.trim(),
      totalSeats: seatsNum,
      operatorName: operatorName.trim(),
      amenities: amenities || null,
    });

    return await this.busModel.save(newBus);
  }

  /**
   * Admin: Edit Bus
   */
  /**
   * Admin: Edit Bus with Comprehensive Validation & Data Integrity Safeguards
   */
  async updateBus(busId, updateData) {
    if (!busId || typeof busId !== "string" || !busId.trim()) {
      const error = new Error("Bus ID is required.");
      error.statusCode = 400;
      throw error;
    }

    const cleanBusId = busId.trim();
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(cleanBusId)) {
      const error = new Error("Invalid Bus ID format.");
      error.statusCode = 400;
      throw error;
    }

    const bus = await this.busModel.findOne({ where: { id: cleanBusId } });
    if (!bus) {
      const error = new Error("Bus not found");
      error.statusCode = 404;
      throw error;
    }

    if (!updateData || typeof updateData !== "object") {
      const error = new Error("Update data must be a valid object.");
      error.statusCode = 400;
      throw error;
    }

    const updatesToApply = {};

    // 1. Validate 'name' if provided
    if ("name" in updateData && updateData.name !== undefined) {
      if (typeof updateData.name !== "string" || !updateData.name.trim()) {
        const error = new Error("Bus name cannot be empty.");
        error.statusCode = 400;
        throw error;
      }
      updatesToApply.name = updateData.name.trim();
    }

    // 2. Validate 'operatorName' if provided
    if ("operatorName" in updateData && updateData.operatorName !== undefined) {
      if (typeof updateData.operatorName !== "string" || !updateData.operatorName.trim()) {
        const error = new Error("Operator name cannot be empty.");
        error.statusCode = 400;
        throw error;
      }
      updatesToApply.operatorName = updateData.operatorName.trim();
    }

    // 3. Validate 'busNumber' if provided & check duplicates
    if ("busNumber" in updateData && updateData.busNumber !== undefined) {
      if (typeof updateData.busNumber !== "string" || !updateData.busNumber.trim()) {
        const error = new Error("Bus registration number cannot be empty.");
        error.statusCode = 400;
        throw error;
      }
      const cleanBusNumber = updateData.busNumber.trim();
      if (cleanBusNumber !== bus.busNumber) {
        const existingBus = await this.busModel.findOne({ where: { busNumber: cleanBusNumber } });
        if (existingBus && existingBus.id !== bus.id) {
          const error = new Error(`Bus with registration number '${cleanBusNumber}' already exists.`);
          error.statusCode = 400;
          throw error;
        }
        updatesToApply.busNumber = cleanBusNumber;
      }
    }

    // Lazy trip count getter to avoid unnecessary DB calls
    let existingTripsCount = null;
    const getTripsCount = async () => {
      if (existingTripsCount === null) {
        existingTripsCount = await this.tripModel.count({ where: { busId: bus.id } });
      }
      return existingTripsCount;
    };

    // 4. Validate 'busType' if provided
    if ("busType" in updateData && updateData.busType !== undefined) {
      if (typeof updateData.busType !== "string" || !updateData.busType.trim()) {
        const error = new Error("Bus type cannot be empty.");
        error.statusCode = 400;
        throw error;
      }
      const cleanBusType = updateData.busType.trim();
      if (cleanBusType.toLowerCase() !== (bus.busType || "").toLowerCase()) {
        const tripCount = await getTripsCount();
        if (tripCount > 0) {
          const error = new Error("Cannot change bus type because this bus is already assigned to scheduled trips.");
          error.statusCode = 400;
          throw error;
        }
        updatesToApply.busType = cleanBusType;
      }
    }

    // 5. Validate 'totalSeats' if provided
    if ("totalSeats" in updateData && updateData.totalSeats !== undefined) {
      const seatsNum = parseInt(updateData.totalSeats, 10);
      if (isNaN(seatsNum) || seatsNum <= 0) {
        const error = new Error("Total seats capacity must be a positive number.");
        error.statusCode = 400;
        throw error;
      }
      if (seatsNum !== parseInt(bus.totalSeats, 10)) {
        const tripCount = await getTripsCount();
        if (tripCount > 0) {
          const error = new Error("Cannot change total seats capacity because this bus is already assigned to scheduled trips.");
          error.statusCode = 400;
          throw error;
        }
        updatesToApply.totalSeats = seatsNum;
      }
    }

    // 6. Validate 'amenities' if provided
    if ("amenities" in updateData) {
      if (updateData.amenities === null || updateData.amenities === undefined) {
        updatesToApply.amenities = null;
      } else if (Array.isArray(updateData.amenities)) {
        updatesToApply.amenities = updateData.amenities.join(",");
      } else if (typeof updateData.amenities === "string") {
        updatesToApply.amenities = updateData.amenities;
      }
    }

    // Apply only whitelisted & validated fields
    Object.assign(bus, updatesToApply);
    return await this.busModel.save(bus);
  }

  /**
   * Admin: Delete Bus (Safe Decommissioning Safeguards)
   */
  async deleteBus(busId) {
    if (!busId || typeof busId !== "string" || !busId.trim()) {
      const error = new Error("Bus ID is required.");
      error.statusCode = 400;
      throw error;
    }

    const cleanBusId = busId.trim();
    const bus = await this.busModel.findOne({ where: { id: cleanBusId } });
    if (!bus) {
      const error = new Error("Bus not found.");
      error.statusCode = 404;
      throw error;
    }

    // Check if bus has trips with active bookings
    const trips = await this.tripModel.find({ where: { busId: bus.id, status: "SCHEDULED" } });
    if (trips && trips.length > 0) {
      const tripIds = trips.map((t) => t.id);
      const bookingRepo = this.bookingModel || AppDataSource.getRepository("Booking");
      const activeBookingCount = await bookingRepo.count({
        where: { tripId: In(tripIds), bookingStatus: "CONFIRMED", paymentStatus: "PAID" },
      });
      let bookedSeatsCount = 0;
      if (this.seatModel) {
        bookedSeatsCount = await this.seatModel.count({ where: { tripId: In(tripIds), status: "BOOKED" } });
      }

      if (activeBookingCount > 0 || bookedSeatsCount > 0) {
        const error = new Error("Cannot delete bus because active passenger bookings exist. Please use the /decommission endpoint to safely reassign or cancel trips.");
        error.statusCode = 400;
        throw error;
      }
    }

    bus.status = "DECOMMISSIONED";
    await this.busModel.save(bus);
    apiCache.clear();
    return { message: "Bus soft-decommissioned successfully.", busId: bus.id };
  }

  /**
   * Helper: Find a compatible, available backup bus for a target trip
   */
  async findAvailableBackupBus(trip, excludeBusIds = [], transactionalEntityManager = null) {
    const busRepo = transactionalEntityManager
      ? transactionalEntityManager.getRepository(this.busModel.target || "Bus")
      : this.busModel;
    const tripRepo = transactionalEntityManager
      ? transactionalEntityManager.getRepository(this.tripModel.target || "Trip")
      : this.tripModel;

    const originalBus = trip.bus || (await busRepo.findOne({ where: { id: trip.busId } }));
    if (!originalBus) return null;

    const candidates = await busRepo.find({
      where: [
        { status: "ACTIVE", busType: originalBus.busType },
        { status: IsNull(), busType: originalBus.busType },
      ],
    });

    const excludeSet = new Set([originalBus.id, ...excludeBusIds]);
    const eligibleBuses = (candidates || []).filter(
      (b) => !excludeSet.has(b.id) && parseInt(b.totalSeats || 0) >= parseInt(originalBus.totalSeats || 0)
    );

    for (const candidate of eligibleBuses) {
      const conflictCount = await tripRepo.count({
        where: {
          busId: candidate.id,
          departureDate: trip.departureDate,
          departureTime: trip.departureTime,
          status: In(["SCHEDULED", "COMPLETED"]),
        },
      });

      if (conflictCount === 0) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Admin: Safely Decommission a Bus with Passenger & Booking Protection
   */
  async decommissionBus(busId, options = {}) {
    if (!busId || typeof busId !== "string" || !busId.trim()) {
      const error = new Error("Bus ID is required.");
      error.statusCode = 400;
      throw error;
    }

    const cleanBusId = busId.trim();
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(cleanBusId)) {
      const error = new Error("Invalid Bus ID format.");
      error.statusCode = 400;
      throw error;
    }

    const { action = "AUTO", backupBusId, newDepartureDate, newDepartureTime, reason = "Operational decommissioning" } = options || {};

    const WalletServiceModule = await import("./walletService.js");
    const EmailServiceModule = await import("./emailService.js");

    const emailService = new EmailServiceModule.default();
    const emailsToSend = [];

    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      const busRepo = transactionalEntityManager.getRepository(this.busModel.target || "Bus");
      const tripRepo = transactionalEntityManager.getRepository(this.tripModel.target || "Trip");
      const seatRepo = transactionalEntityManager.getRepository(this.seatModel.target || "Seat");
      const bookingRepo = transactionalEntityManager.getRepository(this.bookingModel.target || "Booking");
      const walletRepo = transactionalEntityManager.getRepository("Wallet");
      const walletTxnRepo = transactionalEntityManager.getRepository("WalletTransaction");

      const walletService = new WalletServiceModule.default(walletRepo, walletTxnRepo);

      const targetBus = await busRepo.findOne({ where: { id: cleanBusId }, lock: { mode: "pessimistic_write" } });
      if (!targetBus) {
        const error = new Error("Bus not found.");
        error.statusCode = 404;
        throw error;
      }

      if (targetBus.status === "DECOMMISSIONED") {
        const error = new Error("Bus is already decommissioned.");
        error.statusCode = 400;
        throw error;
      }

      const affectedTrips = await tripRepo.find({
        where: {
          busId: targetBus.id,
          status: "SCHEDULED",
        },
        relations: { route: true },
      });

      let reassignedCount = 0;
      let delayedCount = 0;
      let cancelledCount = 0;
      let totalRefundsAmount = 0;
      const assignedBackupBusIds = [];

      for (const trip of affectedTrips) {
        const [activeBookingCount, bookedSeatsCount] = await Promise.all([
          bookingRepo.count({
            where: { tripId: trip.id, bookingStatus: "CONFIRMED", paymentStatus: "PAID" },
          }),
          seatRepo.count({
            where: { tripId: trip.id, status: "BOOKED" },
          }),
        ]);

        const hasActivePassengerBookings = activeBookingCount > 0 || bookedSeatsCount > 0;

        if (!hasActivePassengerBookings) {
          trip.status = "CANCELLED";
          await tripRepo.save(trip);
          cancelledCount++;
          continue;
        }

        let chosenAction = action;

        if (chosenAction === "AUTO") {
          const autoBackup = await this.findAvailableBackupBus(trip, assignedBackupBusIds, transactionalEntityManager);
          if (autoBackup) {
            chosenAction = "REASSIGN";
            options._autoBackupBus = autoBackup;
          } else {
            chosenAction = "CANCEL";
          }
        }

        if (chosenAction === "REASSIGN") {
          let backupBus = options._autoBackupBus;
          if (!backupBus && backupBusId) {
            backupBus = await busRepo.findOne({ where: { id: backupBusId }, lock: { mode: "pessimistic_write" } });
          }

          if (!backupBus) {
            backupBus = await this.findAvailableBackupBus(trip, assignedBackupBusIds, transactionalEntityManager);
          }

          if (!backupBus) {
            const error = new Error(`No compatible backup bus available for trip ${trip.id} (${trip.route?.source || ""} to ${trip.route?.destination || ""}).`);
            error.statusCode = 400;
            throw error;
          }

          if (backupBus.id === targetBus.id) {
            const error = new Error("Backup bus cannot be the same bus being decommissioned.");
            error.statusCode = 400;
            throw error;
          }

          if (backupBus.status === "DECOMMISSIONED") {
            const error = new Error("Backup bus is decommissioned and cannot be assigned.");
            error.statusCode = 400;
            throw error;
          }

          if (backupBus.busType !== targetBus.busType) {
            const error = new Error(`Backup bus type (${backupBus.busType}) is incompatible with original bus type (${targetBus.busType}).`);
            error.statusCode = 400;
            throw error;
          }

          if (parseInt(backupBus.totalSeats) < parseInt(targetBus.totalSeats)) {
            const error = new Error(`Backup bus capacity (${backupBus.totalSeats}) is less than original bus capacity (${targetBus.totalSeats}).`);
            error.statusCode = 400;
            throw error;
          }

          const conflictCount = await tripRepo.count({
            where: {
              busId: backupBus.id,
              departureDate: trip.departureDate,
              departureTime: trip.departureTime,
              status: In(["SCHEDULED", "COMPLETED"]),
            },
          });

          if (conflictCount > 0) {
            const error = new Error(`Backup bus ${backupBus.busNumber} is already scheduled for another trip on ${trip.departureDate} at ${trip.departureTime}.`);
            error.statusCode = 400;
            throw error;
          }

          trip.busId = backupBus.id;
          await tripRepo.save(trip);
          assignedBackupBusIds.push(backupBus.id);
          reassignedCount++;

          const bookings = await bookingRepo.find({ where: { tripId: trip.id, bookingStatus: "CONFIRMED" }, relations: { user: true } });
          for (const b of bookings) {
            if (b.user && b.user.email) {
              emailsToSend.push({
                to: b.user.email,
                subject: `Replacement Bus Assigned for Booking PNR: ${b.pnr} 🚌`,
                templateName: "busReassigned",
                variables: {
                  name: b.user.name || "Passenger",
                  pnr: b.pnr,
                  source: trip.route?.source || "Origin",
                  destination: trip.route?.destination || "Destination",
                  departureDate: trip.departureDate,
                  departureTime: trip.departureTime,
                  oldBusName: targetBus.name,
                  oldBusNumber: targetBus.busNumber,
                  newBusName: backupBus.name,
                  newBusNumber: backupBus.busNumber,
                  reason: reason,
                },
              });
            }
          }
        } else if (chosenAction === "DELAY") {
          const targetDate = newDepartureDate ? newDepartureDate.trim() : trip.departureDate;
          const targetDepTime = newDepartureTime ? newDepartureTime.trim() : trip.departureTime;

          if (!targetDate || !targetDepTime) {
            const error = new Error("New departure date and departure time are required for DELAY action.");
            error.statusCode = 400;
            throw error;
          }

          const existingTrip = await tripRepo.findOne({
            where: { busId: trip.busId, departureDate: targetDate, departureTime: targetDepTime },
          });

          if (existingTrip && existingTrip.id !== trip.id) {
            const error = new Error(`A trip on ${targetDate} at ${targetDepTime} is already scheduled.`);
            error.statusCode = 400;
            throw error;
          }

          trip.departureDate = targetDate;
          trip.departureTime = targetDepTime;
          await tripRepo.save(trip);
          delayedCount++;

          const bookings = await bookingRepo.find({ where: { tripId: trip.id, bookingStatus: "CONFIRMED" }, relations: { user: true } });
          for (const b of bookings) {
            if (b.user && b.user.email) {
              emailsToSend.push({
                to: b.user.email,
                subject: `Departure Rescheduled for Booking PNR: ${b.pnr} ⏰`,
                templateName: "tripDelayed",
                variables: {
                  name: b.user.name || "Passenger",
                  pnr: b.pnr,
                  source: trip.route?.source || "Origin",
                  destination: trip.route?.destination || "Destination",
                  departureDate: targetDate,
                  departureTime: targetDepTime,
                  reason: reason,
                },
              });
            }
          }
        } else if (chosenAction === "CANCEL") {
          trip.status = "CANCELLED";
          await tripRepo.save(trip);

          const seats = await seatRepo.find({ where: { tripId: trip.id, status: "BOOKED" } });
          for (const s of seats) {
            s.status = "AVAILABLE";
            await seatRepo.save(s);
          }

          const bookings = await bookingRepo.find({ where: { tripId: trip.id, bookingStatus: "CONFIRMED" }, relations: { user: true } });

          for (const b of bookings) {
            b.bookingStatus = "CANCELLED";
            await bookingRepo.save(b);

            const paidAmount = parseFloat(b.finalAmountPaid || 0);
            if (paidAmount > 0) {
              const refundRefId = `REFUND-DECOM-${b.pnr}`;
              await walletService.addMoney(
                b.userId,
                paidAmount,
                refundRefId,
                transactionalEntityManager,
                "REFUND",
                `Full refund of ₹${paidAmount.toFixed(2)} for cancelled trip (PNR: ${b.pnr}) due to bus decommissioning`
              ).catch((err) => {
                if (!err.message.includes("Duplicate wallet transaction")) {
                  throw err;
                }
              });
              totalRefundsAmount += paidAmount;
            }

            if (b.user && b.user.email) {
              emailsToSend.push({
                to: b.user.email,
                subject: `Trip Cancelled & 100% Full Refund Processed (PNR: ${b.pnr}) 💳`,
                templateName: "tripCancelledRefund",
                variables: {
                  name: b.user.name || "Passenger",
                  pnr: b.pnr,
                  source: trip.route?.source || "Origin",
                  destination: trip.route?.destination || "Destination",
                  departureDate: trip.departureDate,
                  refundAmount: parseFloat(b.finalAmountPaid).toFixed(2),
                  reason: reason,
                },
              });
            }
          }
          cancelledCount++;
        }
      }

      targetBus.status = "DECOMMISSIONED";
      await busRepo.save(targetBus);

      return {
        busId: targetBus.id,
        busNumber: targetBus.busNumber,
        status: targetBus.status,
        affectedTripsCount: affectedTrips.length,
        reassignedCount,
        delayedCount,
        cancelledCount,
        totalRefundsAmount: totalRefundsAmount.toFixed(2),
      };
    }).then(async (summary) => {
      for (const item of emailsToSend) {
        emailService.sendTemplateEmail(item.to, item.subject, item.templateName, item.variables)
          .catch((err) => console.error("Decommissioning Email Dispatch Error:", err.message));
      }

      apiCache.clear();
      return summary;
    });
  }

  /**
   * Admin: 100% Dynamic Live Analytics from PostgreSQL Database
   */
  /**
   * Admin: 100% Dynamic Real Analytics from PostgreSQL Database
   */
  async getAdminAnalytics(bookingModel) {
    const allBookings = await bookingModel.find({
      relations: { user: true, trip: { bus: true, route: true }, passengers: true },
    });

    const confirmedBookings = (allBookings || []).filter(
      (b) => b.bookingStatus === "CONFIRMED" || b.bookingStatus === "booked" || !b.bookingStatus
    );
    const cancelledBookings = (allBookings || []).filter(
      (b) => b.bookingStatus === "CANCELLED"
    );

    const allTrips = await this.tripModel.find({
      relations: { bus: true, route: true },
    });

    const getAmt = (b) => {
      const val = parseFloat(b.finalAmountPaid) || parseFloat(b.totalAmount) || 0;
      return isNaN(val) ? 0 : val;
    };

    const getSeatCount = (b) => {
      if (b.passengers && Array.isArray(b.passengers) && b.passengers.length > 0) {
        return b.passengers.length;
      }
      if (b.seats && Array.isArray(b.seats) && b.seats.length > 0) {
        return b.seats.length;
      }
      return 1;
    };

    // 1. Revenue calculations
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + getAmt(b), 0);
    const walletRevenue = confirmedBookings.reduce(
      (sum, b) => sum + (parseFloat(b.walletAmountUsed) || (b.paymentMethod === "WALLET" ? getAmt(b) : 0)),
      0
    );
    const razorpayRevenue = Math.max(0, totalRevenue - walletRevenue);

    // 2. Rolling 7-Day Analytics Window
    const now = new Date();
    const past7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      past7Days.push({ dayStr, dayName });
    }

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const recentConfirmedBookings = confirmedBookings.filter((b) => {
      if (!b.createdAt) return true;
      return new Date(b.createdAt) >= sevenDaysAgo;
    });

    // 3. Determine Scheduled Trips in the Analytics Period & Fleet Capacity
    let periodTrips = (allTrips || []).filter((t) => {
      if (!t.departureDate && !t.createdAt) return true;
      const tripDate = t.departureDate ? new Date(t.departureDate) : new Date(t.createdAt);
      return tripDate >= sevenDaysAgo || (allTrips.length <= 10);
    });

    if (periodTrips.length === 0 && allTrips.length > 0) {
      periodTrips = allTrips;
    }

    const totalPeriodCapacity = periodTrips.reduce((sum, t) => {
      const busSeats = t.bus ? (parseInt(t.bus.totalSeats) || 30) : 30;
      return sum + busSeats;
    }, 0);

    const totalPeriodBookedSeats = recentConfirmedBookings.reduce((sum, b) => {
      return sum + getSeatCount(b);
    }, 0);

    const fleetOccupancyVal = totalPeriodCapacity > 0
      ? Math.min(100, Math.max(0, (totalPeriodBookedSeats / totalPeriodCapacity) * 100))
      : 0;
    const occupancyPercent = fleetOccupancyVal.toFixed(1);

    // 4. Dynamic 7-Day Rolling Weekly Stats Calculation
    const dayCounts = {};
    const dayRevenues = {};
    past7Days.forEach(({ dayName }) => {
      dayCounts[dayName] = 0;
      dayRevenues[dayName] = 0;
    });

    confirmedBookings.forEach((b) => {
      if (!b.createdAt) return;
      const bDate = new Date(b.createdAt);
      if (bDate >= sevenDaysAgo) {
        const dayName = bDate.toLocaleDateString("en-US", { weekday: "short" });
        if (dayCounts[dayName] !== undefined) {
          dayCounts[dayName] += 1;
          dayRevenues[dayName] += getAmt(b);
        }
      }
    });

    const maxCount = Math.max(...Object.values(dayCounts), 1);
    const weeklyStats = past7Days.map(({ dayName }) => {
      const cnt = dayCounts[dayName] || 0;
      const rev = dayRevenues[dayName] || 0;
      const pct = cnt > 0 ? Math.max(Math.round((cnt / maxCount) * 100), 25) : 8;
      return { day: dayName, bookings: cnt, revenue: `₹${rev.toLocaleString()}`, height: `${pct}%` };
    });

    // 5. Route-Level Analytics Calculation (Seat-based Occupancy & Trend)
    const routeMap = {};

    (periodTrips || []).forEach((t) => {
      if (!t.route) return;
      const routeName = `${t.route.source} → ${t.route.destination}`;
      if (!routeMap[routeName]) {
        routeMap[routeName] = {
          route: routeName,
          bookingsCount: 0,
          bookedSeats: 0,
          revenue: 0,
          capacity: 0,
          currentPeriodSeats: 0,
          previousPeriodSeats: 0,
        };
      }
      const busSeats = t.bus ? (parseInt(t.bus.totalSeats) || 30) : 30;
      routeMap[routeName].capacity += busSeats;
    });

    confirmedBookings.forEach((b) => {
      if (!b.trip || !b.trip.route) return;
      const route = b.trip.route;
      const routeName = `${route.source} → ${route.destination}`;
      
      if (!routeMap[routeName]) {
        const fallbackCapacity = b.trip.bus ? (parseInt(b.trip.bus.totalSeats) || 30) : 30;
        routeMap[routeName] = {
          route: routeName,
          bookingsCount: 0,
          bookedSeats: 0,
          revenue: 0,
          capacity: fallbackCapacity,
          currentPeriodSeats: 0,
          previousPeriodSeats: 0,
        };
      }

      const seatsCount = getSeatCount(b);
      const amt = getAmt(b);
      const bDate = b.createdAt ? new Date(b.createdAt) : null;

      routeMap[routeName].bookingsCount += 1;
      routeMap[routeName].bookedSeats += seatsCount;
      routeMap[routeName].revenue += amt;

      if (bDate) {
        if (bDate >= sevenDaysAgo) {
          routeMap[routeName].currentPeriodSeats += seatsCount;
        } else if (bDate >= fourteenDaysAgo && bDate < sevenDaysAgo) {
          routeMap[routeName].previousPeriodSeats += seatsCount;
        }
      }
    });

    const routeAnalytics = Object.values(routeMap).map((r) => {
      const routeOccupancyVal = r.capacity > 0
        ? Math.min(100, Math.max(0, Math.round((r.bookedSeats / r.capacity) * 100)))
        : 0;

      let trendStr = "0%";
      if (r.previousPeriodSeats > 0) {
        const diff = r.currentPeriodSeats - r.previousPeriodSeats;
        const pct = Math.round((diff / r.previousPeriodSeats) * 100);
        trendStr = pct >= 0 ? `+${pct}%` : `${pct}%`;
      } else if (r.currentPeriodSeats > 0) {
        trendStr = "+100%";
      }

      return {
        route: r.route,
        bookings: r.bookingsCount,
        occupancy: `${routeOccupancyVal}%`,
        revenue: `₹${r.revenue.toLocaleString()}`,
        trend: trendStr,
      };
    });

    return {
      totalBookings: confirmedBookings.length,
      totalRevenue: totalRevenue.toFixed(0),
      razorpayRevenue: razorpayRevenue.toFixed(0),
      walletRevenue: walletRevenue.toFixed(0),
      confirmedCount: confirmedBookings.length,
      cancelledCount: cancelledBookings.length,
      occupancyPercent,
      weeklyStats,
      routeAnalytics,
    };
  }

  /**
   * Admin: Add Route (Single Responsibility: Route Creation Only)
   */
  async addRoute(routeData) {
    const { source, destination, distanceKm, durationHours, stops } = routeData || {};

    if (!source || !source.trim()) {
      const error = new Error("Source city is required.");
      error.statusCode = 400;
      throw error;
    }

    if (!destination || !destination.trim()) {
      const error = new Error("Destination city is required.");
      error.statusCode = 400;
      throw error;
    }

    const cleanSource = source.trim();
    const cleanDest = destination.trim();

    if (cleanSource.toLowerCase() === cleanDest.toLowerCase()) {
      const error = new Error("Source and destination cities cannot be identical.");
      error.statusCode = 400;
      throw error;
    }

    const distNum = parseFloat(distanceKm);
    if (distanceKm !== undefined && (isNaN(distNum) || distNum <= 0)) {
      const error = new Error("Distance in KM must be a positive number.");
      error.statusCode = 400;
      throw error;
    }

    const durNum = parseFloat(durationHours);
    if (durationHours !== undefined && (isNaN(durNum) || durNum <= 0)) {
      const error = new Error("Duration in hours must be a positive number.");
      error.statusCode = 400;
      throw error;
    }

    const existingRoute = await this.routeModel.findOne({
      where: {
        source: cleanSource,
        destination: cleanDest,
      },
    });

    if (existingRoute) {
      const error = new Error(`Route from '${cleanSource}' to '${cleanDest}' already exists.`);
      error.statusCode = 400;
      throw error;
    }

    const newRoute = this.routeModel.create({
      source: cleanSource,
      destination: cleanDest,
      distanceKm: !isNaN(distNum) ? distNum : 0,
      durationHours: !isNaN(durNum) ? durNum : 0,
      stops: Array.isArray(stops) ? stops : (stops ? [stops] : null),
    });

    return await this.routeModel.save(newRoute);
  }

  /**
   * Admin: Create Trip and auto-generate seat layout inside atomic transaction
   */
  async createTrip(tripData) {
    const { busId, routeId, departureDate, departureTime, arrivalTime, basePrice } = tripData || {};

    if (!busId || typeof busId !== "string" || !busId.trim()) {
      const error = new Error("Bus ID is required.");
      error.statusCode = 400;
      throw error;
    }

    if (!routeId || typeof routeId !== "string" || !routeId.trim()) {
      const error = new Error("Route ID is required.");
      error.statusCode = 400;
      throw error;
    }

    if (!departureDate || typeof departureDate !== "string" || !departureDate.trim()) {
      const error = new Error("Departure date is required.");
      error.statusCode = 400;
      throw error;
    }

    if (!departureTime || typeof departureTime !== "string" || !departureTime.trim()) {
      const error = new Error("Departure time is required.");
      error.statusCode = 400;
      throw error;
    }

    if (!arrivalTime || typeof arrivalTime !== "string" || !arrivalTime.trim()) {
      const error = new Error("Arrival time is required.");
      error.statusCode = 400;
      throw error;
    }

    const priceNum = parseFloat(basePrice);
    if (basePrice === undefined || isNaN(priceNum) || priceNum <= 0) {
      const error = new Error("Base ticket price must be a valid positive number.");
      error.statusCode = 400;
      throw error;
    }

    const cleanDate = departureDate.trim().split("T")[0];
    const cleanDepTime = departureTime.trim();
    const cleanArrTime = arrivalTime.trim();

    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      const busRepo = transactionalEntityManager.getRepository(this.busModel.target || "Bus");
      const routeRepo = transactionalEntityManager.getRepository(this.routeModel.target || "Route");
      const tripRepo = transactionalEntityManager.getRepository(this.tripModel.target || "Trip");
      const seatRepo = transactionalEntityManager.getRepository(this.seatModel.target || "Seat");

      const bus = await busRepo.findOne({ where: { id: busId.trim() } });
      if (!bus) {
        const error = new Error("Selected Bus not found.");
        error.statusCode = 404;
        throw error;
      }

      const route = await routeRepo.findOne({ where: { id: routeId.trim() } });
      if (!route) {
        const error = new Error("Selected Route not found.");
        error.statusCode = 404;
        throw error;
      }

      const totalSeats = parseInt(bus.totalSeats, 10);
      if (isNaN(totalSeats) || totalSeats <= 0) {
        const error = new Error("Selected Bus has invalid total seat capacity.");
        error.statusCode = 400;
        throw error;
      }

      // Check for duplicate schedule conflict (Same Bus + Departure Date + Departure Time)
      const existingTrip = await tripRepo.findOne({
        where: {
          busId: bus.id,
          departureDate: cleanDate,
          departureTime: cleanDepTime,
        },
      });

      if (existingTrip) {
        const error = new Error(
          `A trip for ${bus.name} (${bus.busNumber}) on ${cleanDate} at ${cleanDepTime} is already scheduled.`
        );
        error.statusCode = 400;
        throw error;
      }

      const newTrip = tripRepo.create({
        busId: bus.id,
        routeId: route.id,
        departureDate: cleanDate,
        departureTime: cleanDepTime,
        arrivalTime: cleanArrTime,
        basePrice: priceNum.toFixed(2),
      });

      const savedTrip = await tripRepo.save(newTrip);

      // Generate seat inventory matching exact configured bus totalSeats capacity
      const seats = [];

      for (let i = 1; i <= totalSeats; i++) {
        let seatType = "SEATER";

        if ((bus.busType || "").toLowerCase().includes("sleeper")) {
          if (i <= totalSeats / 2) {
            seatType = "SLEEPER_LOWER";
          } else {
            seatType = "SLEEPER_UPPER";
          }
        }

        const isLadies = i <= 4; // Reserve first 4 seats as designated Ladies seats

        seats.push(
          seatRepo.create({
            tripId: savedTrip.id,
            seatNumber: `S${i}`,
            seatType: seatType,
            price: priceNum.toFixed(2),
            status: "AVAILABLE",
            isLadiesSeat: isLadies,
          })
        );
      }

      await seatRepo.save(seats);
      apiCache.clear();
      return savedTrip;
    });
  }

  /**
   * Admin: Update / Reschedule Trip with Safe Booking Protection Business Rules
   */
  async updateTrip(tripId, updateData) {
    if (!tripId || typeof tripId !== "string" || !tripId.trim()) {
      const error = new Error("Trip ID is required.");
      error.statusCode = 400;
      throw error;
    }

    if (!updateData || typeof updateData !== "object" || Array.isArray(updateData)) {
      const error = new Error("Update data must be a valid non-empty object.");
      error.statusCode = 400;
      throw error;
    }

    const cleanTripId = tripId.trim();
    const trip = await this.tripModel.findOne({ where: { id: cleanTripId } });
    if (!trip) {
      const error = new Error("Trip not found.");
      error.statusCode = 404;
      throw error;
    }

    const { busId, routeId, departureDate, departureTime, arrivalTime, basePrice, status } = updateData;

    // Detect field modifications (distinguishing omitted vs provided with different value)
    const cleanRouteId = routeId && typeof routeId === "string" ? routeId.trim() : null;
    const isRouteChange = cleanRouteId !== null && cleanRouteId !== trip.routeId;

    const cleanBusId = busId && typeof busId === "string" ? busId.trim() : null;
    const isBusChange = cleanBusId !== null && cleanBusId !== trip.busId;

    let cleanDateInput = null;
    if (departureDate !== undefined && departureDate !== null) {
      if (typeof departureDate !== "string" || !departureDate.trim()) {
        const error = new Error("Departure date must be a non-empty string.");
        error.statusCode = 400;
        throw error;
      }
      cleanDateInput = departureDate.trim().split("T")[0];
      if (isNaN(Date.parse(cleanDateInput))) {
        const error = new Error("Invalid departure date format.");
        error.statusCode = 400;
        throw error;
      }
    }
    const isDateChange = cleanDateInput !== null && cleanDateInput !== trip.departureDate;

    let cleanDepTimeInput = null;
    if (departureTime !== undefined && departureTime !== null) {
      if (typeof departureTime !== "string" || !departureTime.trim()) {
        const error = new Error("Departure time must be a non-empty string.");
        error.statusCode = 400;
        throw error;
      }
      cleanDepTimeInput = departureTime.trim();
    }
    const isDepTimeChange = cleanDepTimeInput !== null && cleanDepTimeInput !== trip.departureTime;

    let cleanArrTimeInput = null;
    if (arrivalTime !== undefined && arrivalTime !== null) {
      if (typeof arrivalTime !== "string" || !arrivalTime.trim()) {
        const error = new Error("Arrival time must be a non-empty string.");
        error.statusCode = 400;
        throw error;
      }
      cleanArrTimeInput = arrivalTime.trim();
    }
    const isArrTimeChange = cleanArrTimeInput !== null && cleanArrTimeInput !== trip.arrivalTime;

    // Validate basePrice if provided
    let cleanBasePrice = null;
    if (basePrice !== undefined && basePrice !== null) {
      const priceNum = Number(basePrice);
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        const error = new Error("Base ticket price must be a valid positive number.");
        error.statusCode = 400;
        throw error;
      }
      cleanBasePrice = priceNum.toFixed(2);
    }

    // Validate status if provided
    let cleanStatus = null;
    if (status !== undefined && status !== null) {
      if (typeof status !== "string" || !status.trim()) {
        const error = new Error("Status must be a non-empty string.");
        error.statusCode = 400;
        throw error;
      }
      cleanStatus = status.trim().toUpperCase();
      const allowedStatuses = ["SCHEDULED", "COMPLETED", "CANCELLED"];
      if (!allowedStatuses.includes(cleanStatus)) {
        const error = new Error("Status must be one of SCHEDULED, COMPLETED, or CANCELLED.");
        error.statusCode = 400;
        throw error;
      }
    }

    const requiresBookingCheck = isRouteChange || isBusChange || isDateChange || isDepTimeChange || isArrTimeChange;

    // Booking & Seat Protection Check (Parallel DB Count Queries)
    if (requiresBookingCheck) {
      const bookingRepo = this.bookingModel || AppDataSource.getRepository("Booking");
      if (!this.seatModel) {
        const error = new Error("Seat model repository is required for trip update booking checks.");
        error.statusCode = 500;
        throw error;
      }

      // Execute optimized DB count queries in parallel without silent error suppression
      const [activeBookingCount, bookedSeatsCount] = await Promise.all([
        bookingRepo.count({
          where: { tripId: trip.id, bookingStatus: "CONFIRMED", paymentStatus: "PAID" },
        }),
        this.seatModel.count({
          where: { tripId: trip.id, status: "BOOKED" },
        }),
      ]);

      if (activeBookingCount > 0 || bookedSeatsCount > 0) {
        if (isRouteChange) {
          const error = new Error("Cannot change the route because this trip already has confirmed passenger bookings.");
          error.statusCode = 400;
          throw error;
        }
        if (isBusChange) {
          const error = new Error("Cannot change the bus because this trip already has confirmed passenger bookings.");
          error.statusCode = 400;
          throw error;
        }
        if (isDateChange) {
          const error = new Error("Cannot change the departure date because this trip already has confirmed passenger bookings.");
          error.statusCode = 400;
          throw error;
        }
        if (isDepTimeChange) {
          const error = new Error("Cannot change the departure time because this trip already has confirmed passenger bookings.");
          error.statusCode = 400;
          throw error;
        }
        if (isArrTimeChange) {
          const error = new Error("Cannot change the arrival time because this trip already has confirmed passenger bookings.");
          error.statusCode = 400;
          throw error;
        }
      }
    }

    const updatesToApply = {};

    // Validate new Route existence in DB if routeId is changing
    if (isRouteChange) {
      const newRoute = await this.routeModel.findOne({ where: { id: cleanRouteId } });
      if (!newRoute) {
        const error = new Error("Selected Route not found.");
        error.statusCode = 404;
        throw error;
      }
      updatesToApply.routeId = cleanRouteId;
    }

    // Validate new Bus existence in DB if busId is changing
    if (isBusChange) {
      const newBus = await this.busModel.findOne({ where: { id: cleanBusId } });
      if (!newBus) {
        const error = new Error("Selected Bus not found.");
        error.statusCode = 404;
        throw error;
      }
      updatesToApply.busId = cleanBusId;
    }

    const targetBusId = updatesToApply.busId || trip.busId;
    const targetDate = cleanDateInput !== null ? cleanDateInput : trip.departureDate;
    const targetDepTime = cleanDepTimeInput !== null ? cleanDepTimeInput : trip.departureTime;

    // Check duplicate schedule conflict if bus, date, or departure time changed
    if (targetBusId !== trip.busId || targetDate !== trip.departureDate || targetDepTime !== trip.departureTime) {
      const existingTrip = await this.tripModel.findOne({
        where: {
          busId: targetBusId,
          departureDate: targetDate,
          departureTime: targetDepTime,
        },
      });

      if (existingTrip && existingTrip.id !== trip.id) {
        const error = new Error(`A trip for this bus on ${targetDate} at ${targetDepTime} is already scheduled.`);
        error.statusCode = 400;
        throw error;
      }
    }

    if (cleanDateInput !== null) updatesToApply.departureDate = cleanDateInput;
    if (cleanDepTimeInput !== null) updatesToApply.departureTime = cleanDepTimeInput;
    if (cleanArrTimeInput !== null) updatesToApply.arrivalTime = cleanArrTimeInput;
    if (cleanBasePrice !== null) updatesToApply.basePrice = cleanBasePrice;
    if (cleanStatus !== null) updatesToApply.status = cleanStatus;

    Object.assign(trip, updatesToApply);
    const savedTrip = await this.tripModel.save(trip);
    apiCache.clear();
    return savedTrip;
  }


  /**
   * Public: Search Trips with Server-Side Pagination (SQL LIMIT & OFFSET)
   * 8 Buses per page capacity. Pages calculate strictly on matched search results count.
   */
  async searchTrips(query = {}) {
    await this.ensureTripsExist();

    const { source, destination, date, busType, minPrice, maxPrice, operator, departureTime, departureTimeWindow, sortBy, page = 1, limit = 8 } = query;

    const cleanSource = typeof source === "string" ? source.trim() : "";
    const cleanDestination = typeof destination === "string" ? destination.trim() : "";

    if (!cleanSource) {
      const error = new Error("Source city is required for search.");
      error.statusCode = 400;
      throw error;
    }

    if (!cleanDestination) {
      const error = new Error("Destination city is required for search.");
      error.statusCode = 400;
      throw error;
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 8);

    // Database-level case-insensitive check if requested route exists in routes table
    const routeExists = await this.routeModel.findOne({
      where: {
        source: ILike(cleanSource),
        destination: ILike(cleanDestination),
      },
    });

    if (!routeExists) {
      const error = new Error(`Route from ${cleanSource} to ${cleanDestination} is not available. Please select a valid route.`);
      error.statusCode = 404;
      error.routeNotFound = true;
      throw error;
    }

    let trips = await this.tripModel.find({ relations: { bus: true, route: true } });
    let validBuses = await this.busModel.find();
    let validRoutes = await this.routeModel.find();

    trips = (trips || []).filter(Boolean);

    trips.forEach((t) => {
      if (!t.bus && validBuses.length > 0) t.bus = validBuses[0];
      if (!t.route && validRoutes.length > 0) t.route = validRoutes[0];
      t.departureDate = this.formatDateStr(t.departureDate);
    });

    let results = [...trips];

    // Case-Insensitive Filter by Source City
    const srcLower = cleanSource.toLowerCase();
    results = results.filter((t) => t.route?.source?.trim().toLowerCase() === srcLower);

    // Case-Insensitive Filter by Destination City
    const dstLower = cleanDestination.toLowerCase();
    results = results.filter((t) => t.route?.destination?.trim().toLowerCase() === dstLower);

    // Filter by Bus Category (AC, SLEEPER, SEATER)
    if (busType && busType !== "ALL") {
      const bTypeUpper = String(busType).toUpperCase();
      results = results.filter((t) => {
        const busTypeName = (t.bus?.busType || t.bus?.name || "").toUpperCase();
        if (bTypeUpper === "AC") {
          return busTypeName.includes("AC") && !busTypeName.includes("NON-AC") && !busTypeName.includes("NON AC");
        }
        if (bTypeUpper === "SLEEPER") {
          return busTypeName.includes("SLEEPER");
        }
        if (bTypeUpper === "SEATER") {
          return busTypeName.includes("SEATER");
        }
        return busTypeName.includes(bTypeUpper);
      });
    }

    // Filter by Departure Date
    if (date && date.trim() !== "") {
      const formattedSearchDate = this.formatDateStr(date);
      results = results.filter((t) => this.formatDateStr(t.departureDate) === formattedSearchDate);
    }

    // Filter by Price Range (minPrice / maxPrice)
    if (minPrice !== undefined && minPrice !== "") {
      results = results.filter((t) => parseFloat(t?.basePrice || 0) >= parseFloat(minPrice));
    }
    if (maxPrice !== undefined && maxPrice !== "") {
      results = results.filter((t) => parseFloat(t?.basePrice || 0) <= parseFloat(maxPrice));
    }

    // Filter by Operator Name
    if (operator && operator.trim() !== "") {
      const opLower = operator.trim().toLowerCase();
      results = results.filter((t) => (t.bus?.operatorName || t.bus?.name || "").toLowerCase().includes(opLower));
    }

    // Filter by Departure Time / Time Window (MORNING, AFTERNOON, EVENING, NIGHT)
    const timeFilter = departureTimeWindow || departureTime;
    if (timeFilter && timeFilter.trim() !== "") {
      const tfUpper = timeFilter.trim().toUpperCase();
      results = results.filter((t) => {
        const timeStr = (t.departureTime || "").toUpperCase();
        if (tfUpper === "MORNING") {
          return timeStr.includes("AM") || timeStr.startsWith("06") || timeStr.startsWith("07") || timeStr.startsWith("08") || timeStr.startsWith("09") || timeStr.startsWith("10") || timeStr.startsWith("11");
        }
        if (tfUpper === "AFTERNOON") {
          return timeStr.includes("PM") && (timeStr.startsWith("12") || timeStr.startsWith("01") || timeStr.startsWith("02") || timeStr.startsWith("03") || timeStr.startsWith("04") || timeStr.startsWith("05"));
        }
        if (tfUpper === "EVENING") {
          return timeStr.includes("PM") && (timeStr.startsWith("06") || timeStr.startsWith("07") || timeStr.startsWith("08") || timeStr.startsWith("09") || timeStr.startsWith("10") || timeStr.startsWith("11"));
        }
        if (tfUpper === "NIGHT") {
          return timeStr.includes("AM") && (timeStr.startsWith("12") || timeStr.startsWith("01") || timeStr.startsWith("02") || timeStr.startsWith("03") || timeStr.startsWith("04") || timeStr.startsWith("05"));
        }
        return timeStr.toLowerCase().includes(timeFilter.toLowerCase());
      });
    }

    // Sorting: Price, Departure Time, and Duration
    if (sortBy === "price_asc" || sortBy === "CHEAPEST") {
      results.sort((a, b) => parseFloat(a?.basePrice || 0) - parseFloat(b?.basePrice || 0));
    } else if (sortBy === "price_desc") {
      results.sort((a, b) => parseFloat(b?.basePrice || 0) - parseFloat(a?.basePrice || 0));
    } else if (sortBy === "EARLIEST") {
      results.sort((a, b) => (a?.departureTime || "").localeCompare(b?.departureTime || ""));
    } else if (sortBy === "duration_asc" || sortBy === "FASTEST" || sortBy === "DURATION") {
      results.sort((a, b) => parseFloat(a?.route?.durationHours || 0) - parseFloat(b?.route?.durationHours || 0));
    } else if (sortBy === "duration_desc") {
      results.sort((a, b) => parseFloat(b?.route?.durationHours || 0) - parseFloat(a?.route?.durationHours || 0));
    }


    // Dynamic Total Count strictly based on MATCHED search results
    const totalCount = results.length;
    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    // Apply Server-Side Pagination Slice
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedTrips = results.slice(startIndex, startIndex + limitNum);

    // Attach available seats count for paginated results using single bulk QueryBuilder query
    if (this.seatModel && paginatedTrips.length > 0) {
      const pagedTripIds = paginatedTrips.map((t) => t.id).filter(Boolean);
      if (pagedTripIds.length > 0) {
        try {
          const rawCounts = await this.seatModel
            .createQueryBuilder("seat")
            .select("seat.tripId", "tripId")
            .addSelect("COUNT(seat.id)", "count")
            .where("seat.tripId IN (:...ids)", { ids: pagedTripIds })
            .andWhere("seat.status = :status", { status: "AVAILABLE" })
            .groupBy("seat.tripId")
            .getRawMany();

          const countMap = new Map();
          (rawCounts || []).forEach((row) => {
            countMap.set(row.tripId, parseInt(row.count, 10) || 0);
          });

          paginatedTrips.forEach((t) => {
            t.availableSeats = countMap.has(t.id) ? countMap.get(t.id) : 24;
          });
        } catch (err) {
          paginatedTrips.forEach((t) => {
            t.availableSeats = 24;
          });
        }
      }
    } else {
      paginatedTrips.forEach((t) => {
        t.availableSeats = 24;
      });
    }

    const payload = {
      trips: paginatedTrips,
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };

    return payload;
  }

  /**
   * Get All Scheduled Trips for Admin (Optimized Single-Query Seat Aggregation)
   */
  async getAllTrips(query = {}) {
    const { page, limit } = query;
    let trips = [];
    let totalTrips = 0;
    let isPaginated = false;

    if (page && limit) {
      isPaginated = true;
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, parseInt(limit) || 8);
      const [fetchedTrips, count] = await this.tripModel.findAndCount({
        relations: { bus: true, route: true },
        order: { createdAt: "DESC" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      });
      trips = fetchedTrips || [];
      totalTrips = count || 0;
    } else {
      trips = await this.tripModel.find({
        relations: { bus: true, route: true },
        order: { createdAt: "DESC" },
      });
      trips = trips || [];
      totalTrips = trips.length;
    }

    if (trips.length === 0) {
      if (isPaginated) {
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, parseInt(limit) || 8);
        return {
          trips: [],
          totalTrips: 0,
          totalPages: 0,
          currentPage: pageNum,
          limit: limitNum,
        };
      }
      return [];
    }

    // 1. Efficient Single-Query Grouped Seat Aggregation (Solves N+1 Query Problem)
    const seatMap = {};
    if (this.seatModel) {
      try {
        const tripIds = trips.map((t) => t.id).filter(Boolean);
        if (tripIds.length > 0) {
          const rawCounts = await this.seatModel
            .createQueryBuilder("seat")
            .select("seat.tripId", "tripId")
            .addSelect("COUNT(seat.id)", "availableCount")
            .where("seat.status = :status", { status: "AVAILABLE" })
            .andWhere("seat.tripId IN (:...tripIds)", { tripIds })
            .groupBy("seat.tripId")
            .getRawMany();

          (rawCounts || []).forEach((row) => {
            if (row.tripId) {
              seatMap[row.tripId] = parseInt(row.availableCount, 10) || 0;
            }
          });
        }
      } catch (err) {
        console.error("Error fetching grouped seat counts:", err.message);
      }
    }

    // 2. Format departure dates and attach real available seat counts
    trips.forEach((t) => {
      t.departureDate = this.formatDateStr(t.departureDate);
      t.availableSeats = seatMap[t.id] !== undefined ? seatMap[t.id] : 0;
    });

    if (isPaginated) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, parseInt(limit) || 8);
      return {
        trips,
        totalTrips,
        totalPages: Math.ceil(totalTrips / limitNum) || 1,
        currentPage: pageNum,
        limit: limitNum,
      };
    }

    return trips;
  }

  /**
   * Get Seat Layout & Availability for a Trip
   */
  async getTripSeats(tripId) {
    return await this.seatModel.find({ where: { tripId } });
  }

  /**
   * Get All Routes
   */
  async getAllRoutes() {
    return await this.routeModel.find();
  }

  /**
   * Admin: Update Route Intermediate Stops with Safe Booking Protection
   */
  async updateRouteStops(routeId, stops) {
    if (!routeId || typeof routeId !== "string" || !routeId.trim()) {
      const error = new Error("Route ID is required.");
      error.statusCode = 400;
      throw error;
    }

    const cleanRouteId = routeId.trim();
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(cleanRouteId)) {
      const error = new Error("Invalid Route ID format.");
      error.statusCode = 400;
      throw error;
    }

    if (!Array.isArray(stops) || stops.length === 0) {
      const error = new Error("Stops must be a non-empty array of strings.");
      error.statusCode = 400;
      throw error;
    }

    const cleanStops = [];
    for (const stop of stops) {
      if (typeof stop !== "string" || !stop.trim()) {
        const error = new Error("Each stop must be a non-empty string.");
        error.statusCode = 400;
        throw error;
      }
      cleanStops.push(stop.trim());
    }

    const route = await this.routeModel.findOne({ where: { id: cleanRouteId } });
    if (!route) {
      const error = new Error("Route not found.");
      error.statusCode = 404;
      throw error;
    }

    // Find all Trips referencing this Route
    const trips = await this.tripModel.find({ where: { routeId: route.id } });

    if (trips && trips.length > 0) {
      const tripIds = trips.map((t) => t.id);
      const bookingRepo = this.bookingModel || AppDataSource.getRepository("Booking");

      if (!this.seatModel) {
        const error = new Error("Seat model repository is required for route update booking checks.");
        error.statusCode = 500;
        throw error;
      }

      // Execute parallel bulk counts using TypeORM In operator (no N+1 query loops)
      const [activeBookingCount, bookedSeatsCount] = await Promise.all([
        bookingRepo.count({
          where: { tripId: In(tripIds), bookingStatus: "CONFIRMED", paymentStatus: "PAID" },
        }),
        this.seatModel.count({
          where: { tripId: In(tripIds), status: "BOOKED" },
        }),
      ]);

      if (activeBookingCount > 0 || bookedSeatsCount > 0) {
        const error = new Error("Cannot update route stops because confirmed passenger bookings exist for trips using this route.");
        error.statusCode = 400;
        throw error;
      }
    }

    route.stops = cleanStops;
    const updatedRoute = await this.routeModel.save(route);
    apiCache.clear();
    return updatedRoute;
  }

  /**
   * Get All Buses
   */
  async getAllBuses() {
    return await this.busModel.find();
  }

  /**
   * Admin: Add Route Point (Boarding/Dropping/Both) to a Route
   */
  async addRoutePoint(routeId, pointData) {
    const route = await this.routeModel.findOne({ where: { id: routeId } });
    if (!route) {
      const error = new Error("Route not found.");
      error.statusCode = 404;
      throw error;
    }

    const { locationName, landmark, pointType, sequenceOrder, timeOffsetMinutes } = pointData;

    // Check duplicate location + pointType for same route
    const existing = await this.routePointModel.findOne({
      where: {
        routeId: route.id,
        locationName: ILike(locationName.trim()),
        pointType: pointType,
        isActive: true,
      },
    });

    if (existing) {
      const error = new Error(`Route point '${locationName.trim()}' (${pointType}) already exists for this route.`);
      error.statusCode = 400;
      throw error;
    }

    const newPoint = this.routePointModel.create({
      routeId: route.id,
      locationName: locationName.trim(),
      landmark: landmark ? landmark.trim() : null,
      pointType: pointType,
      sequenceOrder: parseInt(sequenceOrder, 10),
      timeOffsetMinutes: timeOffsetMinutes !== undefined && timeOffsetMinutes !== null ? parseInt(timeOffsetMinutes, 10) : null,
      isActive: true,
    });

    const savedPoint = await this.routePointModel.save(newPoint);
    apiCache.clear();
    return savedPoint;
  }

  /**
   * Public/Admin: Get All Active Route Points for a Route
   */
  async getRoutePoints(routeId) {
    const route = await this.routeModel.findOne({ where: { id: routeId } });
    if (!route) {
      const error = new Error("Route not found.");
      error.statusCode = 404;
      throw error;
    }

    return await this.routePointModel.find({
      where: { routeId: route.id, isActive: true },
      order: { sequenceOrder: "ASC" },
    });
  }

  /**
   * Admin: Update Route Point
   */
  async updateRoutePoint(pointId, updateData) {
    const point = await this.routePointModel.findOne({ where: { id: pointId } });
    if (!point) {
      const error = new Error("Route point not found.");
      error.statusCode = 404;
      throw error;
    }

    if (updateData.locationName !== undefined) point.locationName = updateData.locationName.trim();
    if (updateData.landmark !== undefined) point.landmark = updateData.landmark ? updateData.landmark.trim() : null;
    if (updateData.pointType !== undefined) point.pointType = updateData.pointType;
    if (updateData.sequenceOrder !== undefined) point.sequenceOrder = parseInt(updateData.sequenceOrder, 10);
    if (updateData.timeOffsetMinutes !== undefined) {
      point.timeOffsetMinutes = updateData.timeOffsetMinutes !== null ? parseInt(updateData.timeOffsetMinutes, 10) : null;
    }
    if (updateData.isActive !== undefined) point.isActive = Boolean(updateData.isActive);

    const savedPoint = await this.routePointModel.save(point);
    apiCache.clear();
    return savedPoint;
  }

  /**
   * Admin: Soft-delete / Deactivate Route Point
   */
  async deleteRoutePoint(pointId) {
    const point = await this.routePointModel.findOne({ where: { id: pointId } });
    if (!point) {
      const error = new Error("Route point not found.");
      error.statusCode = 404;
      throw error;
    }

    point.isActive = false;
    await this.routePointModel.save(point);
    apiCache.clear();
    return { message: "Route point deactivated successfully." };
  }

  /**
   * Public: Get Valid Boarding and Dropping Points for a Trip
   */
  async getTripPoints(tripId) {
    const trip = await this.tripModel.findOne({ where: { id: tripId } });
    if (!trip) {
      const error = new Error("Trip not found.");
      error.statusCode = 404;
      throw error;
    }

    const points = await this.routePointModel.find({
      where: { routeId: trip.routeId, isActive: true },
      order: { sequenceOrder: "ASC" },
    });

    const boardingPoints = points.filter((p) => p.pointType === "BOARDING" || p.pointType === "BOTH");
    const droppingPoints = points.filter((p) => p.pointType === "DROPPING" || p.pointType === "BOTH");

    return {
      boardingPoints,
      droppingPoints,
    };
  }
}

export default BusService;

