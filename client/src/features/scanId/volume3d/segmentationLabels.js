/** BraTS-style labels — matches model_api/config.py SEG_CLASS_* */
export const SEGMENTATION_LABELS = [
    {
        id: 2,
        name: "Edema",
        hex: "#22c55e",
        color: 0x22c55e,
        emissive: 0x15803d,
        opacity: 0.58,
        transparent: true,
        renderOrder: 2,
    },
    {
        id: 1,
        name: "NCR/NET",
        hex: "#dc2626",
        color: 0xdc2626,
        emissive: 0x991b1b,
        opacity: 0.72,
        transparent: true,
        renderOrder: 3,
    },
    {
        id: 3,
        name: "Enhancing tumor",
        hex: "#facc15",
        color: 0xfacc15,
        emissive: 0xca8a04,
        opacity: 1,
        transparent: false,
        renderOrder: 4,
    },
];
