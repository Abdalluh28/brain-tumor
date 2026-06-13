const User = require("../models/User");
const Scan = require("../models/Scan");
const RadiologyCenter = require("../models/RadiologyCenter");
const asyncHandler = require("../middleware/asyncHandler");
const bcrypt = require("bcryptjs");

const getUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    return res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        radiologyCenterId: user.radiologyCenterId,
        status: user.status,
    });
});

const getDoctors = asyncHandler(async (req, res) => {
    if (!req.user.radiologyCenterId) {
        return res.json({
            doctors: [],
            currentPage: 1,
            totalPages: 0,
            totalDoctors: 0,
        });
    }

    const search = req.query.search?.trim();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {
        radiologyCenterId: req.user.radiologyCenterId,
        _id: { $ne: req.user.id },
    };

    if (search) {
        const searchRegex = new RegExp(search, "i");

        query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const total = await User.countDocuments(query);

    const doctors = await User.find(query)
        .select("name email createdAt updatedAt status")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit);

    const doctorIds = doctors.map((doctor) => doctor._id);

    const scanCounts = await Scan.aggregate([
        {
            $match: {
                userId: { $in: doctorIds },
            },
        },
        {
            $group: {
                _id: "$userId",
                count: { $sum: 1 },
            },
        },
    ]);

    const scanCountByDoctorId = new Map(
        scanCounts.map((entry) => [entry._id.toString(), entry.count]),
    );

    return res.json({
        doctors: doctors.map((doctor) => ({
            id: doctor._id,
            name: doctor.name,
            email: doctor.email,
            status: doctor.status,
            createdAt: doctor.createdAt,
            updatedAt: doctor.updatedAt,
            scanCount: scanCountByDoctorId.get(doctor._id.toString()) ?? 0,
        })),
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalDoctors: total,
        start: total ? skip + 1 : 0,
        end: skip + doctors.length,
    });
});

const updateUserData = async (user, data, isAdmin = false) => {
    user.name = data.name ?? user.name;

    if (data.email) {
        const existingUser = await User.findOne({
            email: data.email,
        });

        if (
            existingUser &&
            existingUser._id.toString() !== user._id.toString()
        ) {
            throw new Error("Email already in use");
        }

        user.email = data.email;
    }

    if (isAdmin && data.status) {
        user.status = data.status;
    }

    return user.save();
};

const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = await updateUserData(user, req.body);

    return res.json({
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        lastLogin: updatedUser.lastLogin,
    });
});

const updateUserByAdmin = asyncHandler(async (req, res) => {
    const admin = await User.findById(req.user.id);

    if (!admin || admin.role !== "admin") {
        return res.status(403).json({
            message: "Not authorized",
        });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json({
            message: "User not found",
        });
    }

    // Ensure the user belongs to the admin's radiology center
    if (
        user.radiologyCenterId.toString() !== admin.radiologyCenterId.toString()
    ) {
        return res.status(403).json({
            message: "You can only manage users in your radiology center",
        });
    }

    const updatedUser = await updateUserData(user, req.body, true);

    res.json({
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
    });
});

const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // delete all scans associated with the user
    await Scan.deleteMany({ userId: user._id });

    await User.deleteOne({ _id: user._id });

    return res.status(200).json({ message: "User deleted" });
});

const joinRadiologyCenter = asyncHandler(async (req, res) => {
    const { radiologyCenterId } = req.body;

    if (!radiologyCenterId) {
        return res
            .status(400)
            .json({ message: "radiologyCenterId is required" });
    }

    const center = await RadiologyCenter.findById(radiologyCenterId);
    if (!center) {
        return res.status(404).json({ message: "Radiology center not found" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    if (user.radiologyCenterId) {
        return res.status(400).json({
            message: "You are already affiliated with a radiology center",
        });
    }

    user.radiologyCenterId = center._id;
    await user.save();

    return res.json({
        message: "Joined radiology center",
        radiologyCenterId: user.radiologyCenterId,
        radiologyCenterName: center.name,
    });
});

module.exports = {
    getUser,
    getDoctors,
    updateUserProfile,
    updateUserByAdmin,
    deleteUser,
    joinRadiologyCenter,
};
