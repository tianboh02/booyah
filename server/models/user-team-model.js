const mongoose = require('mongoose');

const UserTeamSchema = new mongoose.Schema({
    teamid: { type: String, required: true },
    userid: { type: String, required: true },
    role: { type: String, required: true },
});

const userTeam = mongoose.model('UserTeam', UserTeamSchema, 'user_team');

// join team - create new entry
exports.createUserTeam = function (newUserProject) {
    return userTeam.create(newUserProject);
};

//check role by userid & teamid
exports.findUserTeamRole = function (userid, teamid) {
    return userTeam.find({ userid: userid, teamid: teamid });
};

// user leave team - delete entry by team id & user id
exports.deleteUserTeam = function (userid, projectid) {
    return userTeam.deleteOne({ userid: userid, projectid: projectid });
};

// delete all user record when team deleted - delete all entry by team id
exports.deleteAllUserByTeamid = function (teamid) {
    return userTeam.deleteMany({ teamid: teamid });
};

// user delete account - delete all entry by user id (check if user is owner)
// exports.deleteAllUserTeamRecord = function (userid) {
//     return userTeam.deleteMany({ userid: userid });
// };

// get all team by user id
exports.findAllTeamByUserid = function (userid) {
    return userTeam.find({ userid: userid })
}

// get all user by team id (if user is owner, get the most senior member to takeover)
exports.findAllUserByTeamid = function (teamid) {
    return userTeam.find({ teamid: teamid })
}

// update role - update role
exports.updateUserTeamRole = function (_id, role) {
    return userTeam.updateOne({ _id: _id }, { $set: { role: role } });
};