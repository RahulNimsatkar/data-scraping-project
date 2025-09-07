import { MongoClient, Db } from 'mongodb'; // Import MongoClient and Db type

// Use MongoDB connection string from environment or provided default
const uri = process.env.MONGO_URL || "mongodb+srv://animefluxmedia_db_user:gbx6HOMVgQqHtFqX@cluster0.rlettos.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
let client: MongoClient | null = null;
let _db: Db | null = null; // Declare a variable to hold the connected database instance

export async function connectToDatabase() {
  // Attempt MongoDB connection with the provided URI
  try {
    console.log("Connecting to MongoDB with provided connection string...");
    client = new MongoClient(uri);
    await client.connect();
    _db = client.db(); // Assign the connected database instance
    console.log("Successfully connected to MongoDB!");
    return _db;
  } catch (e) {
    console.error("Failed to connect to MongoDB, falling back to in-memory storage", e);
    console.log("Application will run with in-memory storage for development");
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
