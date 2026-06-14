const User = require("../models/User");
const RadiologyCenter = require("../models/RadiologyCenter");
const Notification = require("../models/Notification");
const asyncHandler = require("../middleware/asyncHandler");
const { getAdminCenter } = require("./invitationController");

const getRadiologyCenters = asyncHandler(async (req, res) => {
    const search = req.query.search?.trim();
    const location = req.query.location?.trim();
    const admin = req.query.admin?.trim();

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Search center name
    if (search) {
        query.name = new RegExp(search, "i");
    }

    // Location filter
    if (location) {
        query.city = location;
    }

    // Admin filter
    if (admin) {
        query.ownerId = admin;
    }

    const centers = await RadiologyCenter.find(query)
        .populate("ownerId", "name email")
        .sort({ createdAt: -1 });

    let joinRequestMap = new Map();
    let invitationMap = new Map();
    let notificationIds = new Map();

    if (req.user?.role === "doctor") {
        // Requests sent by doctor
        const joinRequests = await Notification.find({
            senderId: req.user.id,
            type: "JOIN_CENTER_REQUEST",
        }).select("data.centerId invitationStatus");

        joinRequestMap = new Map(
            joinRequests.map((request) => [
                request.data.centerId.toString(),
                request.invitationStatus,
            ]),
        );

        // Invitations received by doctor
        const invitations = await Notification.find({
            recipientId: req.user.id,
            type: "CENTER_INVITATION",
        }).select("data.centerId invitationStatus");

        // map centerId -> invitationStatus
        invitationMap = new Map(
            invitations.map((invitation) => [
                invitation.data.centerId.toString(),
                invitation.invitationStatus,
            ]),
        );

        // map centerId -> notificationId
        notificationIds = new Map(
            invitations.map((invitation) => [
                invitation.data.centerId.toString(),
                invitation._id,
            ]),
        );
    }

    const total = centers.length;

    const paginatedCenters = centers
        .slice(skip, skip + limit)
        .map((center) => ({
            ...center.toObject(),

            // Doctor -> Center
            joinRequestStatus:
                joinRequestMap.get(center._id.toString()) || null,

            // Center -> Doctor
            invitationStatus: invitationMap.get(center._id.toString()) || null,

            // Center -> Doctor
            notificationId: notificationIds.get(center._id.toString()),
        }));

    const locations = await RadiologyCenter.distinct("city");

    const adminIds = await RadiologyCenter.distinct("ownerId");

    const admins = await User.find({
        _id: { $in: adminIds },
    }).select("name");

    return res.json({
        centers: paginatedCenters,
        locations,
        admins,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCenters: total,
        start: total ? skip + 1 : 0,
        end: skip + paginatedCenters.length,
    });
});

const createRadiologyCenter = asyncHandler(async (req, res) => {
    const { name, address, city, state, zip, phone } = req.body;
    const userId = req.user.id;

    if (!name || !address || !city || !state || !zip || !phone) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findById(userId);

    // only admin can create a radiology center
    if (user.role !== "admin") {
        return res.status(403).json({
            message: "You are not authorized to create a radiology center",
        });
    }

    // admin can create a radiology center only if they are not already associated with a radiology center
    if (user.radiologyCenterId) {
        return res.status(403).json({
            message: "You are already associated with a radiology center",
        });
    }

    const radiologyCenter = await RadiologyCenter.create({
        name,
        address,
        city,
        state,
        zip,
        phone,
        ownerId: userId,
    });

    // update user's radiology center id
    user.radiologyCenterId = radiologyCenter._id;
    await user.save();

    return res.status(201).json({
        message: "Radiology center created successfully",
        id: radiologyCenter._id,
        name: radiologyCenter.name,
        address: radiologyCenter.address,
        city: radiologyCenter.city,
        state: radiologyCenter.state,
        zip: radiologyCenter.zip,
        phone: radiologyCenter.phone,
        ownerId: radiologyCenter.ownerId,
    });
});

const sendJoinCenterRequest = asyncHandler(async (req, res) => {
    const { centerId } = req.params;
    const userId = req.user.id;

    const doctor = await User.findById(userId);
    if (!doctor) {
        return res.status(404).json({ message: "User not found" });
    }

    if (doctor.role !== "doctor") {
        return res
            .status(403)
            .json({ message: "Only doctors can send join requests" });
    }

    if (
        doctor.radiologyCenterId &&
        doctor.radiologyCenterId.toString() === centerId
    ) {
        return res
            .status(400)
            .json({ message: "You are already a member of this center" });
    }

    const center = await RadiologyCenter.findById(centerId);
    if (!center) {
        return res.status(404).json({ message: "Radiology center not found" });
    }

    const admin = await User.findById(center.ownerId);
    if (!admin) {
        return res.status(404).json({ message: "Center owner not found" });
    }

    // Check if center already invited this doctor
    const existingInvitation = await Notification.findOne({
        recipientId: doctor._id,
        senderId: admin._id,
        type: "CENTER_INVITATION",
        "data.centerId": center._id,
        invitationStatus: "pending",
    });

    if (existingInvitation) {
        return res.status(400).json({
            message:
                "This center has already invited you. Please respond to the invitation instead.",
        });
    }

    try {
        const notification = await Notification.create({
            recipientId: admin._id,
            senderId: doctor._id,
            type: "JOIN_CENTER_REQUEST",
            title: `Join request for ${center.name}`,
            message: `${doctor.name} requested to join ${center.name}`,
            data: {
                centerId: center._id,
                userId: doctor._id,
            },
            invitationStatus: "pending",
        });

        return res.status(201).json({
            message: "Join request sent successfully",
            notification,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: "A join request is already pending for this center",
            });
        }
        throw error;
    }
});

const respondToJoinCenterRequest = asyncHandler(async (req, res) => {
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

    if (notification.type !== "JOIN_CENTER_REQUEST") {
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
            message: "Join request rejected successfully",
            action: "reject",
        });
    }

    if (action === "accept") {
        const doctor = await User.findById(notification.senderId);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        doctor.radiologyCenterId = notification.data.centerId;
        await doctor.save();

        notification.invitationStatus = "accepted";
        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();

        await Notification.updateMany(
            {
                senderId: notification.senderId,
                type: "JOIN_CENTER_REQUEST",
                invitationStatus: "pending",
            },
            {
                $set: {
                    invitationStatus: "rejected",
                },
            },
        );

        return res.json({
            message: "Join request accepted successfully",
            action: "accept",
            name: doctor.name,
        });
    }

    return res.status(400).json({ message: "Invalid action" });
});

module.exports = {
    getRadiologyCenters,
    createRadiologyCenter,
    sendJoinCenterRequest,
    respondToJoinCenterRequest,
};
