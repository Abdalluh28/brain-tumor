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
            enum: [
                "CENTER_INVITATION",
                "SCAN_FINISHED",
                "SCAN_FAILED",
                "ACCOUNT_ACTIVATION_REQUEST",
                "JOIN_CENTER_REQUEST",
            ],
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

            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
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

notificationSchema.index(
    {
        type: 1,
        recipientId: 1,
        "data.scanId": 1,
    },
    {
        unique: true,
        partialFilterExpression: {
            type: "SCAN_FINISHED",
        },
    },
);

notificationSchema.index(
    {
        type: 1,
        recipientId: 1,
        "data.scanId": 1,
    },
    {
        unique: true,
        partialFilterExpression: {
            type: "SCAN_FAILED",
        },
    },
);

notificationSchema.index(
    {
        type: 1,
        recipientId: 1,
        "data.userId": 1,
        invitationStatus: 1,
    },
    {
        unique: true,
        partialFilterExpression: {
            type: "ACCOUNT_ACTIVATION_REQUEST",
            invitationStatus: "pending",
        },
    },
);

notificationSchema.index(
    {
        type: 1,
        recipientId: 1,
        senderId: 1,
        "data.centerId": 1,
        invitationStatus: 1,
    },
    {
        unique: true,
        partialFilterExpression: {
            type: "JOIN_CENTER_REQUEST",
            invitationStatus: "pending",
        },
    },
);

module.exports = mongoose.model("Notification", notificationSchema);
