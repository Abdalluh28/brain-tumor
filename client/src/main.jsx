import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { SidebarProvider } from "./components/ui/sidebar";
import { Provider } from "react-redux";
import { persistor } from "./store";
import store from "./store";
import { PersistGate } from "redux-persist/integration/react";
import './lib/chart';

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <SidebarProvider>
                    <App />
                </SidebarProvider>
            </PersistGate>
        </Provider>
    </React.StrictMode>
);
