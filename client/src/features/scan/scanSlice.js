import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // files: [T1N, T1C, T2W, T2F]
    files: [null, null, null, null],
    newPatient: false,

    // Viewer Persistent State
    viewerVolumes: [null, null, null, null],
    viewerSliceIndex: 0,
    viewerPatientInfo: null,
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
        setViewerVolumes: (state, action) => {
            state.viewerVolumes = action.payload;
        },
        setViewerSliceIndex: (state, action) => {
            state.viewerSliceIndex = action.payload;
        },
        setViewerPatientInfo: (state, action) => {
            state.viewerPatientInfo = action.payload;
        },
        clearViewerCase: (state) => {
            state.viewerVolumes = [null, null, null, null];
            state.viewerSliceIndex = 0;
        },
        clearViewerState: (state) => {
            state.viewerVolumes = [null, null, null, null];
            state.viewerSliceIndex = 0;
            state.viewerPatientInfo = null;
        },
    },
});

export const {
    uploadFile,
    removeFile,
    clearFiles,
    setNewPatient,
    setViewerVolumes,
    setViewerSliceIndex,
    setViewerPatientInfo,
    clearViewerCase,
    clearViewerState
} = scanSlice.actions;

export default scanSlice.reducer;
