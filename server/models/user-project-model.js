const mongoose = require('mongoose');

const UserProjectSchema = new mongoose.Schema({
    projectid: { type: String, required: true },
    userid: { type: String, required: true },
    role: { type: String, required: true },
});

const userProject = mongoose.model('UserProject', UserProjectSchema, 'user_project');


// join project - create new entry
exports.createUserProject = function (newUserProject) {
    return userProject.create(newUserProject);
};

//check role by userid & projectid
exports.findUserProjectRole = function (userid, projectid) {
    return userProject.find({ userid: userid, projectid: projectid });
}; 


// user leave project by userid & projectid - delete entry by project id & user id
exports.deleteUserProject = function (userid, projectid) {
    return userProject.deleteOne({ userid: userid, projectid: projectid });
}; 

// delete all user record when project deleted - delete all entry by project id
exports.deleteAllUserByProjectid = function (projectid) {
    return userProject.deleteMany({ projectid: projectid });
}; 

// user delete account - delete all entry by user id (check if user is owner first)
// exports.deleteAllUserProjectRecord = function (userid) {
//     return userProject.deleteMany({ userid: userid });
// };

// get all project by user id
exports.findAllProjectByUserid = function (userid) {
    return userProject.find({ userid: userid })
}

// get all user by project id (if user is owner, get the most senior member to takeover)
exports.findAllUserByProjectid = function (projectid) {
    return userProject.find({ projectid: projectid })
}

// update role - update role
exports.updateUserProjectRole = function (_id, role) {
    return userProject.updateOne({ _id: _id }, { $set: {role: role} });
};