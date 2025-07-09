const sqlite3 = require("sqlite3").verbose();

// Connect to SQLite database (creates file if it doesn't exist)
const db = new sqlite3.Database("./bus_travel.db");

db.serialize(() => {
  // Terminal Table
  db.run(`
    CREATE TABLE IF NOT EXISTS Terminals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT NOT NULL
    );
  `);

  // Buses
  db.run(`
    CREATE TABLE IF NOT EXISTS Buses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_number TEXT UNIQUE NOT NULL,
      capacity INTEGER NOT NULL
    );
  `);

  // Drivers
  db.run(`
    CREATE TABLE IF NOT EXISTS Drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE
    );
  `);

  // Routes
  db.run(`
    CREATE TABLE IF NOT EXISTS Routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_terminal_id INTEGER,
      to_terminal_id INTEGER,
      distance_km REAL,
      estimated_time TEXT,
      FOREIGN KEY(from_terminal_id) REFERENCES Terminals(id),
      FOREIGN KEY(to_terminal_id) REFERENCES Terminals(id)
    );
  `);

  // Trips
  db.run(`
    CREATE TABLE IF NOT EXISTS Trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER,
      bus_id INTEGER,
      driver_id INTEGER,
      departure_time TEXT,
      price REAL,
      FOREIGN KEY(route_id) REFERENCES Routes(id),
      FOREIGN KEY(bus_id) REFERENCES Buses(id),
      FOREIGN KEY(driver_id) REFERENCES Drivers(id)
    );
  `);

  // Passengers
  db.run(`
    CREATE TABLE IF NOT EXISTS Passengers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL
    );
  `);

  // Bookings
  db.run(`
    CREATE TABLE IF NOT EXISTS Bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      passenger_name TEXT,
      phone_no TEXT,
      trip_id INTEGER,
      seat_number INTEGER,
      booking_time TEXT,
      status TEXT DEFAULT 'confirmed',
      FOREIGN KEY(trip_id) REFERENCES Trips(id)
    );
  `);

  // Payments
  db.run(`
    CREATE TABLE IF NOT EXISTS Payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER,
      amount REAL,
      payment_method TEXT,
      payment_time TEXT,
      FOREIGN KEY(booking_id) REFERENCES Bookings(id)
    );
  `);

  console.log("Database schema created successfully.");
});

db.close();
