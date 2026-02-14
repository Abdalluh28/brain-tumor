const multer = require("multer");
const asyncHandler = require("../middleware/asyncHandler");
const Scan = require("../models/Scan");
const path = require("path");

// ------------------
// Multer Local Storage (Better for ML processing)
// ------------------
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/raw"); // create this folder
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueName + path.extname(file.originalname));
    },
});

const upload = multer({ storage });
const uploadFiles = upload.array("files", 4);

// ------------------
// Create Scan
// ------------------
const createScan = asyncHandler(async (req, res) => {
    uploadFiles(req, res, async function (err) {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        if (!req.files || req.files.length !== 4) {
            return res.status(400).json({
                message: "Exactly 4 MRI files are required",
            });
        }

        // Build files array matching your schema
        const files = req.files.map((file, index) => ({
            rawPath: file.path,
            format: path
                .extname(file.originalname)
                .replace(".", "")
                .toLowerCase(),
        }));

        const scan = await Scan.create({
            userId: req.user._id,
            files,
            status: "review",
        });

        res.status(201).json({
            message: "Scan uploaded successfully",
            scan,
        });
    });
});

// ------------------
// Get All Scans
// ------------------
const getScans = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const skip = (page - 1) * limit;

    const total = await Scan.countDocuments({
        userId: req.user._id,
    });

    const scans = await Scan.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    res.json({
        scans,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalScans: total,
    });
});

// ------------------
// Get Single Scan
// ------------------
const getScanById = asyncHandler(async (req, res) => {
    const scan = await Scan.findById(req.params.id);

    if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
    }

    res.json(scan);
});

// ------------------
// Delete Scan
// ------------------
const deleteScan = asyncHandler(async (req, res) => {
    const scan = await Scan.findById(req.params.id);

    if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
    }

    await scan.deleteOne();

    res.json({ message: "Scan deleted successfully" });
});

module.exports = {
    createScan,
    getScans,
    getScanById,
    deleteScan,
};
