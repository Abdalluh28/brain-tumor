const User = require("../models/User.js");
const asyncHandler = require("../middleware/asyncHandler.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const createTokens = require("../utils/createTokens.js");

const register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    // check if all fields are filled
    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
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
    });

    const { accessToken } = await createTokens(newUser, res);

    try {
        return res.json({
            accessToken,
            name: newUser.name,
            email: newUser.email,
            lastLogin: newUser.lastLogin,
            id: newUser.id,
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
        const userInfo = {
            accessToken,
            name: existingUser.name,
            email: existingUser.email,
            lastLogin: existingUser.lastLogin,
            id: existingUser.id,
        };
        return res.json(userInfo);
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

    const accessToken = jwt.sign(
        { userInfo: { id: existingUser.id } },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" },
    );

    const userInfo = {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        lastLogin: existingUser.lastLogin,
    };

    return res.json({ accessToken, userInfo });
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

module.exports = {
    register,
    login,
    refresh,
    logout,
};
