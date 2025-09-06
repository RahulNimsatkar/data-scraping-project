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
    console.error("Failed to connect to MongoDB, falling back to in-memory storage", e);
    console.log("Application will run with in-memory storage for development");
    // Don't throw error, let app continue with in-memory storage
    return null;
  }
}

export const getDb = (): Db | null => {
  return _db || null;
};

export const isDbConnected = (): boolean => {
  return !!_db;
};

export const mongoClient = client;
