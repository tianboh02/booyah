const savedProjectModel = require("../models/saved-projects-model")

exports.test = async (req, res, next) => {

};

exports.createSave = async (req, res, next) => {
    let message = "";

    try {
        const project = {
            userID: req.body.userID,
            projectlink: req.body.projectlink,
            category: req.body.category
        };

        const create = await savedProjectModel.createSavedProject(project);
        message = "Created";
        console.log(message, create);
        return res.status(200).json({ message: message });


    } catch (err) {
        next(err)
        // console.error(err);
        // message = err;
        // return res.status(400).json({ error: message });
    }
};

exports.getSavedProjectByUser = async (req, res, next) => {
    // let message = "";

    try {

        const find = await savedProjectModel.findByUserId(req.body.userID);
        console.log(find)
        // console.log("User Created");
        return res.status(200).json({ data: find });
    } catch (err) {
        next(err)
        // console.error(err);
        // message = err;
        // return res.status(400).json({ error: message });
    }
};

exports.deleteSave = async (req, res, next) => {
    let message = "";

    try {
        const deleteSave = await savedProjectModel.deleteSavedProject(req.body._id);
        console.log(deleteSave)
        message = { deleted: deleteSave.deletedCount }
        console.log(deleteSave.deletedCount, "deleted");
        return res.status(200).json({ data: deleteSave });
    } catch (err) {
        next(err)
        // console.error(err);
        // message = err;
        // return res.status(400).json({ error: message });
    }
};