const jwt = require("jsonwebtoken");

const createTokens = async (user, res) => {
    const accessToken = jwt.sign(
        {
            userInfo: {
                id: user._id,
                role: user.role,
            },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1m" },
    );

    const refreshToken = jwt.sign(
        {
            userInfo: {
                id: user._id,
                role: user.role,
            },
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "30d" },
    );

    res.cookie("jwt", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { accessToken, refreshToken };
};

module.exports = createTokens;
