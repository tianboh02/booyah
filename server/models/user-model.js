const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userID: { type: String, required: true, unique: true },
    displayname: { type: String, required: true, unique: false },
    experience: { type: String, required: false, unique: false },
});

const user = mongoose.model('User', UserSchema, 'user');

// create new account - create new entry
exports.createUser = function (newUser) {
    return user.create(newUser);
};


// get account by username
exports.findByUserId = function (userID) {
    return user.find({ userID: userID })
}

exports.updateUserExperience = function (userID, newExperience) {
    return user.updateOne(
        { userID: userID },                  // Filter by userID
        { $set: { experience: newExperience } } // Update only the experience field
    );
};

exports.updateUserDisplayName = function (userID, newDisplayName) {
    return user.updateOne(
        { userID: userID },                  // Filter by userID
        { $set: { displayname: newDisplayName } } // Update only the displayName field
    );
};
