"use server";

import { getDB } from "../db";

export async function addTrip(
  route_id: number,
  bus_id: number,
  departure_time: string,
  arrival_time: string,
  date: string
) {
  const db = await getDB();
  await db.run(
    "INSERT INTO Trips (route_id, bus_id, departure_time, arrival_time, date) VALUES (?, ?, ?, ?, ?)",
    [route_id, bus_id, departure_time, arrival_time, date]
  );
}

export async function getAllTrips() {
  const db = await getDB();
  return db.all("SELECT * FROM Trips");
}

export async function getTripById(id: number) {
  const db = await getDB();
  return db.get("SELECT * FROM Trips WHERE id = ?", [id]);
}

export async function updateTrip(
  id: number,
  route_id: number,
  bus_id: number,
  departure_time: string,
  arrival_time: string,
  date: string
) {
  const db = await getDB();
  await db.run(
    "UPDATE Trips SET route_id = ?, bus_id = ?, departure_time = ?, arrival_time = ?, date = ? WHERE id = ?",
    [route_id, bus_id, departure_time, arrival_time, date, id]
  );
}

export async function deleteTrip(id: number) {
  const db = await getDB();
  await db.run("DELETE FROM Trips WHERE id = ?", [id]);
}

export async function checkAvailableSeats(tripId: number): Promise<string[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT buses.capacity, buses.id AS busId
      FROM trips
      JOIN buses ON trips.bus_id = buses.id
      WHERE trips.id = ?
      `,
      [tripId],
      (err, tripRow) => {
        if (err || !tripRow) {
          return reject(err || new Error("Trip not found"));
        }

        const { capacity } = tripRow;

        db.all(
          `
          SELECT seat_number
          FROM bookings
          WHERE trip_id = ?
          `,
          [tripId],
          (err, bookedRows) => {
            if (err) {
              return reject(err);
            }

            const bookedSeats = bookedRows.map((row) =>
              row.seat_number?.toString()
            );
            const allSeats = Array.from({ length: capacity }, (_, i) =>
              (i + 1).toString()
            );
            const availableSeats = allSeats.filter(
              (seat) => !bookedSeats.includes(seat)
            );

            resolve(availableSeats);
          }
        );
      }
    );
  });
}
