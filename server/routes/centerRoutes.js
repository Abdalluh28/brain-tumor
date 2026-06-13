const express = require("express");
const { verifyJWT } = require("../middleware/authMiddleware");
const router = express.Router();

const centerController = require("../controllers/centerController");

router.route("/").get(verifyJWT, centerController.getRadiologyCenters);

router.route("/create").post(verifyJWT, centerController.createRadiologyCenter);

router.post(
    "/:centerId/join-request",
    verifyJWT,
    centerController.sendJoinCenterRequest,
);

router.patch(
    "/:notificationId",
    verifyJWT,
    centerController.respondToJoinCenterRequest,
);

module.exports = router;
