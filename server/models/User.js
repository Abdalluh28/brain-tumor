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
            trim: true,
        },

        password: {
            type: String,
            required: true,
        },

        lastLogin: {
            type: Date,
        },

        role: {
            type: String,
            enum: ["admin", "doctor"],
            default: "doctor",
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },

        radiologyCenterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RadiologyCenter",
            default: null,
        },
    },
    {
        timestamps: true, // creates createdAt & updatedAt automatically
    },
);

module.exports = mongoose.model("User", userSchema);
