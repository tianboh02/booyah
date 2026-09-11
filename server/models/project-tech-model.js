const mongoose = require('mongoose');

const ProjectTechSchema = new mongoose.Schema({
    projectid: { type: String, required: true },
    technology: { type: String, required: true },
    category: { type: String, required: true },
    version: { type: String, required: true },
    updatedby: { type: String, required: true },
});

const projectTech = mongoose.model('ProjectTech', ProjectTechSchema, 'project_tech');


// get tech by project id
exports.findTechByProjectid = function (projectid) {//marcus
    return projectTech.find({ projectid: projectid })
}

// create tech
exports.createProjectTech = function (newProjectTech) {
    return projectTech.create(newProjectTech);
};

// delete tech
exports.deleteProjectTech = function (_id) {
    return projectTech.deleteOne({ _id: _id });
}; 

//delete all project tech by project_id
exports.deleteProjectTechByProjectid = function (projectid) {
    return projectTech.deleteMany({ projectid: projectid });
}; 


// edit tech version & updatedby
exports.updateProjectTech = function (_id, version, updatedby) {
    return projectTech.updateOne({ _id: _id }, { $set: {version: version,updatedby: updatedby} });
};

