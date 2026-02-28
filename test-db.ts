import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log("Connected to MongoDB");

        // Fetch directly from native driver to avoid schema interference
        const project = await mongoose.connection.db?.collection('projects').findOne({ slug: 'tata-qwxia' });

        if (project) {
            console.log("Raw Project Document from DB:");
            console.log("ID Type:", typeof project._id, project._id.constructor.name);
            console.log("ID Value:", project._id);
            console.log("ID Value toString():", project._id.toString());
            console.log("Full Object:", JSON.stringify(project, null, 2));
        } else {
            console.log("Project not found by slug.");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

test();
