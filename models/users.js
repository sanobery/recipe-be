const mongoose = require('mongoose')
// mongoose.set('debug', true);

const userSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
})

const User = new mongoose.model('users', userSchema)

module.exports = User;
