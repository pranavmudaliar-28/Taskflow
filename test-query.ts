import { OrganizationMongo } from "./shared/mongodb-schema";
import mongoose from "mongoose";

async function test() {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://pranavmudaliar:pranav123@slasheasy.v7pxh.mongodb.net/taskflow?retryWrites=true&w=majority&appName=slasheasy");
    const orgs = await OrganizationMongo.find({ _id: { $in: [] } });
    console.log("Found:", orgs.length);
    process.exit(0);
}
test();
