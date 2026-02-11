const mongoose = require("mongoose");

const scanFileSchema = new mongoose.Schema(
    {
        modality: {
            type: String,
            enum: ["T1", "T1CE", "T2", "FLAIR"],
            required: true,
        },

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

        tumorType: {
            type: String,
            enum: ["GBM", "LGG", "Metastasis", "Healthy"],
        },

        confidenceScores: {
            GBM: Number,
            LGG: Number,
            Metastasis: Number,
            Healthy: Number,
        },

        gradCamPath: {
            type: String,
        },

        status: {
            type: String,
            enum: ["review", "completed", "failed"],
            default: "review",
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model("Scan", scanSchema);
