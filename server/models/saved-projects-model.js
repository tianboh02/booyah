const mongoose = require('mongoose');

const SavedProjectsSchema = new mongoose.Schema({
    userID: { type: String, required: true, unique: false },
    projectlink: { type: String, required: true, unique: false },
    category: { type: String, required: true, unique: false },
});

const savedProjects = mongoose.model('SavedProjects', SavedProjectsSchema, 'savedProjects');

// create new save - create new entry
exports.createSavedProject = function (newSave) {
    return savedProjects.create(newSave);
};


// get saved project by userID
exports.findByUserId = function (userID) {
    return savedProjects.find({ userID: userID })
}


// delete save - delete entry
exports.deleteSavedProject = function (_id) {
    return savedProjects.deleteOne({ _id: _id });
};