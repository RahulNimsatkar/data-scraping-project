import { MongoClient, Db } from 'mongodb'; // Import MongoClient and Db type

// Check if we have a MongoDB connection string
const uri = process.env.DATABASE_URL;
let client: MongoClient | null = null;
let _db: Db | null = null; // Declare a variable to hold the connected database instance

export async function connectToDatabase() {
  // Only attempt MongoDB connection if we have a MongoDB URI
  if (uri && (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'))) {
    try {
      client = new MongoClient(uri);
      await client.connect();
      _db = client.db(); // Assign the connected database instance
      console.log("Connected to MongoDB!");
      return _db;
    } catch (e) {
      console.error("Failed to connect to MongoDB, falling back to in-memory storage", e);
      console.log("Application will run with in-memory storage for development");
      return null;
    }
  } else {
    console.log("No MongoDB connection string found, using in-memory storage for development");
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
