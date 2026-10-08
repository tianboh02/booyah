const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userID: { type: String, required: true, unique: true },
    displayname: { type: String, required: true, unique: false },
    experience: { type: String, required: true, unique: false },
});

const user = mongoose.model('User', UserSchema, 'user');

// create new account - create new entry
exports.createUser = function (newUser) {
    return user.create(newUser);
};



// get account by username
exports.findByUserId= function (userID) {
    return user.find({ userID: userID })
}
