const express = require('express');

const userController = require("../controllers/user.controller")
const savedProjectController = require("../controllers/saved-project.controller")


const router = express.Router();


//user
router.post("/auth/create", userController.createUser);
router.post("/auth/findUser", userController.checkUserIdExist);
router.put("/auth/updateExperience", userController.updateUserExperience);


//saved project
router.post("/createSave", savedProjectController.createSave);
router.post("/getSave", savedProjectController.getSavedProjectByUser);
router.delete("/deleteSave", savedProjectController.deleteSave);


module.exports = router;