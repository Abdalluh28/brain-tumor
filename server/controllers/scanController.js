const multer = require("multer");
const asyncHandler = require("../middleware/asyncHandler");
const Scan = require("../models/Scan");
const path = require("path");
const fs = require("fs");

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
const allowedExtensions = [".nii", ".nii.gz", ".dcm", ".png", ".jpg", ".jpeg"];

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
        return cb(new Error("Only .nii, .png, .jpg allowed"));
    }

    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB per file
    },
});
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

        // ml processing goes here (fake data for now)
        const prediction = "Healthy";
        const confidenceScores = {
            Healthy: 97.6,
            GBM: 2.4,
            LGG: 0.2,
            Metastasis: 0.1,
        };
        const confidence = 97.6;
        const gradCamPath = "https://example.com/gradcam.jpg";
        const radiologist = "Dr. Smith";

        const scan = await Scan.create({
            userId: req.user.id,
            files,
            prediction,
            confidenceScores,
            confidence,
            gradCamPath,
            status: "pending",
            radiologist,
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
    // get page from url to handle pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    // get filters
    const { type, confidenceFrom, confidenceTo, status, date, search } =
        req.query;

    // build filter
    const filter = {
        userId: req.user.id,
    };

    if (type && type !== "All") {
        filter.prediction = type;
    }

    if (
        confidenceFrom &&
        confidenceFrom !== "All" &&
        confidenceTo &&
        confidenceTo !== "All"
    ) {
        filter.confidence = {
            $gte: Number(confidenceFrom),
            $lte: Number(confidenceTo),
        };
    }

    if (status && status !== "All") {
        filter.status = status;
    }

    if (date && date !== "All") {
        // get the scans from the same year only
        const start = new Date(`${date}-01-01`);
        const end = new Date(`${Number(date) + 1}-01-01`);

        filter.createdAt = {
            $gte: start,
            $lt: end,
        };
    }

    // SEARCH by scan ID or doctor name
    if (search && search.trim() !== "") {
        const searchConditions = [
            { radiologist: { $regex: search, $options: "i" } },
            {
                $expr: {
                    $regexMatch: {
                        input: { $toString: "$_id" },
                        regex: search,
                        options: "i",
                    },
                },
            },
        ];

        filter.$or = searchConditions;
    }

    // get the specific page
    const skip = (page - 1) * limit;

    const total = await Scan.countDocuments(filter);

    const scans = await Scan.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    res.json({
        scans,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalScans: total,
        start: skip + 1,
        end: skip + scans.length,
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

    scan.files.forEach((file) => {
        if (fs.existsSync(file.rawPath)) {
            fs.unlinkSync(file.rawPath);
        }
    });

    await scan.deleteOne();

    res.json({ message: "Scan deleted successfully" });
});

module.exports = {
    createScan,
    getScans,
    getScanById,
    deleteScan,
};
