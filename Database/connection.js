const mongoose = require("mongoose")
mongoose.connect("YOUR CONNECTION STRING")
    .then(() => { console.log("Connected") })
    .catch((err) => console.log(err))
