const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
    }

    // Create access token
    const accessToken = jwt.sign(
        { email: existingUser.email, id: existingUser._id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" },
    );

    // Send email
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Reset Password",
        text: `${process.env.FRONT_URL}/password/reset/${existingUser._id}/${accessToken}`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Reset email sent successfully" });
});

const resetPassword = asyncHandler(async (req, res) => {
    const { id, accessToken, password } = req.body;

    try {
        // Verify access token
        jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

        const hashedPassword = await bcrypt.hash(password, 12);

        // Update password
        await User.findByIdAndUpdate(id, { password: hashedPassword });

        res.status(200).json({ message: "Password reset successful" });
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
});

module.exports = {
    forgotPassword,
    resetPassword,
};
