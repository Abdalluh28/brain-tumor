import { useState } from "react";
import SecurityHome from "./SecurityHome";
import ChangePassword from "./ChangePassword";
import ForgotPassword from "./ForgotPassword";

export default function Security() {
    const [view, setView] = useState("home");

    return (
        <div className="flex flex-col gap-4 mb-4">
            {view === "home" && <SecurityHome onNavigate={setView} />}
            {view === "change" && <ChangePassword onBack={() => setView("home")} />}
            {view === "forgot" && <ForgotPassword onBack={() => setView("home")} />}
        </div>
    );
}
