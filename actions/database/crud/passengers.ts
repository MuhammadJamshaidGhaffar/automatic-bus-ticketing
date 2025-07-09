"use server";

import { getDB } from "../db";

export async function addPassenger(name: string, phone: string) {
  const db = await getDB();
  await db.run("INSERT INTO Passengers (name, phone) VALUES (?, ?)", [
    name,
    phone,
  ]);
}

export async function getAllPassengers() {
  const db = await getDB();
  return db.all("SELECT * FROM Passengers");
}

export async function getPassengerById(id: number) {
  const db = await getDB();
  return db.get("SELECT * FROM Passengers WHERE id = ?", [id]);
}

export async function updatePassenger(id: number, name: string, phone: string) {
  const db = await getDB();
  await db.run("UPDATE Passengers SET name = ?, phone = ? WHERE id = ?", [
    name,
    phone,
    id,
  ]);
}

export async function deletePassenger(id: number) {
  const db = await getDB();
  await db.run("DELETE FROM Passengers WHERE id = ?", [id]);
}
