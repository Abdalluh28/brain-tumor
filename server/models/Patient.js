const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    patientId: {
        type: String,
        trim: true,
    },
    name: {
        type: String,
        required: true,
    },
    age: {
        type: Number,
        required: true,
    },
    gender: {
        type: String,
        enum: ["male", "female"],
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        trim: true,
    },
    notes: {
        type: String,
        default: "",
    },
}, {
    timestamps: true,
});

patientSchema.index({ userId: 1, patientId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Patient", patientSchema);
