"use server";

import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";

export async function getDB(): Promise<Database> {
  return open({
    filename: "./actions/database/bus_travel.db",
    driver: sqlite3.Database,
  });
}
