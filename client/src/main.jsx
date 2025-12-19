import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { SidebarProvider } from "./components/ui/sidebar";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <SidebarProvider>
            <App />
        </SidebarProvider>
    </React.StrictMode>
);
