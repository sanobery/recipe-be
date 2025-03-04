const mongoose = require('mongoose')
const URI = process.env.MONGODB_URI

const db = async () => {
    try {
        await mongoose.connect(URI);

    } catch (error) {
        process.exit(0);
    }
}

module.exports = db 