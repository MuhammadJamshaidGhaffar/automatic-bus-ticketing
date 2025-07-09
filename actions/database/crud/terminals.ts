"use server";

import { getDB } from "../db";

export async function addTerminal(name: string, city: string) {
  const db = await getDB();
  await db.run("INSERT INTO Terminals (name, city) VALUES (?, ?)", [
    name,
    city,
  ]);
}

export async function getAllTerminals() {
  const db = await getDB();
  return db.all("SELECT * FROM Terminals");
}

export async function getTerminalById(id: number) {
  const db = await getDB();
  return db.get("SELECT * FROM Terminals WHERE id = ?", [id]);
}

export async function updateTerminal(id: number, name: string, city: string) {
  const db = await getDB();
  await db.run("UPDATE Terminals SET name = ?, city = ? WHERE id = ?", [
    name,
    city,
    id,
  ]);
}

export async function deleteTerminal(id: number) {
  const db = await getDB();
  await db.run("DELETE FROM Terminals WHERE id = ?", [id]);
}
