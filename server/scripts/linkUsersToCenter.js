/**
 * One-time helper: assign users to a radiology center.
 *
 * Usage:
 *   node scripts/linkUsersToCenter.js <centerId> <email1> <email2> ...
 *
 * Example:
 *   node scripts/linkUsersToCenter.js 674abc123def user1@test.com user2@test.com
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const RadiologyCenter = require("../models/RadiologyCenter");

const [, , centerId, ...emails] = process.argv;

if (!centerId || emails.length === 0) {
    console.error(
        "Usage: node scripts/linkUsersToCenter.js <centerId> <email1> [email2...]",
    );
    process.exit(1);
}

async function main() {
    const url = process.env.MONGO_URL?.trim();
    if (!url) {
        throw new Error("MONGO_URL is not configured in server/.env");
    }

    await mongoose.connect(url);

    const center = await RadiologyCenter.findById(centerId);
    if (!center) {
        throw new Error(`Radiology center not found: ${centerId}`);
    }

    const result = await User.updateMany(
        { email: { $in: emails.map((e) => e.toLowerCase()) } },
        { $set: { radiologyCenterId: center._id } },
    );

    console.log(
        `Linked ${result.modifiedCount} user(s) to "${center.name}" (${center._id})`,
    );

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
