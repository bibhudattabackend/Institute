import "dotenv/config"
import bcrypt from "bcryptjs"
import mongoose from "mongoose"
import { connectDb } from "./db.js"
import { Institute } from "./models/Institute.js"

/**
 * 2 dummy institutes (login users).
 * Run: npm run seed   (from server folder)
 *
 * MongoDB: MONGODB_URI in .env (default mongodb+srv://esplanadedirectory_db_user:dZBH3mwhIKij1fcX@cluster0.dyqkqg0.mongodb.net/bed_institute)
 *
 * Login:
 *   institute-a@demo.local / demo1234
 *   institute-b@demo.local / demo1234
 */

const DUMMY_INSTITUTES = [
  {
    name: "Alpha B.Ed Training Institute",
    email: "institute-a@demo.local",
    password: "demo1234",
    phone: "9876500001",
    address: "12 MG Road, Block A, New Delhi",
    principal_name: "Dr. Ramesh Kumar",
    letter_head_line: "Recognised by NCTE (Demo data)",
  },
  {
    name: "Beta College of Education",
    email: "institute-b@demo.local",
    password: "demo1234",
    phone: "9876500002",
    address: "45 Station Road, Sector 3, Lucknow",
    principal_name: "Dr. Sunita Verma",
    letter_head_line: "Affiliated University — Demo",
  },
]

async function main() {
  await connectDb()
  console.log("Seeding dummy institutes…\n")

  for (const row of DUMMY_INSTITUTES) {
    const existing = await Institute.findOne({ email: row.email })
    if (existing) {
      console.log(`Skip (already exists): ${row.email}  → id ${existing._id.toString()}`)
      continue
    }

    const password_hash = bcrypt.hashSync(row.password, 10)
    const doc = await Institute.create({
      name: row.name,
      email: row.email,
      password_hash,
      phone: row.phone,
      address: row.address,
      principal_name: row.principal_name,
      letter_head_line: row.letter_head_line,
    })

    console.log(`Created: ${row.email}  → id ${doc._id.toString()}`)
    console.log(`         "${row.name}"`)
  }

  console.log("\nDone. Login with either email + password above.")
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
