const jwt = require("jsonwebtoken");

const createTokens = async (user, res) => {
    const accessToken = jwt.sign(
        {
            userInfo: {
                id: user._id,
                isAdmin: user.isAdmin,
            },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" },
    );

    const refreshToken = jwt.sign(
        {
            userInfo: {
                id: user._id,
                isAdmin: user.isAdmin,
            },
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "30d" },
    );

    res.cookie("jwt", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { accessToken, refreshToken };
};

module.exports = createTokens;
