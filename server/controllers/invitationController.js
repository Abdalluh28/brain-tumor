const User = require("../models/User");
const RadiologyCenter = require("../models/RadiologyCenter");
const Notification = require("../models/Notification");
const asyncHandler = require("../middleware/asyncHandler");

const getAdminCenter = async (user) => {
    if (user.role !== "admin") {
        return {
            error: {
                status: 403,
                message: "Only admins can manage invitations",
            },
        };
    }

    if (!user.radiologyCenterId) {
        return {
            error: {
                status: 400,
                message: "You must be associated with a radiology center",
            },
        };
    }

    const center = await RadiologyCenter.findById(user.radiologyCenterId);
    if (!center || center.ownerId.toString() !== user.id) {
        return {
            error: {
                status: 403,
                message:
                    "You are not authorized to manage invitations for this center",
            },
        };
    }

    return { center };
};

const calculateExperience = (createdAt) => {
    const today = new Date();
    let years = today.getFullYear() - createdAt.getFullYear();

    const monthDiff = today.getMonth() - createdAt.getMonth();

    if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < createdAt.getDate())
    ) {
        years--;
    }

    return years;
};

const getAvailableDoctors = asyncHandler(async (req, res) => {
    const { center, error } = await getAdminCenter(req.user);
    if (error) {
        return res.status(error.status).json({ message: error.message });
    }

    const search = req.query.search?.trim();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {
        role: "doctor",
        radiologyCenterId: { $ne: center._id },
        _id: { $ne: req.user.id },
    };

    if (search) {
        const searchRegex = new RegExp(search, "i");
        query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const total = await User.countDocuments(query);

    const doctors = await User.find(query)
        .select("name email createdAt updatedAt radiologyCenterId status")
        .populate("radiologyCenterId", "name")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit);

    const pendingInvites = await Notification.find({
        type: "CENTER_INVITATION",
        senderId: req.user.id,
        "data.centerId": center._id,
        invitationStatus: "pending",
    }).select("recipientId");

    const pendingJoinRequests = await Notification.find({
        type: "JOIN_CENTER_REQUEST",
        "data.centerId": center._id,
        invitationStatus: "pending",
    }).select("senderId _id");

    const invitedDoctorIds = new Set(
        pendingInvites.map((invite) => invite.recipientId.toString()),
    );

    const joinRequestMap = new Map(
        pendingJoinRequests.map((n) => [
            n.senderId.toString(),
            n._id.toString(),
        ]),
    );

    return res.json({
        doctors: doctors.map((doctor) => ({
            id: doctor._id,
            name: doctor.name,
            email: doctor.email,
            createdAt: doctor.createdAt,
            updatedAt: doctor.updatedAt,
            status: doctor.status,

            experience: calculateExperience(doctor.createdAt),

            radiologyCenter: doctor.radiologyCenterId
                ? {
                      id: doctor.radiologyCenterId._id,
                      name: doctor.radiologyCenterId.name,
                  }
                : null,

            invitationStatus: invitedDoctorIds.has(doctor._id.toString())
                ? "pending"
                : null,

            joinRequestStatus: joinRequestMap.has(doctor._id.toString())
                ? "pending"
                : null,

            joinRequestNotificationId:
                joinRequestMap.get(doctor._id.toString()) || null,
        })),

        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalDoctors: total,
        start: skip + 1,
        end: skip + doctors.length,
    });
});

const sendInvitation = asyncHandler(async (req, res) => {
    const { center, error } = await getAdminCenter(req.user);
    if (error) {
        return res.status(error.status).json({ message: error.message });
    }

    const { doctorId, email } = req.body;
    if (!doctorId && !email) {
        return res
            .status(400)
            .json({ message: "doctorId or email is required" });
    }

    let doctor;
    if (doctorId) {
        doctor = await User.findById(doctorId);
    } else {
        doctor = await User.findOne({
            email: email.toLowerCase().trim(),
        });
    }

    if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
    }

    if (doctor.role !== "doctor") {
        return res
            .status(400)
            .json({ message: "Invitations can only be sent to doctors" });
    }

    if (
        doctor.radiologyCenterId &&
        doctor.radiologyCenterId.toString() === center._id.toString()
    ) {
        return res.status(400).json({
            message: "Doctor is already in your radiology center",
        });
    }

    const existingInvite = await Notification.findOne({
        type: "CENTER_INVITATION",
        recipientId: doctor._id,
        "data.centerId": center._id,
        invitationStatus: "pending",
    });

    if (existingInvite) {
        return res.status(409).json({
            message: "An invitation is already pending for this doctor",
        });
    }

    const notification = await Notification.create({
        recipientId: doctor._id,
        senderId: req.user.id,
        type: "CENTER_INVITATION",
        title: `Invitation to join ${center.name}`,
        message: `${req.user.name} invited you to join ${center.name}`,
        data: { centerId: center._id },
        invitationStatus: "pending",
    });

    return res.status(201).json({
        message: "Invitation sent successfully",
        invitation: {
            id: notification._id,
            recipientId: notification.recipientId,
            recipientName: doctor.name,
            invitationStatus: notification.invitationStatus,
            createdAt: notification.createdAt,
        },
    });
});

const getSentInvitations = asyncHandler(async (req, res) => {
    const { center, error } = await getAdminCenter(req.user);
    if (error) {
        return res.status(error.status).json({ message: error.message });
    }

    const invitations = await Notification.find({
        type: "CENTER_INVITATION",
        senderId: req.user.id,
        "data.centerId": center._id,
    })
        .populate("recipientId", "name email")
        .sort({ createdAt: -1 });

    return res.json(
        invitations.map((invitation) => ({
            id: invitation._id,
            invitationStatus: invitation.invitationStatus,
            createdAt: invitation.createdAt,
            doctor: invitation.recipientId
                ? {
                      id: invitation.recipientId._id,
                      name: invitation.recipientId.name,
                      email: invitation.recipientId.email,
                  }
                : null,
        })),
    );
});

const sendActivationNotification = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    if (user.status === "active") {
        return res.status(400).json({ message: "User is already active" });
    }

    if (!user.radiologyCenterId) {
        return res.status(400).json({
            message: "You must be associated with a radiology center",
        });
    }

    const center = await RadiologyCenter.findById(user.radiologyCenterId);
    if (!center) {
        return res.status(404).json({ message: "Radiology center not found" });
    }

    const admin = await User.findById(center.ownerId);
    if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
    }

    try {
        const notification = await Notification.create({
            recipientId: admin._id,
            senderId: user._id,
            type: "ACCOUNT_ACTIVATION_REQUEST",
            title: `Activation request for ${center.name}`,
            message: `${user.name} has requested activation for his account`,
            data: { userId: user._id },
            invitationStatus: "pending",
        });

        return res.status(201).json({
            message: "Activation request sent successfully",
            notification,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Activation request already exists, please wait",
            });
        }

        throw error;
    }
});

module.exports = {
    getAdminCenter,
    getAvailableDoctors,
    sendInvitation,
    getSentInvitations,
    sendActivationNotification,
};
