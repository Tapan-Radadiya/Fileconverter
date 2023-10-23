const mongoose = require("mongoose");
const bcrypt = require("bcryptjs")

const Schema = mongoose.Schema({
    Username: {
        type: String,
        required: true,
        unique: true
    },
    EmailId: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    Password: {
        type: String,
        required: true,
    },
    FilesConverted: {
        type: Number,
    }
})

Schema.pre("save", async function (next) {
    if (this.isModified("Password")) {
        this.Password = await bcrypt.hash(this.Password, 12)
        console.log(`Current Pass is ${this.Password}`);
        next();
    }
})

const fileConverterData = mongoose.model("FileConverterUserData", Schema)
module.exports = fileConverterData