const User = require("../models/User.js");
const RadiologyCenter = require("../models/RadiologyCenter.js");
const asyncHandler = require("../middleware/asyncHandler.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const createTokens = require("../utils/createTokens.js");
const buildUserInfo = require("../utils/buildUserInfo.js");

const register = asyncHandler(async (req, res) => {
    const { name, email, password, radiologyCenterId } = req.body;

    // check if all fields are filled
    if (!name || !email || !password || !radiologyCenterId) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const center = await RadiologyCenter.findOne({ radiologyCenterId });
    if (!center) {
        return res.status(400).json({ message: "Radiology center not found" });
    }

    // check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(401).json({ message: "User already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        lastLogin: new Date(),
        radiologyCenter: center._id,
    });

    const { accessToken } = await createTokens(newUser, res);

    try {
        return res.json({
            accessToken,
            ...buildUserInfo(newUser),
            lastLogin: newUser.lastLogin,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // check if all fields are filled
    if (!email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    // check if user exists
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
        return res.status(400).json({ message: "User does not exist" });
    }

    // check if password is correct
    const passwordMatch = await bcrypt.compare(password, existingUser.password);
    if (!passwordMatch) {
        return res.status(402).json({ message: "Incorrect password" });
    }

    // update last login
    existingUser.lastLogin = new Date();
    await existingUser.save();

    const { accessToken } = await createTokens(existingUser, res);
    try {
        return res.json({
            accessToken,
            ...buildUserInfo(existingUser),
            lastLogin: existingUser.lastLogin,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

const refresh = asyncHandler(async (req, res) => {
    const cookies = req.cookies;

    if (!cookies?.jwt) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const refreshToken = cookies.jwt;

    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
        return res.status(403).json({ message: "Forbidden" });
    }

    const existingUser = await User.findById(decoded.userInfo.id);
    if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
    }

    const userInfo = buildUserInfo(existingUser);

    const accessToken = jwt.sign(
        { userInfo },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" },
    );

    return res.json({
        accessToken,
        userInfo: {
            ...userInfo,
            lastLogin: existingUser.lastLogin,
        },
    });
});

const logout = asyncHandler(async (req, res) => {
    if (!req.cookies?.jwt) {
        return res.sendStatus(204);
    }

    res.clearCookie("jwt", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    });

    return res.json({ message: "Logout successful" });
});

const createRadiologyCenter = asyncHandler(async (req, res) => {
    const { radiologyCenterId, name, address, city, zip, phone } = req.body;

    if (!radiologyCenterId || !name || !address || !city || !zip || !phone) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const existingCenter = await RadiologyCenter.findOne({ radiologyCenterId });
    if (existingCenter) {
        return res
            .status(400)
            .json({ message: "Radiology center with this ID already exists" });
    }

    // Create new radiology center
    const newRadiologyCenter = await RadiologyCenter.create({
        radiologyCenterId,
        name,
        address,
        city,
        zip,
        phone,
    });

    return res.json({
        message: "Radiology center created",
        radiologyCenter: newRadiologyCenter,
    });
});

module.exports = {
    register,
    login,
    refresh,
    logout,
    createRadiologyCenter,
};
