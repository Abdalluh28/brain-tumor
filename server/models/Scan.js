const mongoose = require("mongoose");

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
            enum: ["nii", "nii.gz", "dcm", "png", "jpg", "jpeg"],
            required: true,
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

        files: {
            type: [scanFileSchema],
            validate: {
                validator: function (value) {
                    return value.length === 4;
                },
                message: "A scan must contain exactly 4 MRI files.",
            },
        },

        prediction: {
            type: String,
            enum: ["GBM", "LGG", "Metastasis", "Healthy", "Others"],
        },

        confidenceScores: {
            GBM: Number,
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
