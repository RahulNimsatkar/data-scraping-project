import { MongoClient, Db } from 'mongodb'; // Import MongoClient and Db type

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const uri = process.env.DATABASE_URL;
const client = new MongoClient(uri);
let _db: Db; // Declare a variable to hold the connected database instance

export async function connectToDatabase() {
  try {
    await client.connect();
    _db = client.db(); // Assign the connected database instance
    console.log("Connected to MongoDB!");
    return _db;
  } catch (e) {
    console.error("Failed to connect to MongoDB", e);
    throw e;
  }
}

export const getDb = (): Db => {
  if (!_db) {
    throw new Error("Database not connected. Call connectToDatabase first.");
  }
  return _db;
};

export const mongoClient = client;
