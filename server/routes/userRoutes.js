const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { verifyJWT } = require("../middleware/authMiddleware");

router.route("/profile").post(verifyJWT, userController.updateUserProfile);

router.route("/:id").delete(verifyJWT, userController.deleteUser);

module.exports = router;
