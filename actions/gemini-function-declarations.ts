import {
  createBooking,
  getAllBookings,
  getBookingById,
} from "./database/crud/bookings";
import { getAllBuses, getBusById } from "./database/crud/buses";
import { getAllPassengers, getPassengerById } from "./database/crud/passengers";
import { getAllPayments, getPaymentById } from "./database/crud/payments";
import { getAllRoutes, getRouteById } from "./database/crud/routes";
import { getAllTerminals, getTerminalById } from "./database/crud/terminals";
import {
  checkAvailableSeats,
  getAllTrips,
  getTripById,
} from "./database/crud/trips";

export const geminFunctionDeclarations = [
  {
    name: "getAllTrips",
    description: `Get a list of all trips including route, bus, driver, time, and fare.\n\nResponse:\n[\n  {\n    id: number,\n    route_id: number,\n    bus_id: number,\n    driver_id: number,\n    departure_time: string,\n    price: number\n  }\n]`,
    parameters: {
      type: "OBJECT",
      properties: {},
      required: [],
    },
  },
  {
    name: "getTripById",
    description: `Get a specific trip by its ID. This includes route ID, bus ID, driver ID, departure time, and fare.\n\nResponse:\n{\n  id: number,\n  route_id: number,\n  bus_id: number,\n  driver_id: number,\n  departure_time: string,\n  price: number\n}`,
    parameters: {
      type: "OBJECT",
      properties: {
        id: {
          type: "NUMBER",
          description: "The unique ID of the trip",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "getAllBookings",
    description: `Get a list of all bookings with passenger, seat, and trip details.\n\nResponse:\n[\n  {\n    id: number,\n    passenger_name: string,\n    phone_no: string,\n    trip_id: number,\n    seat_number: number,\n    booking_time: string,\n    status: string\n  }\n]`,
    parameters: {
      type: "OBJECT",
      properties: {},
      required: [],
    },
  },
  {
    name: "getBookingById",
    description: `Get a specific booking by its ID.\n\nResponse:\n{\n  id: number,\n  passenger_name: string,\n  phone_no: string,\n  trip_id: number,\n  seat_number: number,\n  booking_time: string,\n  status: string\n}`,
    parameters: {
      type: "OBJECT",
      properties: {
        id: {
          type: "NUMBER",
          description: "The unique ID of the booking",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "createBooking",
    description: `Creates a new booking for a trip with the provided passenger details and seat number.\n\nResponse:\n{\n  booking_id: number,  // The unique ID of the newly created booking\n  status: string,      // The status of the booking (e.g., 'confirmed')\n  message: string      // Confirmation message indicating the booking creation result\n}`,
    parameters: {
      type: "OBJECT",
      properties: {
        trip_id: {
          type: "NUMBER",
          description: "The unique ID of the trip the booking is for",
        },
        passenger_name: {
          type: "STRING",
          description: "The name of the passenger making the booking",
        },
        phone_no: {
          type: "STRING",
          description: "The phone number of the passenger",
        },
        seat_number: {
          type: "NUMBER",
          description: "The seat number reserved for the passenger",
        },
      },
      required: ["trip_id", "passenger_name", "phone_no", "seat_number"],
    },
  },
  {
    name: "getAllPayments",
    description: `Get all recorded payments with booking and amount details.\n\nResponse:\n[\n  {\n    id: number,\n    booking_id: number,\n    amount: number,\n    payment_method: string,\n    payment_time: string\n  }\n]`,
    parameters: {
      type: "OBJECT",
      properties: {},
      required: [],
    },
  },
  {
    name: "getPaymentById",
    description: `Get a specific payment by its ID.\n\nResponse:\n{\n  id: number,\n  booking_id: number,\n  amount: number,\n  payment_method: string,\n  payment_time: string\n}`,
    parameters: {
      type: "OBJECT",
      properties: {
        id: {
          type: "NUMBER",
          description: "The unique ID of the payment",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "getAllBuses",
    description: `Get a list of all buses including registration number and capacity.\n\nResponse:\n[\n  {\n    id: number,\n    registration_number: string,\n    capacity: number\n  }\n]`,
    parameters: {
      type: "OBJECT",
      properties: {},
      required: [],
    },
  },
  {
    name: "getBusById",
    description: `Get a specific bus by its ID.\n\nResponse:\n{\n  id: number,\n  registration_number: string,\n  capacity: number\n}`,
    parameters: {
      type: "OBJECT",
      properties: {
        id: {
          type: "NUMBER",
          description: "The unique ID of the bus",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "getAllRoutes",
    description: `Get a list of all routes with distance and estimated time.\n\nResponse:\n[\n  {\n    id: number,\n    from_terminal_id: number,\n    to_terminal_id: number,\n    distance_km: number,\n    estimated_time: string\n  }\n]`,
    parameters: {
      type: "OBJECT",
      properties: {},
      required: [],
    },
  },
  {
    name: "getRouteById",
    description: `Get a specific route by its ID.\n\nResponse:\n{\n  id: number,\n  from_terminal_id: number,\n  to_terminal_id: number,\n  distance_km: number,\n  estimated_time: string\n}`,
    parameters: {
      type: "OBJECT",
      properties: {
        id: {
          type: "NUMBER",
          description: "The unique ID of the route",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "getAllTerminals",
    description: `Get a list of all terminals with name and city.\n\nResponse:\n[\n  {\n    id: number,\n    name: string,\n    city: string\n  }\n]`,
    parameters: {
      type: "OBJECT",
      properties: {},
      required: [],
    },
  },
  {
    name: "getTerminalById",
    description: `Get a specific terminal by its ID.\n\nResponse:\n{\n  id: number,\n  name: string,\n  city: string\n}`,
    parameters: {
      type: "OBJECT",
      properties: {
        id: {
          type: "NUMBER",
          description: "The unique ID of the terminal",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "checkAvailableSeats",
    description: `Returns a list of available seat numbers for a specific trip. The seat numbers are plain strings like "1", "2", ..., up to the bus capacity.\n\nResponse:\n{\n  availableSeats: string[]\n}`,
    parameters: {
      type: "OBJECT",
      properties: {
        tripId: {
          type: "NUMBER",
          description: "The ID of the trip to check seat availability for",
        },
      },
      required: ["tripId"],
    },
  },
];

export const geminiFunctions = {
  getAllTrips,
  getTripById,
  getAllBookings,
  getBookingById,
  createBooking,
  getAllPayments,
  getPaymentById,
  getAllBuses,
  getBusById,
  getAllRoutes,
  getRouteById,
  getAllTerminals,
  getTerminalById,
  checkAvailableSeats,
};

export type GeminiFunctionNames = keyof typeof geminiFunctions;
