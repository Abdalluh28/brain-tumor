const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notificationController");
const { verifyJWT } = require("../middleware/authMiddleware");

router.route("/unread-count").get(verifyJWT, notificationController.getUnreadCount);

router
    .route("/:id/accept")
    .post(verifyJWT, notificationController.acceptInvitation);

router
    .route("/:id/reject")
    .post(verifyJWT, notificationController.rejectInvitation);

router
    .route("/activation-request/:notificationId")
    .patch(verifyJWT, notificationController.respondToActivationRequest);

router.route("/:id/read").patch(verifyJWT, notificationController.markAsRead);
router.route("/read-all").patch(verifyJWT, notificationController.markAllAsRead);

router.route("/").get(verifyJWT, notificationController.getNotifications);

module.exports = router;
