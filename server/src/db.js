import mongoose from "mongoose"

export async function connectDb() {
  const uri =
    process.env.MONGODB_URI || "mongodb+srv://esplanadedirectory_db_user:dZBH3mwhIKij1fcX@cluster0.dyqkqg0.mongodb.net/bed_institute"
  mongoose.set("strictQuery", true)
  await mongoose.connect(uri)
}
