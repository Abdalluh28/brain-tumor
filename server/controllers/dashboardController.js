const { default: mongoose } = require("mongoose");
const asyncHandler = require("../middleware/asyncHandler");
const Scan = require("../models/Scan");

// -----------------------------
// CLASS DISTRIBUTION
// -----------------------------
const getClassDistribution = asyncHandler(async (req, res) => {
    const result = await Scan.aggregate([
        {
            $group: {
                _id: "$prediction",
                count: { $sum: 1 },
            },
        },
    ]);

    res.json(
        result.map((r) => ({
            type: r._id,
            count: r.count,
        })),
    );
});

// -----------------------------
// MONTHLY DISTRIBUTION
// -----------------------------
const getMonthlyDistribution = asyncHandler(async (req, res) => {
    const result = await Scan.aggregate([
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                },
                count: { $sum: 1 },
            },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json(
        result.map((r) => ({
            year: r._id.year,
            month: r._id.month,
            count: r.count,
        })),
    );
});

// -----------------------------
// DASHBOARD STATS
// -----------------------------
const getStats = asyncHandler(async (req, res) => {
    const totalScans = await Scan.countDocuments();

    const avgConfidenceData = await Scan.aggregate([
        { $group: { _id: null, avg: { $avg: "$confidence" } } },
    ]);

    const avgConfidence = avgConfidenceData.length
        ? avgConfidenceData[0].avg
        : 0;

    res.json({
        totalScans,
        avgConfidence,
        modelVersion: "v1.0",
        modelAccuracy: 93.5,
    });
});

// -----------------------------
// LAST 5 SCANS
// -----------------------------
const getRecentScans = asyncHandler(async (req, res) => {
    const scans = await Scan.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("prediction confidence radiologist createdAt status");

    res.json(scans);
});

module.exports = {
    getClassDistribution,
    getMonthlyDistribution,
    getStats,
    getRecentScans,
};
