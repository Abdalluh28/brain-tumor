const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const url = process.env.MONGO_URL?.trim();
        if (!url) {
            throw new Error("MONGO_URL is not configured");
        }

        await mongoose.connect(url, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);

        if (["ECONNREFUSED", "ETIMEOUT", "ENOTFOUND"].includes(error.code)) {
            console.error(
                "Check your DNS/network connection to MongoDB Atlas, or use a local MongoDB URI.",
            );
        }

        process.exit(1);
    }
};

module.exports = connectDB;
