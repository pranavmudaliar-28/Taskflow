import mongoose from "mongoose";
import dns from "dns";

// Set DNS servers to Google's to avoid local DNS issues with Atlas
dns.setServers(['8.8.8.8', '8.8.4.4']);

// MongoDB Initialization
export const connectMongo = async () => {
  if (!process.env.MONGODB_URI) {
    console.warn("MONGODB_URI not set. MongoDB storage will not be available.");
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
    console.log("Successfully connected to MongoDB Atlas");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};
