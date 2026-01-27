import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    images: [],
};

export const scanSlice = createSlice({
    name: "scan",
    initialState,
    reducers: {
        uploadImage: (state, action) => {
            console.log(action.payload)
            state.images.push({
                id: Date.now(),
                previewURL: action.payload.previewURL,
                name: action.payload.name,
                size: action.payload.size,
            });
        },
        removeImage: (state, action) => {
            state.images = state.images.filter(
                (image) => image.id !== action.payload,
            );
        },
    },
});

export const { uploadImage, removeImage } = scanSlice.actions;

export default scanSlice.reducer;
