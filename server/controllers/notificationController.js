const User = require("../models/User");
const Notification = require("../models/Notification");
const RadiologyCenter = require("../models/RadiologyCenter");
const asyncHandler = require("../middleware/asyncHandler");
const { getAdminCenter } = require("./invitationController");

const formatNotification = (notification) => ({
    id: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    invitationStatus: notification.invitationStatus ?? null,
    createdAt: notification.createdAt,
    sender: notification.senderId
        ? {
              id: notification.senderId._id,
              name: notification.senderId.name,
              email: notification.senderId.email,
          }
        : null,
    center: notification.data?.centerId
        ? {
              id: notification.data.centerId._id,
              name: notification.data.centerId.name,
          }
        : null,
    scanId: notification.data?.scanId ?? null,
});

const getNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({
        recipientId: req.user.id,
        $or: [
            {
                type: {
                    $in: [
                        "CENTER_INVITATION",
                        "ACCOUNT_ACTIVATION_REQUEST",
                        "JOIN_CENTER_REQUEST",
                    ],
                },
                invitationStatus: "pending",
            },
            {
                type: {
                    $in: ["SCAN_FINISHED", "SCAN_FAILED"],
                },
            },
        ],
    })
        .populate("senderId", "name email")
        .populate("data.centerId", "name")
        .sort({ createdAt: -1 })
        .limit(50);

    return res.json(notifications.map(formatNotification));
});

const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({
        recipientId: req.user.id,
        isRead: false,
    });

    return res.json({ count });
});

const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOne({
        _id: req.params.id,
        recipientId: req.user.id,
    });

    if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return res.json({ message: "Notification marked as read" });
});

const markAllAsRead = asyncHandler(async (req, res) => {
    const result = await Notification.updateMany(
        {
            recipientId: req.user.id,
            isRead: false,
        },
        {
            $set: {
                isRead: true,
                readAt: new Date(),
            },
        },
    );

    return res.json({
        message: "All notifications marked as read",
        modifiedCount: result.modifiedCount,
    });
});

const acceptInvitation = asyncHandler(async (req, res) => {
    const notification = await Notification.findOne({
        _id: req.params.id,
        recipientId: req.user.id,
        type: "CENTER_INVITATION",
    });

    if (!notification) {
        return res.status(404).json({ message: "Invitation not found" });
    }

    if (notification.invitationStatus !== "pending") {
        return res.status(400).json({
            message: `Invitation has already been ${notification.invitationStatus}`,
        });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "doctor") {
        return res
            .status(403)
            .json({ message: "Only doctors can accept center invitations" });
    }

    const center = await RadiologyCenter.findById(notification.data.centerId);
    if (!center) {
        return res.status(404).json({ message: "Radiology center not found" });
    }

    user.radiologyCenterId = center._id;
    await user.save();

    notification.invitationStatus = "accepted";
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    await Notification.updateMany(
        {
            _id: { $ne: notification._id },
            recipientId: user._id,
            type: "CENTER_INVITATION",
            invitationStatus: "pending",
        },
        { invitationStatus: "rejected", isRead: true, readAt: new Date() },
    );

    await Notification.updateMany(
        {
            senderId: user._id,
            type: "JOIN_CENTER_REQUEST",
            invitationStatus: "pending",
        },
        { invitationStatus: "rejected", isRead: true, readAt: new Date() },
    );

    return res.json({
        message: "Invitation accepted",
        radiologyCenterId: center._id,
        radiologyCenterName: center.name,
    });
});

const rejectInvitation = asyncHandler(async (req, res) => {
    const notification = await Notification.findOne({
        _id: req.params.id,
        recipientId: req.user.id,
        type: "CENTER_INVITATION",
    });

    if (!notification) {
        return res.status(404).json({ message: "Invitation not found" });
    }

    if (notification.invitationStatus !== "pending") {
        return res.status(400).json({
            message: `Invitation has already been ${notification.invitationStatus}`,
        });
    }

    notification.invitationStatus = "rejected";
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return res.json({ message: "Invitation rejected" });
});

const respondToActivationRequest = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const { action } = req.body;

    const { center, error } = await getAdminCenter(req.user);
    if (error) {
        return res.status(error.status).json({ message: error.message });
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.type !== "ACCOUNT_ACTIVATION_REQUEST") {
        return res.status(400).json({ message: "Invalid notification type" });
    }

    if (notification.invitationStatus !== "pending") {
        return res
            .status(400)
            .json({ message: "Request is no longer pending" });
    }

    if (notification.recipientId.toString() !== req.user.id) {
        return res.status(403).json({
            message: "You are not authorized to respond to this request",
        });
    }

    if (action === "reject") {
        notification.invitationStatus = "rejected";
        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();
        return res.json({
            message: "Activation request rejected successfully",
            action: "reject",
        });
    }

    if (action === "accept") {
        const user = await User.findById(notification.data.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (
            !user.radiologyCenterId ||
            user.radiologyCenterId.toString() !== center._id.toString()
        ) {
            return res.status(403).json({
                message: "User does not belong to your radiology center",
            });
        }

        user.status = "active";
        await user.save();

        notification.invitationStatus = "accepted";
        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();

        return res.json({
            message: "Activation request accepted successfully",
            action: "accept",
            name: user.name,
        });
    }

    return res.status(400).json({ message: "Invalid action" });
});

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    acceptInvitation,
    rejectInvitation,
    respondToActivationRequest,
};
