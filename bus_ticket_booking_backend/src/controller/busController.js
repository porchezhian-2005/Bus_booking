import AppDataSource from "../config/database.js";
import BusEntity from "../models/Bus.js";
import RouteEntity from "../models/Route.js";
import TripEntity from "../models/Trip.js";
import SeatEntity from "../models/Seat.js";
import BookingEntity from "../models/Booking.js";
import BusService from "../services/busService.js";

const busRepository = AppDataSource.getRepository(BusEntity);
const routeRepository = AppDataSource.getRepository(RouteEntity);
const tripRepository = AppDataSource.getRepository(TripEntity);
const seatRepository = AppDataSource.getRepository(SeatEntity);
const bookingRepository = AppDataSource.getRepository(BookingEntity);

const busService = new BusService(busRepository, routeRepository, tripRepository, seatRepository, bookingRepository);

export const addBus = async (req, res) => {
  try {
    const bus = await busService.addBus(req.body);
    return res.status(201).json({ success: true, data: bus });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const updateBus = async (req, res) => {
  try {
    const bus = await busService.updateBus(req.params.id, req.body);
    return res.status(200).json({ success: true, data: bus });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const deleteBus = async (req, res) => {
  try {
    const result = await busService.deleteBus(req.params.id);
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const decommissionBus = async (req, res) => {
  try {
    const summary = await busService.decommissionBus(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: "Bus decommissioned successfully",
      data: summary,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const addRoute = async (req, res) => {
  try {
    const route = await busService.addRoute(req.body);
    return res.status(201).json({ success: true, data: route });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const createTrip = async (req, res) => {
  try {
    const trip = await busService.createTrip(req.body);
    return res.status(201).json({ success: true, data: trip });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const updateTrip = async (req, res) => {
  try {
    const trip = await busService.updateTrip(req.params.id, req.body);
    return res.status(200).json({ success: true, message: "Trip updated successfully", data: trip });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const searchTrips = async (req, res) => {
  try {
    console.log("🔍 API /buses/search called with query:", req.query);
    const result = await busService.searchTrips(req.query);
    console.log("✅ API /buses/search returning trips count:", result?.trips ? result.trips.length : 0);
    return res.status(200).json({
      success: true,
      data: result.trips,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("API /buses/search ERROR:", error.message);
    const statusCode = error.statusCode || 404;
    return res.status(statusCode).json({
      success: false,
      message: error.message,
      routeNotFound: !!error.routeNotFound,
    });
  }
};

export const getTripSeats = async (req, res) => {
  try {
    const seats = await busService.getTripSeats(req.params.tripId);
    return res.status(200).json({ success: true, data: seats });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminAnalytics = async (req, res) => {
  try {
    const analytics = await busService.getAdminAnalytics(bookingRepository);
    return res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllRoutes = async (req, res) => {
  try {
    const routes = await busService.getAllRoutes();
    return res.status(200).json({ success: true, data: routes });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllBuses = async (req, res) => {
  try {
    const buses = await busService.getAllBuses();
    return res.status(200).json({ success: true, data: buses });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllTrips = async (req, res) => {
  try {
    const result = await busService.getAllTrips(req.query);
    if (result && result.trips) {
      return res.status(200).json({
        success: true,
        data: result.trips,
        pagination: {
          totalTrips: result.totalTrips,
          totalPages: result.totalPages,
          currentPage: result.currentPage,
          limit: result.limit,
        },
      });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRouteStops = async (req, res) => {
  try {
    const { stops } = req.body;
    const route = await busService.updateRouteStops(req.params.id, stops);
    return res.status(200).json({ success: true, message: "Route stops updated successfully", data: route });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const addRoutePoint = async (req, res) => {
  try {
    const point = await busService.addRoutePoint(req.params.routeId, req.body);
    return res.status(201).json({ success: true, message: "Route point created successfully", data: point });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const getRoutePoints = async (req, res) => {
  try {
    const points = await busService.getRoutePoints(req.params.routeId);
    return res.status(200).json({ success: true, data: points });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const updateRoutePoint = async (req, res) => {
  try {
    const point = await busService.updateRoutePoint(req.params.pointId, req.body);
    return res.status(200).json({ success: true, message: "Route point updated successfully", data: point });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const deleteRoutePoint = async (req, res) => {
  try {
    const result = await busService.deleteRoutePoint(req.params.pointId);
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const getTripPoints = async (req, res) => {
  try {
    const points = await busService.getTripPoints(req.params.tripId);
    return res.status(200).json({ success: true, data: points });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};


