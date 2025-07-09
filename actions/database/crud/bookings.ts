"use server";

import { getDB } from "../db";

export async function createBooking(
  trip_id: number,
  passenger_name: string,
  phone_no: string,
  seat_number: number
) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO Bookings (trip_id, passenger_name, phone_no, seat_number) VALUES (?, ?, ?, ?)",
      [trip_id, passenger_name, phone_no, seat_number],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            booking_id: "1", // ID of the newly created booking
            status: "confirmed",
            message: "Booking successfully created",
          });
        }
      }
    );
  });
}

export async function getAllBookings() {
  const db = await getDB();
  return db.all("SELECT * FROM Bookings");
}

export async function getBookingById(id: number) {
  const db = await getDB();
  return db.get("SELECT * FROM Bookings WHERE id = ?", [id]);
}

export async function updateBooking(
  id: number,
  trip_id: number,
  passenger_name: string,
  phone_no: string,
  seat_number: number
) {
  const db = await getDB();
  await db.run(
    "UPDATE Bookings SET trip_id = ?, passenger_name = ?, phone_no = ?, seat_number = ? WHERE id = ?",
    [trip_id, passenger_name, phone_no, seat_number, id]
  );
}

export async function deleteBooking(id: number) {
  const db = await getDB();
  await db.run("DELETE FROM Bookings WHERE id = ?", [id]);
}
