import { AlertCircle } from "lucide-react";
import {
  viewerLockedPanel,
  viewerLockedText,
  viewerLockedTitle,
} from "../viewerTheme";

export default function ViewerLockedBanner() {
  return (
    <div className={viewerLockedPanel}>
      <AlertCircle className="w-12 h-12 text-amber-500 animate-pulse" />
      <h3 className={viewerLockedTitle}>Patient Details Required</h3>
      <p className={viewerLockedText}>
        Please provide a valid 15-digit Patient ID (and fill out patient fields
        if adding a new patient) at the top of the panel to unlock the
        multi-modality viewer.
      </p>
    </div>
  );
}
