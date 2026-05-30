/**
 * StyleSheet for @react-pdf/renderer.
 * Separate from Tailwind — PDF uses its own layout primitives and hex colors.
 */
import { StyleSheet } from "@react-pdf/renderer";

export const pdfStyles = StyleSheet.create({
    page: {
        padding: 36,
        fontSize: 10,
        fontFamily: "Helvetica",
        color: "#1e293b",
    },
    header: {
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        paddingBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 9,
        color: "#64748b",
    },
    section: {
        marginTop: 14,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "bold",
        marginBottom: 8,
    },
    resultBox: {
        padding: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        backgroundColor: "#f8fafc",
    },
    prediction: {
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 6,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    label: {
        color: "#64748b",
    },
    detailGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    detailItem: {
        width: "45%",
        marginBottom: 8,
    },
    imageGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    imageCard: {
        width: "48%",
        marginBottom: 8,
    },
    image: {
        width: "100%",
        height: 140,
        objectFit: "contain",
        backgroundColor: "#f1f5f9",
        borderRadius: 4,
    },
    imageLabel: {
        fontSize: 8,
        color: "#64748b",
        marginTop: 4,
        textAlign: "center",
    },
    legendGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    legendItem: {
        width: "48%",
        padding: 6,
        backgroundColor: "#f8fafc",
        borderRadius: 4,
        marginBottom: 4,
    },
    legendTitle: {
        fontWeight: "bold",
        fontSize: 9,
    },
    legendText: {
        fontSize: 8,
        color: "#64748b",
    },
    disclaimer: {
        marginTop: 16,
        fontSize: 8,
        color: "#94a3b8",
        fontStyle: "italic",
    },
    footer: {
        position: "absolute",
        bottom: 24,
        left: 36,
        right: 36,
        fontSize: 8,
        color: "#94a3b8",
        textAlign: "center",
    },
});
