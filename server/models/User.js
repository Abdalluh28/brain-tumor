const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
        },

        lastLogin: {
            type: Date,
        },
        radiologyCenterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RadiologyCenter",
        },
    },
    {
        timestamps: true, // creates createdAt & updatedAt automatically
    },
);

module.exports = mongoose.model("User", userSchema);
