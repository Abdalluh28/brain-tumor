const mongoose = require("mongoose");
const Patient = require("../../models/Patient");

const normalizeOptionalString = (value) => {
    if (value === undefined || value === null) {
        return undefined;
    }

    const normalized = String(value).trim();
    if (!normalized || normalized === "undefined" || normalized === "null") {
        return undefined;
    }

    return normalized;
};

const getPatientIdLookupValues = (patientId) => {
    const values = [patientId];

    if (/^\d+$/.test(patientId)) {
        const numericPatientId = Number(patientId);

        if (Number.isSafeInteger(numericPatientId)) {
            values.push(numericPatientId);
        }
    }

    return values;
};

const getOrCreatePatient = async (reqBody, userId) => {
    const {
        patientId: rawPatientId,
        patientName,
        patientAge,
        patientGender,
        patientPhone,
        patientEmail,
        notes,
    } = reqBody;
    const patientId = normalizeOptionalString(rawPatientId);

    const hasFullPatientInfo =
        patientName && patientAge && patientGender && patientPhone;

    // Existing patient selected. Accept either the Mongo _id or the stored
    // patientId value used by the UI.
    if (patientId) {
        const isMongoObjectId = mongoose.Types.ObjectId.isValid(patientId);
        const patientIdLookupValues = getPatientIdLookupValues(patientId);
        const patientConditions = patientIdLookupValues.map((value) => ({
            patientId: value,
        }));

        if (isMongoObjectId) {
            patientConditions.unshift({ _id: patientId });
        }

        const patientFilter = isMongoObjectId
            ? {
                  userId,
                  $or: patientConditions,
              }
            : { userId, $or: patientConditions };

        const patient = await Patient.findOne(patientFilter);

        if (patient) {
            return {
                patient,
                modelPayload: {
                    patientId: patient._id.toString(),
                },
            };
        }

        if (!hasFullPatientInfo) {
            throw new Error("Patient not found");
        }
    }

    // New patient
    if (!hasFullPatientInfo) {
        throw new Error(
            "Patient information is required when patientId is not provided",
        );
    }

    return {
        patient: null,
        modelPayload: {
            patientId,
            patientName,
            patientAge,
            patientGender,
            patientPhone,
            patientEmail,
            notes,
        },
    };
};

module.exports = getOrCreatePatient;
