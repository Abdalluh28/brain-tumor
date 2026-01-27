import { combineReducers, configureStore } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web
import { persistReducer } from "redux-persist";
import themeReducer from "@/features/theme/ThemeSlice";
import persistStore from "redux-persist/es/persistStore";
import scanReducer from "@/features/scan/scanSlice";

// Persisted reducer configuration
const persistConfig = {
    key: "root",
    storage,
    whitelist: ["theme"], // only theme will be persisted
};

// Combine reducers if there are multiple slices
const rootReducer = combineReducers({
    theme: themeReducer,
    scan: scanReducer
});

// Create a persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure the Redux store
const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

// Create a persistor
export const persistor = persistStore(store);

export default store;
