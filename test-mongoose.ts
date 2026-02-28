import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { OrganizationMemberMongo } from "./shared/mongodb-schema";

dotenv.config();

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);

        // Pass undefined userId
        const userId = undefined;
        // See if it fetches all members
        const mems = await OrganizationMemberMongo.find({ userId });
        console.log("Empty user mems (undefined): ", mems.length);

        // Passed empty string
        const memsEmpty = await OrganizationMemberMongo.find({ userId: "" });
        console.log("Empty user mems (string): ", memsEmpty.length);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
test();
