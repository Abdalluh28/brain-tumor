const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { verifyJWT } = require("../middleware/authMiddleware");

router.route("/").get(verifyJWT, userController.getUser);

router.route("/doctors").get(verifyJWT, userController.getDoctors);

router
    .route("/create-radiology-center")
    .post(verifyJWT, userController.createRadiologyCenter);

    router
    .route("/radiology-center")
    .post(verifyJWT, userController.joinRadiologyCenter);

router.route("/profile").post(verifyJWT, userController.updateUserProfile);

router.route('/:id').post(verifyJWT, userController.updateUserByAdmin);

router.route("/:id").delete(verifyJWT, userController.deleteUser);


module.exports = router;
