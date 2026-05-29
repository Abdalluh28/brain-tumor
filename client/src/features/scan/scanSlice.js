import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // files: [T1N, T1C, T2W, T2F]
    files: [null, null, null, null],
    newPatient: false,
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
            state.files = [null, null, null, null];
        },
        setNewPatient: (state, action) => {
            state.newPatient = action.payload;
        },
    },
});

export const { uploadFile, removeFile, clearFiles, setNewPatient } = scanSlice.actions;

export default scanSlice.reducer;
