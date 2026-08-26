import AppDataSource from "../src/config/database.js";
import BusEntity from "../src/models/Bus.js";
import RouteEntity from "../src/models/Route.js";
import TripEntity from "../src/models/Trip.js";
import SeatEntity from "../src/models/Seat.js";

/**
 * Seed Default Buses, Routes, and Trips safely for Today, Tomorrow, and Future dates
 */
export const seedBusesAndTrips = async () => {
  try {
    if (!AppDataSource.isInitialized) return;

    const busRepository = AppDataSource.getRepository(BusEntity);
    const routeRepository = AppDataSource.getRepository(RouteEntity);
    const tripRepository = AppDataSource.getRepository(TripEntity);
    const seatRepository = AppDataSource.getRepository(SeatEntity);

    const existingTripsCount = await tripRepository.count();
    if (existingTripsCount > 0) {
      console.log(`ℹ️ PostgreSQL trips table already has ${existingTripsCount} trips. Skipping re-seeding.`);
      return;
    }

    console.log("🌱 Seeding realistic RedBus fleet, routes, and multi-date trips...");

    // 1. Create Buses (Seater, Sleeper, AC, Non-AC)
    const busesData = [
      { name: "KPN Travels", busNumber: "TN-37-AX-8910", busType: "AC Sleeper (2+1)", totalSeats: 30, operatorName: "KPN Express" },
      { name: "IntrCity SmartBus", busNumber: "KA-01-MJ-4455", busType: "AC Seater / Sleeper", totalSeats: 36, operatorName: "IntrCity" },
      { name: "Parveen Travels", busNumber: "TN-09-CB-1122", busType: "Volvo Multi-Axle AC Sleeper", totalSeats: 30, operatorName: "Parveen Logistics" },
      { name: "GreenLine Travels", busNumber: "KA-05-EX-7788", busType: "Scania Multi-Axle AC Seater", totalSeats: 32, operatorName: "GreenLine" },
      { name: "SRS Travels", busNumber: "TN-02-SR-9900", busType: "Express Non-AC Seater", totalSeats: 40, operatorName: "SRS Express" },
      { name: "Orange Tours", busNumber: "AP-04-OT-5566", busType: "AC Sleeper (2+1)", totalSeats: 30, operatorName: "Orange Travels" },
    ];

    const savedBuses = [];
    for (const bData of busesData) {
      let bus = await busRepository.findOne({ where: { busNumber: bData.busNumber } });
      if (!bus) {
        bus = busRepository.create(bData);
        bus = await busRepository.save(bus);
      }
      savedBuses.push(bus);
    }

    // 2. Create Routes
    const routesData = [
      { source: "Chennai", destination: "Bengaluru", distanceKm: 350, durationHours: 6.5 },
      { source: "Chennai", destination: "Coimbatore", distanceKm: 500, durationHours: 8.0 },
      { source: "Chennai", destination: "Madurai", distanceKm: 460, durationHours: 7.5 },
      { source: "Bengaluru", destination: "Hyderabad", distanceKm: 570, durationHours: 9.0 },
      { source: "Chennai", destination: "Pondicherry", distanceKm: 150, durationHours: 3.5 },
    ];

    const savedRoutes = [];
    for (const rData of routesData) {
      let route = await routeRepository.findOne({ where: { source: rData.source, destination: rData.destination } });
      if (!route) {
        route = routeRepository.create(rData);
        route = await routeRepository.save(route);
      }
      savedRoutes.push(route);
    }

    // 3. Create Trips for Today (2026-08-26), Tomorrow (2026-08-27), and 2026-09-01
    const datesToSeed = ["2026-08-26", "2026-08-27", "2026-09-01"];

    for (const departureDate of datesToSeed) {
      const tripsToCreate = [
        { busIdx: 0, routeIdx: 0, departureTime: "21:30", arrivalTime: "04:00 AM", basePrice: "850.00" },
        { busIdx: 1, routeIdx: 0, departureTime: "22:15", arrivalTime: "04:45 AM", basePrice: "920.00" },
        { busIdx: 3, routeIdx: 0, departureTime: "18:00", arrivalTime: "00:30 AM", basePrice: "650.00" },
        { busIdx: 4, routeIdx: 0, departureTime: "20:30", arrivalTime: "03:00 AM", basePrice: "499.00" },
        { busIdx: 2, routeIdx: 0, departureTime: "23:00", arrivalTime: "05:30 AM", basePrice: "1150.00" },
        { busIdx: 3, routeIdx: 1, departureTime: "20:00", arrivalTime: "04:00 AM", basePrice: "750.00" },
        { busIdx: 4, routeIdx: 2, departureTime: "21:00", arrivalTime: "04:30 AM", basePrice: "650.00" },
        { busIdx: 1, routeIdx: 3, departureTime: "21:45", arrivalTime: "06:45 AM", basePrice: "1100.00" },
        { busIdx: 0, routeIdx: 4, departureTime: "06:00 AM", arrivalTime: "09:30 AM", basePrice: "350.00" },
      ];

      for (const tData of tripsToCreate) {
        const trip = tripRepository.create({
          busId: savedBuses[tData.busIdx].id,
          routeId: savedRoutes[tData.routeIdx].id,
          departureDate: departureDate,
          departureTime: tData.departureTime,
          arrivalTime: tData.arrivalTime,
          basePrice: tData.basePrice,
          status: "SCHEDULED",
        });
        const savedTrip = await tripRepository.save(trip);

        // Seat Generation
        const bus = savedBuses[tData.busIdx];
        const seats = [];
        for (let i = 1; i <= bus.totalSeats; i++) {
          let seatType = "SEATER";
          let mult = 1.0;
          if (bus.busType.toLowerCase().includes("sleeper")) {
            seatType = i <= bus.totalSeats / 2 ? "SLEEPER_LOWER" : "SLEEPER_UPPER";
            mult = i <= bus.totalSeats / 2 ? 1.2 : 1.1;
          }
          seats.push(
            seatRepository.create({
              tripId: savedTrip.id,
              seatNumber: `S${i}`,
              seatType: seatType,
              price: (parseFloat(tData.basePrice) * mult).toFixed(2),
              status: i % 5 === 0 ? "BOOKED" : "AVAILABLE",
            })
          );
        }
        await seatRepository.save(seats);
      }
    }

    console.log("✅ Seeded dynamic bus trips and seats for multi-dates successfully!");
  } catch (error) {
    console.error("Error seeding buses and trips:", error.message);
  }
};

export default seedBusesAndTrips;
