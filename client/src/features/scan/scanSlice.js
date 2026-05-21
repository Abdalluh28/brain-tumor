import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // files: [T1N, T1C, T2W, T2F]
    files: [null, null, null, null],
};

export const scanSlice = createSlice({
    name: "scan",
    initialState,
    reducers: {
        uploadFile: (state, action) => {
            const { index, file } = action.payload;
            state.files[index] = file;
        },
        removeFile: (state, action) => {
            const index = action.payload;
            state.files[index] = null;
        },
        clearFiles: (state) => {
            state.files = [];
        },
    },
});

export const { uploadFile, removeFile, clearFiles } = scanSlice.actions;

export default scanSlice.reducer;
