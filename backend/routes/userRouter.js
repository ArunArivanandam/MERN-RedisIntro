const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/userController");
const upload = require("../middleware/upload");

// Public routes
router.post("/register", ctrl.register);
router.post("/login", ctrl.login);

// Protected routes (require valid JWT)
router.use(ctrl.isAuth); // all routes below this are guarded

router.post("/logout", ctrl.logout);
router.get("/me", ctrl.getMe);
router.post("/me/avatar", upload.single("avatar"), ctrl.uploadAvatar);

module.exports = router;
