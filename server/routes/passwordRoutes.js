const express = require("express");
const router = express.Router();

const passwordController = require("../controllers/passwordController");

router.route("/forgot").post(passwordController.forgotPassword);
router.route("/reset").post(passwordController.resetPassword);

module.exports = router;
