const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    projectname: { type: String, required: true },
    description: { type: String, required: true },
    activity: { type: Boolean, required: true }
});

const project = mongoose.model('Project', ProjectSchema, 'project');

// get project by id
exports.findProjectBy_id = function (_id) {
    return project.findById(_id)
};

// create project
exports.createProject = function (newProject) {
    return project.create(newProject);
};

// delete project
exports.deleteProject = function (_id) {
    return project.deleteOne({ _id: _id });
};

// edit project name
exports.updateProjectName = function (_id, projectname) {
    return project.updateOne({ _id: _id }, { $set: { projectname: projectname } });
};

// edit project description
exports.updateProjectDesc = function (_id, description) {
    return project.updateOne({ _id: _id }, { $set: { description: description } });
};

// edit project activity
exports.updateProjectActivity = function (_id, activity) {
    return project.updateOne({ _id: _id }, { $set: { activity: activity } });
};