const mongoose = require('mongoose')
const URI = process.env.MONGODB_URI

const db = async () => {
    try {
        await mongoose.connect(URI);
        console.log("Connection successful");

    } catch (error) {
        console.log(error);
        process.exit(0);
    }
}

module.exports = db 