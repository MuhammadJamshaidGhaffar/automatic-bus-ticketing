"use server";

import { getDB } from "../db";

export async function addBus(registration_number: string, capacity: number) {
  const db = await getDB();
  await db.run(
    "INSERT INTO Buses (registration_number, capacity) VALUES (?, ?)",
    [registration_number, capacity]
  );
}

export async function getAllBuses() {
  const db = await getDB();
  return db.all("SELECT * FROM Buses");
}

export async function getBusById(id: number) {
  const db = await getDB();
  return db.get("SELECT * FROM Buses WHERE id = ?", [id]);
}

export async function updateBus(
  id: number,
  registration_number: string,
  capacity: number
) {
  const db = await getDB();
  await db.run(
    "UPDATE Buses SET registration_number = ?, capacity = ? WHERE id = ?",
    [registration_number, capacity, id]
  );
}

export async function deleteBus(id: number) {
  const db = await getDB();
  await db.run("DELETE FROM Buses WHERE id = ?", [id]);
}
