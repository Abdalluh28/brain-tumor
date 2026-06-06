const User = require("../models/User");
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
    });
});

const getDoctors = asyncHandler(async (req, res) => {
    if (!req.user.radiologyCenterId) {
        return res.json([]);
    }

    const doctors = await User.find({
        radiologyCenterId: req.user.radiologyCenterId,
        _id: { $ne: req.user.id },
    }).select("name");

    return res.json(doctors);
});

const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // update user name
    user.name = req.body.name || user.name;

    // update user email
    if (req.body.email) {
        const existingUser = await User.findOne({ email: req.body.email });
        if (
            existingUser &&
            existingUser._id.toString() !== user._id.toString()
        ) {
            return res.status(401).json({
                message: "Email already in use",
                id: existingUser._id,
                name: existingUser.name,
                email: existingUser.email,
            });
        }
        user.email = req.body.email;
    }

    const updatedUser = await user.save();

    return res.json({
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        lastLogin: updatedUser.lastLogin,
    });
});

const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    await User.deleteOne({ _id: user._id });

    return res.status(200).json({ message: "User deleted" });
});

const joinRadiologyCenter = asyncHandler(async (req, res) => {
    const { radiologyCenterId } = req.body;

    if (!radiologyCenterId) {
        return res.status(400).json({ message: "radiologyCenterId is required" });
    }

    const center = await RadiologyCenter.findById(radiologyCenterId);
    if (!center) {
        return res.status(404).json({ message: "Radiology center not found" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
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
    deleteUser,
    joinRadiologyCenter,
};
