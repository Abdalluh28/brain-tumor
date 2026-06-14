const multer = require("multer");
const asyncHandler = require("../middleware/asyncHandler");
const Scan = require("../models/Scan");
const Patient = require("../models/Patient");
const User = require("../models/User");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const getOrCreatePatient = require("./helpers/getOrCreatePatient");
const {
    applyActiveXaiView,
    collectXaiAssetPaths,
    hasCachedXaiView,
    mergeXaiResult,
    normalizeXaiDocument,
    pickXaiPreviewPath,
} = require("../helpers/xaiCache");
const Notification = require("../models/Notification");

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
const imageExtensions = [".png", ".jpg", ".jpeg"];
const volumeExtensions = [".nii", ".nii.gz", ".dcm"];
const allowedExtensions = [...imageExtensions, ...volumeExtensions];

const fileFilter = (req, file, cb) => {
    const ext = getFileExtension(file.originalname);

    if (!allowedExtensions.includes(ext)) {
        return cb(
            new Error(
                "Only image files (.png, .jpg, .jpeg) or 3D medical volumes (.nii, .nii.gz, .dcm) are allowed",
            ),
        );
    }

    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
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

const toObjectIdString = (value) => {
    if (!value) {
        return null;
    }

    if (typeof value === "string") {
        return value;
    }

    if (value._id) {
        return value._id.toString();
    }

    return value.toString();
};

const saveNewPatient = async (patientPayload, userId) => {
    const patientData = patientPayload.modelPayload;

    if (patientPayload.patient) {
        return patientPayload.patient;
    }

    const user = await User.findById(userId).select("radiologyCenterId");

    const createPayload = {
        userId,
        radiologyCenterId: user?.radiologyCenterId,
        name: patientData.patientName,
        age: patientData.patientAge,
        gender: patientData.patientGender,
        phone: patientData.patientPhone,
        email: patientData.patientEmail,
        notes: patientData.notes || "",
    };

    if (patientData.patientId) {
        createPayload.patientId = patientData.patientId;
    }

    return Patient.create(createPayload);
};

const normalizeReturnedScanPatient = async (scan, patientPayload, userId) => {
    if (!scan?._id || scan.patient) {
        return scan;
    }

    const patient = await saveNewPatient(patientPayload, userId);

    const updatedScan = await Scan.findByIdAndUpdate(
        scan._id,
        {
            $set: { patient: patient._id },
            $unset: {
                patientName: "",
                patientId: "",
                patientAge: "",
                patientGender: "",
                patientPhone: "",
                notes: "",
            },
        },
        { new: true, strict: false },
    ).populate("patient");

    return updatedScan || { ...scan, patient: toObjectIdString(patient._id) };
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
            // Validate User
            // ------------------
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            if (user.status === "inactive") {
                return res
                    .status(403)
                    .json({ message: "Your account is inactive" });
            }

            // ------------------
            // Validate Patient Data
            // ------------------
            const { scanType } = req.body;

            let patientPayload;

            try {
                patientPayload = await getOrCreatePatient(
                    req.body,
                    req.user.id,
                );
            } catch (error) {
                removeUploadedFiles(req.files);

                return res
                    .status(error.message === "Patient not found" ? 404 : 400)
                    .json({
                        message: error.message,
                    });
            }

            if (!patientPayload?.modelPayload || !scanType) {
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
                    message:
                        "Exactly 4 modality files are required for analysis",
                });
            }

            const receivedExtensions = req.files.map((file) =>
                getFileExtension(file.originalname),
            );
            const allImages = receivedExtensions.every((ext) =>
                imageExtensions.includes(ext),
            );
            const allVolumes = receivedExtensions.every((ext) =>
                volumeExtensions.includes(ext),
            );

            if (scanType === "MRI" && !allImages) {
                removeUploadedFiles(req.files);

                return res.status(400).json({
                    message:
                        "MRI analysis expects image files: .png, .jpg, or .jpeg",
                });
            }

            if (scanType === "3D" && !allVolumes) {
                removeUploadedFiles(req.files);

                return res.status(400).json({
                    message:
                        "3D analysis expects medical volume files: .nii, .nii.gz, or .dcm",
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
                    ...patientPayload.modelPayload,
                    scanType,

                    // Files
                    files,

                    radiologist: req.user.name || "Unknown Radiologist",

                    backendPublicUrl:
                        process.env.BACKEND_PUBLIC_URL ||
                        `http://localhost:${process.env.PORT || 3000}`,
                });

                scan = result.scan;
                scan = await normalizeReturnedScanPatient(
                    scan,
                    patientPayload,
                    req.user.id,
                );

                // Ensure RadiologyCenterId is saved with the scan for fast authorization lookups
                if (user.radiologyCenterId) {
                    await Scan.findByIdAndUpdate(scan._id, {
                        $set: { RadiologyCenterId: user.radiologyCenterId }
                    });
                    scan.RadiologyCenterId = user.radiologyCenterId;
                }
            } catch (error) {
                removeUploadedFiles(req.files);

                return res.status(502).json({
                    message: `Model service failed: ${error.message}`,
                });
            }

            const notification = await Notification.create({
                recipientId: req.user.id,
                data: {
                    scanId: scan._id,
                },
                type: "SCAN_FINISHED",
                message: `Scan ${scan._id} uploaded and analyzed successfully`,
                isRead: false,
            })

            res.status(201).json({
                message: "Scan uploaded and analyzed successfully",
                scan,
                notification
            });
        } catch (error) {
            removeUploadedFiles(req.files);

            res.status(500).json({
                message: error.message,
            });
        }
    });
});

// Helper to convert internal file paths to public URLs for frontend access
const UPLOADS_MARKER = "/uploads/";

const getPublicBaseUrl = (req) => {
    const configured = process.env.BACKEND_PUBLIC_URL?.replace(/\/$/, "");
    if (configured) {
        return configured;
    }

    const proto =
        req?.headers?.["x-forwarded-proto"] || req?.protocol || "http";
    const host = req?.headers?.["x-forwarded-host"] || req?.get?.("host");
    if (host) {
        return `${proto}://${host}`;
    }

    return `http://localhost:${process.env.PORT || 3000}`;
};

const toPublicUrl = (rawPath, baseUrl) => {
    if (!rawPath) return null;

    const base = (baseUrl || getPublicBaseUrl()).replace(/\/$/, "");
    const normalized = String(rawPath).replace(/\\/g, "/");

    let relative = null;

    if (normalized.includes(UPLOADS_MARKER)) {
        relative = normalized.split(UPLOADS_MARKER)[1]?.replace(/^\//, "");
    }

    if (!relative) {
        const localMarker = path
            .join(__dirname, "..", "uploads")
            .replace(/\\/g, "/");
        if (normalized.includes(localMarker)) {
            relative = normalized.split(localMarker)[1]?.replace(/^\//, "");
        }
    }

    if (relative && !relative.includes("undefined")) {
        return `${base}${UPLOADS_MARKER}${relative}`;
    }

    // External URL without a local uploads segment — return as-is.
    if (/^https?:\/\//i.test(normalized)) {
        return normalized;
    }

    return null;
};

const filePublicUrl = (file, baseUrl) =>
    toPublicUrl(file?.storagePath, baseUrl) ??
    toPublicUrl(file?.rawPath, baseUrl);

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
        doctor,
    } = req.query;

    // build filter
    const filter = {};

    // One doctor at a time: default = logged-in user; otherwise a center colleague
    if (!doctor || doctor === "me") {
        // Current doctor only
        filter.userId = req.user.id;
    } else if (doctor === "all") {
        // All doctors in the same radiology center
        if (req.user.radiologyCenterId) {
            const centerDoctors = await User.find({
                radiologyCenterId: req.user.radiologyCenterId,
            }).select("_id");

            filter.$or = [
                { RadiologyCenterId: req.user.radiologyCenterId },
                { userId: { $in: centerDoctors.map((doctor) => doctor._id) } },
            ];
        } else {
            // User has no center, fallback to own scans
            filter.userId = req.user.id;
        }
    } else {
        // Specific doctor
        const selectedDoctor = await User.findOne({
            _id: doctor,
            radiologyCenterId: req.user.radiologyCenterId,
        }).select("_id");

        if (!selectedDoctor) {
            return res.status(403).json({
                message: "You are not allowed to view this doctor's scans",
            });
        }

        filter.userId = selectedDoctor._id;
    }

    if (type && type !== "All") {
        filter.prediction = type;
    }

    if (
        confidenceFrom &&
        confidenceFrom !== "All" &&
        confidenceTo &&
        confidenceTo !== "All"
    ) {
        const getDisplayConfidence = {
            $switch: {
                branches: [
                    {
                        case: { $eq: ["$prediction", "HGG"] },
                        then: "$confidenceScores.HGG",
                    },
                    {
                        case: { $eq: ["$prediction", "LGG"] },
                        then: "$confidenceScores.LGG",
                    },
                    {
                        case: { $eq: ["$prediction", "Metastasis"] },
                        then: "$confidenceScores.Metastasis",
                    },
                    {
                        case: { $eq: ["$prediction", "Healthy"] },
                        then: "$confidenceScores.Healthy",
                    },
                    {
                        case: { $eq: ["$prediction", "Others"] },
                        then: "$confidenceScores.Others",
                    },
                ],
                default: "$confidence",
            },
        };

        filter.$expr = {
            $and: [
                { $gte: [getDisplayConfidence, Number(confidenceFrom)] },
                { $lte: [getDisplayConfidence, Number(confidenceTo)] },
            ],
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

    // SEARCH by doctor name or patient name
    if (search && search.trim() !== "") {
        let centerCondition = { userId: req.user.id };

        if (req.user.radiologyCenterId) {
            const centerUsers = await User.find({
                radiologyCenterId: req.user.radiologyCenterId,
            }).select("_id");
            const centerUserIds = centerUsers.map((u) => u._id);

            centerCondition = {
                $or: [
                    { radiologyCenterId: req.user.radiologyCenterId },
                    { userId: { $in: centerUserIds } },
                ],
            };
        }

        const matchingPatients = await Patient.find({
            ...centerCondition,
            name: { $regex: search, $options: "i" },
        }).select("_id");

        const searchConditions = [
            { radiologist: { $regex: search, $options: "i" } },

            {
                patient: {
                    $in: matchingPatients.map((patient) => patient._id),
                },
            },
        ];

        filter.$or = searchConditions;
    }

    // get the specific page
    const skip = (page - 1) * limit;

    const total = await Scan.countDocuments(filter);

    const scans = await Scan.find(filter)
        .populate("patient")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    for (const scan of scans) {
        const publicBaseUrl = getPublicBaseUrl(req);
        scan.files = scan.files?.map((f) => ({
            ...f,
            url: filePublicUrl(f, publicBaseUrl),
        }));
        if (scan.xai) {
            scan.xai = normalizeXaiDocument(scan.xai);
        }
    }

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
    let scan;
    try {
        scan = await Scan.findById(req.params.id).populate("patient");
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(404).json({ message: "Scan not found" });
        }
        throw error;
    }

    if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
    }

    const userCenterId = req.user.radiologyCenterId;
    if (!userCenterId) {
        return res.status(403).json({
            message: "Forbidden: You are not assigned to a radiology center",
        });
    }

    let scanCenterId = scan.RadiologyCenterId;

    // Fallback for legacy scans without RadiologyCenterId
    if (!scanCenterId && scan.userId) {
        const uploader = await User.findById(scan.userId).select("radiologyCenterId").lean();
        scanCenterId = uploader ? uploader.radiologyCenterId : null;
    }

    if (!scanCenterId || String(scanCenterId) !== String(userCenterId)) {
        return res.status(403).json({
            message: "Forbidden: You do not have access to this scan.",
        });
    }

    const scanObject = scan.toObject({ virtuals: true });
    const publicBaseUrl = getPublicBaseUrl(req);
    scanObject.files = scanObject.files?.map((f) => ({
        ...f,
        url: filePublicUrl(f, publicBaseUrl),
    }));
    if (scanObject.gradCamPath) {
        scanObject.gradCamPath =
            toPublicUrl(scanObject.gradCamPath, publicBaseUrl) ??
            scanObject.gradCamPath;
    }
    if (scanObject.xai) {
        scanObject.xai = normalizeXaiDocument(scanObject.xai);
    }

    res.json(scanObject);
});

// ------------------
// Re-run XAI (no segmentation)
// ------------------
const runScanXai = asyncHandler(async (req, res) => {
    let scan;
    try {
        scan = await Scan.findById(req.params.id);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(404).json({ message: "Scan not found" });
        }
        throw error;
    }

    if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
    }

    const userCenterId = req.user.radiologyCenterId;
    if (!userCenterId) {
        return res.status(403).json({
            message: "Forbidden: You are not assigned to a radiology center",
        });
    }

    let scanCenterId = scan.RadiologyCenterId;
    if (!scanCenterId && scan.userId) {
        const uploader = await User.findById(scan.userId).select("radiologyCenterId").lean();
        scanCenterId = uploader ? uploader.radiologyCenterId : null;
    }

    if (!scanCenterId || String(scanCenterId) !== String(userCenterId)) {
        return res.status(403).json({
            message: "Forbidden: You do not have access to run XAI on this scan.",
        });
    }

    const methodId = req.body.xaiMethod || "gradcam++";
    const existingXai = normalizeXaiDocument(
        scan.xai?.toObject?.() ?? scan.xai,
    );

    if (hasCachedXaiView(existingXai, methodId)) {
        const cachedXai = applyActiveXaiView(existingXai, methodId);
        scan.xai = cachedXai;
        scan.xaiError = null;
        scan.gradCamPath = pickXaiPreviewPath(cachedXai) ?? scan.gradCamPath;
        await scan.save();

        return res.json({
            message: "Visual explanation view updated",
            xai: cachedXai,
            scan,
            cached: true,
        });
    }

    const modelApiBase =
        process.env.MODEL_API_URL?.replace(/\/scans\/analyze\/?$/, "") ||
        "http://127.0.0.1:8000";

    const xaiUrl = `${modelApiBase}/scans/${req.params.id}/xai`;

    try {
        const xaiResult = await postJson(xaiUrl, {
            xaiMethod: methodId,
            targetClass: req.body.targetClass ?? null,
            targetLayer: req.body.targetLayer ?? null,
            displayChannel: req.body.displayChannel ?? null,
            igSteps: req.body.igSteps ?? 50,
            attributionReduction: req.body.attributionReduction || "mean",
        });

        const mergedXai = mergeXaiResult(existingXai, xaiResult);
        scan.xai = mergedXai;
        scan.xaiError = null;
        scan.gradCamPath = pickXaiPreviewPath(mergedXai) ?? scan.gradCamPath;
        await scan.save();

        res.json({
            message: "Visual explanation updated",
            xai: mergedXai,
            scan,
            cached: false,
        });
    } catch (error) {
        return res.status(502).json({
            message: `XAI service failed: ${error.message}`,
        });
    }
});

// ------------------
// Delete Scan
// ------------------
const deleteScan = asyncHandler(async (req, res) => {
    let scan;
    try {
        scan = await Scan.findById(req.params.id);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(404).json({ message: "Scan not found" });
        }
        throw error;
    }

    if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
    }

    const userCenterId = req.user.radiologyCenterId;
    if (!userCenterId) {
        return res.status(403).json({
            message: "Forbidden: You are not assigned to a radiology center",
        });
    }

    let scanCenterId = scan.RadiologyCenterId;
    if (!scanCenterId && scan.userId) {
        const uploader = await User.findById(scan.userId).select("radiologyCenterId").lean();
        scanCenterId = uploader ? uploader.radiologyCenterId : null;
    }

    if (!scanCenterId || String(scanCenterId) !== String(userCenterId)) {
        return res.status(403).json({
            message: "Forbidden: You do not have access to delete this scan.",
        });
    }

    const pathsToDelete = [
        ...scan.files.map((file) => file.rawPath),
        ...collectXaiAssetPaths(scan.xai),
        scan.xai?.originalPath,
        scan.xai?.heatmapPath,
        scan.xai?.overlayPath,
        scan.segmentation?.maskPath,
        scan.segmentation?.overlayPath,
        scan.segmentation?.legendPath,
        scan.segmentation?.distributionPath,
    ].filter(Boolean);

    pathsToDelete.forEach((urlPath) => {
        const marker = "/uploads/";
        const normalized = String(urlPath).replace(/\\/g, "/");
        if (!normalized.includes(marker)) {
            return;
        }

        const relativePath = normalized.split(marker)[1];
        const absolutePath = path.join(
            __dirname,
            "..",
            "uploads",
            relativePath,
        );

        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }

        const segmentationDir = path.dirname(absolutePath);
        if (
            fs.existsSync(segmentationDir) &&
            fs.readdirSync(segmentationDir).length === 0
        ) {
            fs.rmdirSync(segmentationDir);
        }
    });

    await scan.deleteOne();

    res.json({ message: "Scan deleted successfully" });
});

module.exports = {
    createScan,
    getScans,
    getScanById,
    runScanXai,
    deleteScan,
};
