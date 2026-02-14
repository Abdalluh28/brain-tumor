const express = require("express");
const router = express.Router();

const scanController = require("../controllers/scanController");
const { verifyJWT } = require("../middleware/authMiddleware");

router.route("/").post(verifyJWT, scanController.createScan);
router.route("/").get(verifyJWT, scanController.getScans);
router.route("/:id").get(verifyJWT, scanController.getScanById);
router.route("/:id").delete(verifyJWT, scanController.deleteScan);

module.exports = router;
