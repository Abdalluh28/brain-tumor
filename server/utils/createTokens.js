const jwt = require("jsonwebtoken");
const buildUserInfo = require("./buildUserInfo");

const createTokens = async (user, res) => {
    const userInfo = buildUserInfo(user);

    const accessToken = jwt.sign(
        { userInfo },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" },
    );

    const refreshToken = jwt.sign(
        { userInfo },
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
