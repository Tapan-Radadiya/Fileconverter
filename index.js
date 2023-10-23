let express = require("express")
const bodyParser = require("body-parser")
const path = require('path')
const multer = require('multer')
let docxtopdf = require('docx-pdf')
const app = express()
const webp = require("webp-converter")
const fs = require("fs")
const ffmpeg = require("fluent-ffmpeg")
const fileupload = require("express-fileupload")
const { exec } = require("child_process")
const session = require("express-session")
const flash = require("connect-flash")
const jimp = require("jimp")
const libre = require("libreoffice-convert")
const { engine } = require("express-handlebars")
const hbs = require("hbs")
const port = process.env.port || 5050
const fileConverterData = require("./Database/schema")
// const fileConvert = require("fileConverterData")
const bcrypt = require("bcryptjs")
const { log, error } = require("console")
const { SourceTextModule } = require("vm")

// _________________________________________________________________
webp.grant_permission();
app.use(express.static('uploads'))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(flash())

// Require File And Path
require("./Database/connection")
const publicPath = path.join(__dirname, "/Public");
app.use(express.static(publicPath))

app.use(session({
    secret: 'lionLoveDogs',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    }
}))

// Engine
app.set("view engine", "hbs");
app.engine("hbs", engine({
    extname: '.hbs',
    defaultLayout: false,
    layoutsDir: 'views'
}))
// _______________________________________________________________
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads")
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
var upload = multer({ storage: storage });
// app.get('/', (req, res) => {
//     res.sendFile(__dirname + "/index.html", { message: flash('message') })
// })
// _________________________________________________________________
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/")
    },
    filename: function (req, file, cb) {
        cb(null, file.filename + "_" + Date.now() + "_" + file.originalname);
    },
});
var upload = multer({ storage: storage });


// File Converter Starts

// login and signup
// -----------Login--------------
app.get("/login", (req, res) => {

    res.render("login")
})
app.post("/login", async (req, res) => {
    try {
        const userPass = req.body.password
        const userEmail = req.body.emailId

        const data = await fileConverterData.findOne({ EmailId: userEmail })
        console.log(data);
        const isMatch = await bcrypt.compare(userPass, data.Password)
        if (isMatch) {
            req.session.user = {
                email: data.EmailId,
                Username: data.Username
            }
            res.redirect("/")
        }
        else {
            res.render('login', { error: "Invalid Login Details" })
        }
    }
    catch (err) {
        console.log(err);
        res.status(400).render('login', { error: "Invalid Login Details" })
    }

})
// -----------Sign UP--------------
app.get("/signup", (req, res) => {
    res.render("signup")
})
app.post("/signup", async (req, res) => {
    try {
        const userName = req.body.userName;
        const userEmail = req.body.userEmail
        const userPassword = req.body.userPassword;

        const uniqueUserName = await fileConverterData.findOne({ Username: userName })
        const uniqueEmail = await fileConverterData.findOne({ EmailId: userEmail })

        if (!uniqueUserName) {
            if (!uniqueEmail) {
                const data = new fileConverterData({
                    Username: userName,
                    EmailId: userEmail,
                    Password: userPassword,
                    FilesConverted: 0
                })

                const result = await data.save()
                // console.log(result);
                if (result) { res.status(201).render("index") }
            }
            else { res.render('signup', { error: 'Email Id Already Registered' }) }
        }
        else { res.render('signup', { error: 'Please Enter Unique UserName' }) }
    }
    catch (error) {
        console.log(error);
    }
})

app.get("/", async (req, res) => {
    const user = req.session.user;
    const result = await totalFilesConverter()
    if (req.session && req.session.user) {

        res.status(200).render('index', { user: `Welcome ${user.Username}`, fileConverted: result, success: 'Done' })
    }
    else res.status(401).render('index', { fileConverted: result, error: 'Login', errorLogin: 'Login' })
})

// -----------Get Methods--------------
app.get("/AviToMp3", (req, res) => renderPage(req, res, "AviToMp3"))
app.get("/DocToPdf", (req, res) => renderPage(req, res, "DocToPdf"))
app.get("/JpgToPng", (req, res) => renderPage(req, res, "JpgToPng"))
app.get("/JpgToWebp", (req, res) => renderPage(req, res, "JpgToWebp"))
app.get("/Mp3ToAvi", (req, res) => renderPage(req, res, "Mp3ToAvi"))
app.get("/Mp4ToAvi", (req, res) => renderPage(req, res, "Mp4ToAvi"))
app.get("/Mp4ToMov", (req, res) => renderPage(req, res, "Mp4ToMov"))
app.get("/Mp4ToMp3", (req, res) => renderPage(req, res, "Mp4ToMp3"))
app.get("/PngToJpg", (req, res) => renderPage(req, res, "PngToJpg"))
app.get("/PngToWebp", (req, res) => renderPage(req, res, "PngToWebp"))
app.get("/WebpToJpg", (req, res) => renderPage(req, res, "WebpToJpg"))
app.get("/WebpToPng", (req, res) => renderPage(req, res, "WebpToPng"))


// ----------------Post Methods-----------------
app.post('/docToPdf', upload.single('file'), (req, res) => {
    var fileext = req.file.path;
    var ext = fileext.split('.').pop();
    const email = req.session.user.email;
    console.log(ext);
    if (ext == "docx") {
        let outputfile = Date.now() + "output.pdf"
        docxtopdf(req.file.path, outputfile, (err, result) => {
            if (err) { console.log("Error") }
            else {
                res.download(outputfile, () => {
                    updateFileCounter(email)
                    fs.unlink(outputfile, (err) => {
                        if (err) console.log(err);
                        else console.log("File Deleted");

                    })
                })
            }
        })
    }
    else { res.render('ConverterPages/docToPdf', { error: 'Please Select Docx File' }) }
})

// -----------Jpg TO Png--------------
app.post('/jpgToPng', upload.single('file'), (req, res) => {
    console.log(req.file.path)
    var fileext = req.file.path;
    const email = req.session.user.email;
    var ext = fileext.split(".").pop();
    if (ext == "jpg") {
        let outputfile = Date.now() + "output.png"
        jimp.read(req.file.path, function (err, image) {
            if (err) console.log(err);
            image.write(outputfile, () => {
                res.download(outputfile, () => {
                    updateFileCounter(email)
                    fs.unlink(outputfile, (err) => {
                        if (err) console.log(err);
                        else console.log("File Deleted");
                    })
                })
            })
        })
    }
    else { res.render('ConverterPages/JpgToPng', { error: 'Please Select Jpg File' }) }
})

// -----------Png TO Jpg--------------
app.post('/pngToJpg', upload.single('file'), (req, res) => {
    console.log(req.file.path)
    var fileext = req.file.path;
    const email = req.session.user.email;
    var ext = fileext.split(".").pop();
    if (ext == "png") {
        let outputfile = Date.now() + "output.jpg"
        jimp.read(req.file.path, function (err, image) {
            if (err) console.log(err);
            image.write(outputfile, () => {
                res.download(outputfile, () => {
                    updateFileCounter(email)
                    fs.unlink(outputfile, (err) => {
                        if (err) console.log(err);
                        else console.log("File Deleted");
                    })
                })
            })
        })
    }
    else { res.render('ConverterPages/PngToJpg', { error: 'Please Select Png File' }) }
})

// -----------Webp TO Jpg--------------
app.post("/webpToJpg", upload.single('file'), (req, res) => {
    console.log(req.file.path);
    var fileext = req.file.path;
    const email = req.session.user.email;
    var ext = fileext.split(".").pop();
    if (ext == "webp") {
        let outputfile = Date.now() + "output.jpg";
        const result = webp.dwebp(req.file.path, outputfile, "-o", logging = "-v")
        result.then((response) => {
            res.download(outputfile, () => {
                updateFileCounter(email)
                fs.unlink(outputfile, (err) => {
                    if (err) console.log(err);
                    else console.log("File Deleted");
                })
            })
        })
    }
    else { res.render('ConverterPages/WebpToJpg', { error: 'Please Select Webp File' }) }
})

// -----------Webp TO Png--------------
app.post("/webpTopng", upload.single('file'), (req, res) => {
    console.log(req.file.path);
    var fileext = req.file.path;
    const email = req.session.user.email;
    var ext = fileext.split(".").pop();
    if (ext == "webp") {
        let outputfile = Date.now() + "output.png";
        const result = webp.dwebp(req.file.path, outputfile, "-o", logging = "-v")
        result.then((response) => {
            res.download(outputfile, () => {
                updateFileCounter(email)
                fs.unlink(outputfile, (err) => {
                    if (err) console.log(err);
                    else console.log("File Deleted");
                })
            })
        })
    }
    else { res.render('ConverterPages/WebpToPng', { error: 'Please Select Webp File' }) }
})

// -----------Png TO Webp--------------
app.post("/pngToWebp", upload.single('file'), (req, res) => {
    console.log(req.file.path);
    var fileext = req.file.path;
    const email = req.session.user.email;
    var ext = fileext.split(".").pop();
    if (ext == "png") {
        let outputfile = Date.now() + "output.webp";
        const result = webp.cwebp(req.file.path, outputfile, "-q 80", logging = "-v")
        result.then((response) => {
            res.download(outputfile, () => {
                updateFileCounter(email)
                fs.unlink(outputfile, (err) => {
                    if (err) console.log(err);
                    else console.log("File Deleted");
                })
            })
        })
    }
    else { res.render('ConverterPages/PngToWebp', { error: 'Please Select png File' }) }

})

// -----------Jpg TO Webp--------------
app.post("/jpgToWebp", upload.single('file'), (req, res) => {
    var fileext = req.file.path;
    const email = req.session.user.email;
    var ext = fileext.split(".").pop();
    if (ext == "jpg") {
        let outputfile = Date.now() + "output.webp";
        const result = webp.cwebp(req.file.path, outputfile, "-q 80", logging = "-v")
        result.then((response) => {
            res.download(outputfile, () => {
                updateFileCounter(email)
                fs.unlink(outputfile, (err) => {
                    if (err) console.log(err);
                    else console.log("File Deleted");
                })
            })
        })
    }
    else { res.render('ConverterPages/JpgToWebp', { error: 'Please Select Jpg File' }) }
})

// -----------Mp4 TO Mp3--------------
app.post("/mp4Tomp3", upload.single('file'), (req, res) => {
    var fileext = req.file.path;
    const email = req.session.user.email;
    var ext = fileext.split(".").pop();
    if (ext == "mp4") {
        var output = Date.now() + 'output.mp3'
        exec(`ffmpeg -i "${req.file.path}" ${output}`, (error, stdout, stderr) => {
            if (error) { console.log(error); }
            else {
                console.log("Converted");
                res.download(output, () => {
                    updateFileCounter(email)
                    fs.unlink(output, (err) => {
                        if (err) console.log(err);
                        else console.log("File Deleted");
                    })
                })
            }
        })
    }
    else { res.render('ConverterPages/Mp4ToMp3', { error: 'Please Select Mp4 File' }) }
})

// -----------Mp4 TO Avi--------------
app.post("/mp4Toavi", upload.single('file'), (req, res) => {
    var fileext = req.file.path;
    const email = req.session.user.email;
    var ext = fileext.split(".").pop();
    if (ext == "mp4") {
        var output = Date.now() + 'output.avi'
        exec(`ffmpeg -i "${req.file.path}" -vcodec copy -acodec copy ${output}`, (error, stdout, stderr) => {
            if (error) { console.log(error); }
            else {
                console.log("Converted");
                res.download(output, () => {
                    updateFileCounter(email)
                    fs.unlink(output, (err) => {
                        if (err) console.log(err);
                        else console.log("File Deleted");
                    })
                })
            }
        })
    }
    else { res.render('ConverterPages/Mp4ToAvi', { error: 'Please Select Mp4 File' }) }
})

// -----------Mp4 TO Mov--------------
app.post("/mp4Tomov", upload.single('file'), (req, res) => {
    var fileext = req.file.path;
    const email = req.session.user.email;
    var ext = fileext.split(".").pop();
    if (ext == "mp4") {
        var output = Date.now() + 'output.mov'
        exec(`ffmpeg -i "${req.file.path}" -f mov ${output}`, (error, stdout, stderr) => {
            if (error) { console.log(error); }
            else {
                console.log("Converted");
                res.download(output, () => {
                    updateFileCounter(email)
                    fs.unlink(output, (err) => {
                        if (err) console.log(err);
                        else console.log("File Deleted");
                    })
                })
            }
        })
    }
    else { res.render('ConverterPages/Mp4ToMov', { error: 'Please Select Mp4 File' }) }
})

// -----------Mp3 TO Avi--------------
app.post("/mp3Toavi", upload.single('file'), (req, res) => {
    var fileext = req.file.path;
    const email = req.session.user.email;
    var ext = fileext.split(".").pop();
    if (ext == "mp3") {
        var output = Date.now() + 'output.avi'
        exec(`ffmpeg -i "${req.file.path}" ${output}`, (error, stdout, stderr) => {
            if (error) { console.log(error); }
            else {
                console.log("Converted");
                res.download(output, () => {
                    updateFileCounter(email)
                    fs.unlink(output, (err) => {
                        if (err) console.log(err);
                        else console.log("File Deleted");
                    })
                })
            }
        })
    }
    else { res.render('ConverterPages/Mp3ToAvi', { error: 'Please Select Mp3 File' }) }
})

// -----------Avi TO Mp3--------------
app.post("/aviTomp3", upload.single('file'), (req, res) => {
    var fileext = req.file.path;
    const email = req.session.user.email;
    var ext = fileext.split(".").pop();
    if (ext == "avi") {
        var output = Date.now() + 'output.mp3'
        exec(`ffmpeg -i "${req.file.path}" ${output}`, (error, stdout, stderr) => {
            if (error) { console.log(error); }
            else {
                console.log("Converted");
                res.download(output, () => {
                    updateFileCounter(email)
                    fs.unlink(output, (err) => {
                        if (err) console.log(err);
                        else console.log("File Deleted");
                    })
                })
            }
        })
    }
    else { res.render('ConverterPages/AviToMp3', { error: 'Please Select Avi File' }) }
})
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login")
})
app.get("*", (req, res) => {
    res.render("404PageNotFound")
})

app.listen(port, () => {
    console.log(`App is listening on port number ${port}`)
})
function isLoggedIn(req) {
    if (req.session && req.session.user) {
        return true
    }
    else return false
}
function renderPage(req, res, pageName) {
    if (isLoggedIn(req)) {
        res.render(`ConverterPages/${pageName}`)
    }
    else res.render('index', { error: 'Please Log In' })
}
async function totalFilesConverter() {
    const result = await fileConverterData.aggregate([{ $group: { _id: null, TotalFiles: { $sum: { $toDouble: { $ifNull: ["$FilesConverted", 0] } } } } }]).exec()
    return await result[0] ? result[0].TotalFiles : 0;
}
totalFilesConverter();
async function updateFileCounter(email) {
    return fileConverterData.updateOne({ EmailId: `${email}` }, { $inc: { FilesConverted: 1 } })
}
// hashPassword("Tapan")