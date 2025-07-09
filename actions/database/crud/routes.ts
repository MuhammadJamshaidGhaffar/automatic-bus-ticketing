"use server";

import { getDB } from "../db";

export async function addRoute(
  origin_terminal_id: number,
  destination_terminal_id: number,
  distance_km: number,
  fare: number
) {
  const db = await getDB();
  await db.run(
    "INSERT INTO Routes (origin_terminal_id, destination_terminal_id, distance_km, fare) VALUES (?, ?, ?, ?)",
    [origin_terminal_id, destination_terminal_id, distance_km, fare]
  );
}

export async function getAllRoutes() {
  const db = await getDB();
  return db.all("SELECT * FROM Routes");
}

export async function getRouteById(id: number) {
  const db = await getDB();
  return db.get("SELECT * FROM Routes WHERE id = ?", [id]);
}

export async function updateRoute(
  id: number,
  origin_terminal_id: number,
  destination_terminal_id: number,
  distance_km: number,
  fare: number
) {
  const db = await getDB();
  await db.run(
    "UPDATE Routes SET origin_terminal_id = ?, destination_terminal_id = ?, distance_km = ?, fare = ? WHERE id = ?",
    [origin_terminal_id, destination_terminal_id, distance_km, fare, id]
  );
}

export async function deleteRoute(id: number) {
  const db = await getDB();
  await db.run("DELETE FROM Routes WHERE id = ?", [id]);
}
