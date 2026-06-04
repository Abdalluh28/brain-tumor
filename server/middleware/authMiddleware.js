const jwt = require("jsonwebtoken");
const User = require("../models/User");

const verifyJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const userId = decoded.userInfo?.id;

        if (!userId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const user = await User.findById(userId).select(
            "name email radiologyCenterId role",
        );

        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        req.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            radiologyCenterId: user.radiologyCenterId
                ? user.radiologyCenterId.toString()
                : null,
        };

        next();
    } catch {
        return res.status(403).json({ message: "Forbidden" });
    }
};

module.exports = { verifyJWT };
