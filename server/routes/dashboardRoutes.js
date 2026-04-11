const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const { verifyJWT } = require("../middleware/authMiddleware");

router.get(
    "/classDistribution",
    verifyJWT,
    dashboardController.getClassDistribution,
);

router.get(
    "/monthlyDistribution",
    verifyJWT,
    dashboardController.getMonthlyDistribution,
);

router.get("/stats", verifyJWT, dashboardController.getStats);

router.get("/recentScans", verifyJWT, dashboardController.getRecentScans);

module.exports = router;
