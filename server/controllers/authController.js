const User = require("../models/User.js");
const asyncHandler = require("../middleware/asyncHandler.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const createTokens = require('../utils/createTokens.js')

const register = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    // check if all fields are filled
    if (!name || !email || !password || !role) {
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
    const newUser = await User.create({ name, email, password: hashedPassword, role, lastLogin: new Date() });


    const { accessToken, refreshToken } = await createTokens(newUser, res);

    try {
        return res.json({
            accessToken,
            refreshToken,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            lastLogin: newUser.lastLogin,
            id: newUser._id
        })

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }

})


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
    

    const { accessToken, refreshToken } = await createTokens(existingUser, res);
    try {
        const userInfo = {
            accessToken,
            refreshToken,
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role,
            lastLogin: existingUser.lastLogin,
            id: existingUser._id,
        };
        res.cookie('userInfo', JSON.stringify(userInfo), { httpOnly: true, sameSite: 'None', secure: process.env.NODE_ENV === 'production' });
        return res.json(userInfo);

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});



const refresh = asyncHandler(async (req, res) => {
    const cookies = req.cookies;

    // check if refresh token exists
    if (!cookies?.jwt) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    // check if refresh token is valid
    const refreshToken = cookies.jwt;
    const userInfo = cookies.userInfo;
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
        if (err) {
            // Refresh token is invalid or expired
            return res.status(403).json({ message: "Forbidden" });
        }


        const existingUser = await User.findById(decoded.userInfo.id);

        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Create new access token
        const accessToken = jwt.sign({
            userInfo: {
                id: existingUser._id,
            }
        }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' })

        return res.json({ accessToken, userInfo })
    })
})


const logout = asyncHandler(async (req, res) => {
    const cookies = req.cookies;

    const { id } = req.body;
    

    const existingUser = await User.findById(id);

    if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
    }


    
    if (!cookies?.jwt) {
        return res.sendStatus(204);
    }

    res.clearCookie('jwt', {
        httpOnly: true,
        sameSite: 'None',
        secure: process.env.NODE_ENV === 'production',
    })

    return res.json({ 'message': 'Cookie cleared' })

})

module.exports = {
    register,
    login,
    refresh,
    logout
}
