const express = require('express');

const userController = require("../controllers/user.controller")


const router = express.Router();

console.log("im in routes")


//user
router.post("/auth/create", userController.createUser);
router.post("/auth/login", userController.login);
router.post("/auth/update", userController.updatePassword);


module.exports = router;