const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    firstname: { type: String, required: true, unique: false },
    lastname: { type: String, required: true, unique: false },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const user = mongoose.model('User', UserSchema, 'user');

// create new account - create new entry
exports.createUser = function (newUser) {
    return user.create(newUser);
};

// delete account - delete entry
// exports.deleteUser = function (_id) {
//     return user.deleteOne({ _id: _id });
// }; 

// update password - update password
exports.updateUserPassword = function (_id, password) {
    return user.updateOne({ _id: _id }, { $set: {password: password} });
};

// get account by username
exports.findByUsername = function (username) {//marcus
    return user.find({ username: username })
}