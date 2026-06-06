const express = require("express");
const router = express.Router();

const passwordController = require("../controllers/passwordController");
const { verifyJWT } = require("../middleware/authMiddleware");

router.route("/forgot").post(passwordController.forgotPassword);
router.route("/reset").post(passwordController.resetPassword);
router.route("/change").post(verifyJWT, passwordController.changePassword);

module.exports = router;
