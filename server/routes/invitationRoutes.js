const express = require("express");
const router = express.Router();

const invitationController = require("../controllers/invitationController");
const { verifyJWT } = require("../middleware/authMiddleware");

router
    .route("/available-doctors")
    .get(verifyJWT, invitationController.getAvailableDoctors);

router.route("/sent").get(verifyJWT, invitationController.getSentInvitations);

router.route("/").post(verifyJWT, invitationController.sendInvitation);

module.exports = router;
