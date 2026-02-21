
import { TaskMongo } from "./shared/mongodb-schema";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function debugTasks() {
    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI not found");
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const tasks = await TaskMongo.find({});
        console.log("Total tasks:", tasks.length);

        tasks.forEach(t => {
            console.log(`Task Found: ID=${t._id}, Slug=${t.slug}, Title=${t.title}`);
        });

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

debugTasks();
