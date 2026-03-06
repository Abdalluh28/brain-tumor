import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    files: [],
};

export const scanSlice = createSlice({
    name: "scan",
    initialState,
    reducers: {
        uploadFile: (state, action) => {
            console.log(action.payload);
            state.files.push({
                id: Date.now(),
                name: action.payload.name,
                size: action.payload.size,
                type: action.payload.type,
                previewURL: action.payload.previewURL || null,
                rawFile: action.payload.rawFile || null,
                processedAt: new Date().toISOString(),
            });
        },
        removeFile: (state, action) => {
            state.files = state.files.filter(
                (file) => file.id !== action.payload,
            );
        },
        clearFiles: (state) => {
            state.files = [];
        },
    },
});

export const { uploadFile, removeFile, clearFiles } = scanSlice.actions;

export default scanSlice.reducer;
