const multer = require("multer");
const asyncHandler = require("../middleware/asyncHandler");
const Scan = require("../models/Scan");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");

// ------------------
// Multer Local Storage (Better for ML processing)
// ------------------

const getFileExtension = (filename) => {
    if (filename.toLowerCase().endsWith(".nii.gz")) {
        return ".nii.gz";
    }

    return path.extname(filename).toLowerCase();
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "..", "uploads", "raw");
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueName + getFileExtension(file.originalname));
    },
});
const allowedExtensions = [".nii", ".nii.gz", ".dcm", ".png", ".jpg", ".jpeg"];

const fileFilter = (req, file, cb) => {
    const ext = getFileExtension(file.originalname);

    if (!allowedExtensions.includes(ext)) {
        return cb(
            new Error("Only .nii, .nii.gz, .dcm, .png, .jpg, .jpeg allowed"),
        );
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

const postJson = (url, payload) =>
    new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const body = JSON.stringify(payload);
        const client = parsedUrl.protocol === "https:" ? https : http;

        const request = client.request(
            {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: `${parsedUrl.pathname}${parsedUrl.search}`,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(body),
                },
            },
            (response) => {
                let responseBody = "";

                response.setEncoding("utf8");
                response.on("data", (chunk) => {
                    responseBody += chunk;
                });

                response.on("end", () => {
                    let parsedBody;

                    try {
                        parsedBody = responseBody
                            ? JSON.parse(responseBody)
                            : {};
                    } catch {
                        parsedBody = { message: responseBody };
                    }

                    if (
                        response.statusCode >= 200 &&
                        response.statusCode < 300
                    ) {
                        resolve(parsedBody);
                    } else {
                        const message =
                            parsedBody.detail ||
                            parsedBody.message ||
                            "Model service request failed";
                        reject(new Error(message));
                    }
                });
            },
        );

        request.on("error", reject);
        request.write(body);
        request.end();
    });

const removeUploadedFiles = (files = []) => {
    files.forEach((file) => {
        if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    });
};

// ------------------
// Create Scan
// ------------------
// ------------------
// Create Scan
// ------------------
const createScan = asyncHandler(async (req, res) => {
    uploadFiles(req, res, async function (err) {
        if (err) {
            removeUploadedFiles(req.files);
            return res.status(400).json({ message: err.message });
        }

        try {
            // ------------------
            // Validate Patient Data
            // ------------------
            const {
                patientName,
                patientId,
                patientAge,
                patientGender,
                patientPhone,
                notes,
                scanType,
            } = req.body;
            console.log(req.body)

            if (
                !patientName ||
                !patientId ||
                !patientAge ||
                !patientGender ||
                !patientPhone ||
                !scanType
            ) {
                removeUploadedFiles(req.files);

                return res.status(400).json({
                    message: "All patient information is required",
                });
            }

            // ------------------
            // Validate Files
            // ------------------
            if (!req.files || req.files.length !== 4) {
                removeUploadedFiles(req.files);

                return res.status(400).json({
                    message: "Exactly 4 MRI files are required",
                });
            }

            // ------------------
            // Prepare Files
            // ------------------
            const files = req.files.map((file, index) => ({
                rawPath: path.resolve(file.path),
                format: getFileExtension(file.originalname).replace(".", ""),
                originalName: file.originalname,
                slot: index + 1,
            }));

            const modelApiUrl =
                process.env.MODEL_API_URL ||
                "http://127.0.0.1:8000/scans/analyze";

            let scan;

            try {
                // ------------------
                // Send To FastAPI
                // ------------------
                const result = await postJson(modelApiUrl, {
                    userId: req.user.id,

                    // Patient Info
                    patientName,
                    patientId,
                    patientAge,
                    patientGender,
                    patientPhone,
                    notes,
                    scanType,

                    // Files
                    files,

                    radiologist: req.body.name,

                    backendPublicUrl:
                        process.env.BACKEND_PUBLIC_URL ||
                        `http://localhost:${process.env.PORT || 3000}`,
                });

                scan = result.scan;
            } catch (error) {
                removeUploadedFiles(req.files);

                return res.status(502).json({
                    message: `Model service failed: ${error.message}`,
                });
            }

            res.status(201).json({
                message: "Scan uploaded and analyzed successfully",
                scan,
            });
        } catch (error) {
            removeUploadedFiles(req.files);

            res.status(500).json({
                message: error.message,
            });
        }
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
    const {
        type,
        confidenceFrom,
        confidenceTo,
        status,
        startDate,
        endDate,
        search,
    } = req.query;

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
        filter.status = status.toLowerCase();
    }
    // Filter by start/end date
    // Filter by start/end date
    if (startDate || endDate) {
        filter.createdAt = {};

        // Start date
        if (startDate) {
            filter.createdAt.$gte = new Date(startDate);
        }

        // End date
        if (endDate) {
            const end = new Date(endDate);

            // Include full end day
            end.setHours(23, 59, 59, 999);

            filter.createdAt.$lte = end;
        }
    }

    // SEARCH by scan ID or doctor name
    if (search && search.trim() !== "") {
        const searchConditions = [
            { radiologist: { $regex: search, $options: "i" } },

            { patientName: { $regex: search, $options: "i" } },

            { patientId: { $regex: search, $options: "i" } },

            { patientPhone: { $regex: search, $options: "i" } },

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
