const mongoose = require("mongoose");

const radiologyCenterSchema = new mongoose.Schema(
    {
        radiologyCenterId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        address: {
            type: String,
            required: true,
            trim: true,
        },
        city: {
            type: String,
            required: true,
            trim: true,
        },
        zip: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true, // creates createdAt & updatedAt automatically
    },
);

module.exports = mongoose.model("RadiologyCenter", radiologyCenterSchema);
