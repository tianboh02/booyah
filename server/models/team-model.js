const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
    teamname: { type: String, required: true },
    description: { type: String, required: true },
}, { timestamps: true });

const team = mongoose.model('Team', TeamSchema, 'team');

// get team by id
exports.findTeamBy_id = function (_id) {
    return team.findById(_id)
};

// create team
exports.createTeam = function (newTeam) {
    return team.create(newTeam);
};

// delete team
exports.deleteTeam = function (_id) {
    return team.deleteOne({ _id: _id });
};

// edit team name
exports.updateTeamName = function (_id, teamname) {
    return team.updateOne({ _id: _id }, { $set: {teamname: teamname} });
};

// edit team description
exports.updateTeamDesc = function (_id, description) {
    return team.updateOne({ _id: _id }, { $set: {description: description} });
};