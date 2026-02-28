import { type User, type UpsertUser } from "@shared/models/auth";
import { UserMongo } from "../../../shared/mongodb-schema";
import mongoose from "mongoose";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class MongoAuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
    const user = await UserMongo.findById(id);
    return user ? (user.toJSON() as User) : undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    let user;
    if (userData.id && mongoose.Types.ObjectId.isValid(userData.id)) {
      user = await UserMongo.findByIdAndUpdate(userData.id, userData, { new: true, upsert: true });
    } else {
      user = await UserMongo.findOneAndUpdate({ email: userData.email }, userData, { new: true, upsert: true });
    }
    return user.toJSON() as User;
  }
}

export const authStorage = new MongoAuthStorage();
