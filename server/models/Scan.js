const mongoose = require("mongoose");

const scanFormats = ["nii", "nii.gz", "dcm", "png", "jpg", "jpeg"];

const scanFileSchema = new mongoose.Schema(
    {
        // modality: {
        //     type: String,
        //     enum: ["T1", "T1CE", "T2", "FLAIR"],
        //     required: true,
        // },

        // rawPath is the path to the original MRI file
        rawPath: {
            type: String,
            required: true,
        },

        // preprocessedPath is the path to the preprocessed MRI file
        preprocessedPath: {
            type: String,
        },

        format: {
            type: String,
            enum: scanFormats,
            required: true,
        },

        originalName: {
            type: String,
        },

        slot: {
            type: Number,
            min: 1,
            max: 4,
        },
    },
    { _id: false }, // prevents auto _id for subdocuments
);

const scanSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        patientName: {
            type: String,
            required: true,
        },

        patientId: {
            type: String,
            required: true,
        },

        patientAge: {
            type: Number,
            required: true,
        },

        patientGender: {
            type: String,
            enum: ["male", "female"],
            required: true,
        },

        patientPhone: {
            type: String,
            required: true,
            trim: true,
        },

        notes: {
            type: String,
        },

        scanType: {
            type: String,
            enum: ["MRI", '3D'],
            required: true,
        },

        files: {
            type: [scanFileSchema],
            validate: {
                validator: function (value) {
                    return value.length === 4;
                },
                message: "A scan must contain exactly 4 modality files.",
            },
        },

        prediction: {
            type: String,
            enum: ["HGG", "LGG", "Metastasis", "Healthy", "Others"],
        },

        confidenceScores: {
            HGG: Number,
            LGG: Number,
            Metastasis: Number,
            Healthy: Number,
            Others: Number,
        },

        // max confidence score (to be used for filtering)
        confidence: {
            type: Number,
        },

        gradCamPath: {
            type: String,
        },

        segmentation: {
            modelType: {
                type: String,
                enum: ["GLI", "METS"],
            },
            maskPath: String,
            overlayPath: String,
            legendPath: String,
            distributionPath: String,
            classStats: [
                {
                    classId: Number,
                    label: String,
                    colorHex: String,
                    pixelCount: Number,
                    percentage: Number,
                },
            ],
            metadata: {
                type: Object,
            },
        },

        status: {
            type: String,
            enum: ["pending", "review", "completed", "failed"],
            default: "pending",
        },

        radiologist: {
            type: String,
        },

        processedTime: {
            type: Number,
        },

        modelVersion: {
            type: String,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model("Scan", scanSchema);
