const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const url = process.env.MONGO_URL;
        if (url) {
            await mongoose.connect(url);
            console.log("MongoDB connected");
        }
    } catch (error) {
        console.log('first')
        console.log(error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
