const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        type: {
            type: String,
            enum: ["CENTER_INVITATION", "SCAN_FINISHED", "SCAN_FAILED"],
            required: true,
        },

        title: String,

        message: String,

        data: {
            centerId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RadiologyCenter",
            },

            scanId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Scan",
            },
        },

        invitationStatus: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
        },

        isRead: {
            type: Boolean,
            default: false,
        },

        readAt: {
            type: Date,
            expires: "3d",
        },
    },
    { timestamps: true },
);

notificationSchema.index(
    {
        type: 1,
        recipientId: 1,
        "data.centerId": 1,
        invitationStatus: 1,
    },
    {
        unique: true,
        partialFilterExpression: {
            type: "CENTER_INVITATION",
            invitationStatus: "pending",
        },
    },
);

module.exports = mongoose.model("Notification", notificationSchema);
