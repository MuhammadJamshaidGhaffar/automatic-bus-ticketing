"use server";
import { getDB } from "../db";

export async function addPayment(
  booking_id: number,
  amount: number,
  method: string,
  status: string
) {
  const db = await getDB();
  await db.run(
    "INSERT INTO Payments (booking_id, amount, method, status) VALUES (?, ?, ?, ?)",
    [booking_id, amount, method, status]
  );
}

export async function getAllPayments() {
  const db = await getDB();
  return db.all("SELECT * FROM Payments");
}

export async function getPaymentById(id: number) {
  const db = await getDB();
  return db.get("SELECT * FROM Payments WHERE id = ?", [id]);
}

export async function updatePayment(
  id: number,
  booking_id: number,
  amount: number,
  method: string,
  status: string
) {
  const db = await getDB();
  await db.run(
    "UPDATE Payments SET booking_id = ?, amount = ?, method = ?, status = ? WHERE id = ?",
    [booking_id, amount, method, status, id]
  );
}

export async function deletePayment(id: number) {
  const db = await getDB();
  await db.run("DELETE FROM Payments WHERE id = ?", [id]);
}
