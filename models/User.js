const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  password: { type: String, required: true },
  createdOn: { type: Date, default: Date.now }
});


const User = mongoose.model('User', userSchema);

module.exports = User;