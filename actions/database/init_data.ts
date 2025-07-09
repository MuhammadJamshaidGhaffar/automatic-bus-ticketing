const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./bus_travel.db");

db.serialize(() => {
  // --- Terminals ---
  const terminals = [
    ["Daewoo Terminal Islamabad", "Islamabad"],
    ["Daewoo Terminal Lahore", "Lahore"],
    ["Daewoo Terminal Karachi", "Karachi"],
    ["Daewoo Terminal Multan", "Multan"],
    ["Daewoo Terminal Peshawar", "Peshawar"],
  ];
  terminals.forEach(([name, city]) => {
    db.run(`INSERT INTO Terminals (name, city) VALUES (?, ?)`, [name, city]);
  });

  // --- Buses ---
  const buses = [
    ["DAE-101", 45],
    ["DAE-102", 40],
    ["DAE-103", 50],
  ];
  buses.forEach(([reg, cap]) => {
    db.run(`INSERT INTO Buses (registration_number, capacity) VALUES (?, ?)`, [
      reg,
      cap,
    ]);
  });

  // --- Drivers ---
  const drivers = [
    ["Imran Khan", "03001234567"],
    ["Ali Raza", "03111234567"],
    ["Usman Tariq", "03211234567"],
  ];
  drivers.forEach(([name, phone]) => {
    db.run(`INSERT INTO Drivers (name, phone) VALUES (?, ?)`, [name, phone]);
  });

  // --- Routes ---
  const routes = [
    // from_id, to_id, distance, estimated_time
    [1, 2, 375, "4h 30m"], // Islamabad to Lahore
    [1, 3, 1140, "18h 0m"], // Islamabad to Karachi
    [2, 3, 1020, "16h 0m"], // Lahore to Karachi
    [1, 4, 540, "7h 0m"], // Islamabad to Multan
    [1, 5, 185, "2h 30m"], // Islamabad to Peshawar
  ];
  routes.forEach(([from, to, dist, time]) => {
    db.run(
      `INSERT INTO Routes (from_terminal_id, to_terminal_id, distance_km, estimated_time) VALUES (?, ?, ?, ?)`,
      [from, to, dist, time]
    );
  });

  // --- Trips ---
  const trips = [
    [1, 1, 1, "2025-04-23 08:00:00", 1800], // ISB-LHR
    [2, 2, 2, "2025-04-23 10:00:00", 4500], // ISB-KHI
    [3, 3, 3, "2025-04-24 06:00:00", 4300], // LHR-KHI
    [4, 1, 2, "2025-04-24 09:00:00", 2200], // ISB-Multan
    [5, 2, 1, "2025-04-25 07:00:00", 1500], // ISB-Peshawar
  ];
  trips.forEach(([route_id, bus_id, driver_id, dep_time, price]) => {
    db.run(
      `INSERT INTO Trips (route_id, bus_id, driver_id, departure_time, price) VALUES (?, ?, ?, ?, ?)`,
      [route_id, bus_id, driver_id, dep_time, price]
    );
  });

  // --- Passengers ---
  const passengers = [
    ["Ahmed Nawaz", "03451234567"],
    ["Sana Malik", "03321234567"],
    ["Bilal Tariq", "03011234567"],
  ];
  passengers.forEach(([name, phone]) => {
    db.run(`INSERT INTO Passengers (name, phone) VALUES (?, ?)`, [name, phone]);
  });

  // --- Bookings ---
  const bookings = [
    ["Jamshaid", "12345678901", 1, 12, "2025-04-21 14:00:00"],
    ["ali", "12345678901", 2, 5, "2025-04-21 15:00:00"],
    ["musfir", "12345678901", 3, 20, "2025-04-22 10:30:00"],
  ];
  bookings.forEach(([passenger_name, phone_no, trip_id, seat, time]) => {
    db.run(
      `INSERT INTO Bookings (passenger_name, phone_no, trip_id, seat_number, booking_time) VALUES (?, ?, ?, ?, ?)`,
      [passenger_name, phone_no, trip_id, seat, time]
    );
  });

  // --- Payments ---
  const payments = [
    [1, 1800, "Credit Card", "2025-04-21 14:05:00"],
    [2, 4500, "JazzCash", "2025-04-21 15:10:00"],
    [3, 4300, "Cash", "2025-04-22 10:45:00"],
  ];
  payments.forEach(([booking_id, amount, method, time]) => {
    db.run(
      `INSERT INTO Payments (booking_id, amount, payment_method, payment_time) VALUES (?, ?, ?, ?)`,
      [booking_id, amount, method, time]
    );
  });

  console.log("✅ Sample data inserted successfully.");
});

db.close();
