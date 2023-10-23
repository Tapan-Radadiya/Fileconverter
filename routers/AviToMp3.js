const express = require("express")
const router = express.Router()

router.get("/AviToMp3", (req, res) => {
    res.render("ConverterPages/AviToMp3")
})
router.post("/AviToMp3", upload.single('file'), (req, res) => {
    var fileext = req.file.path;
    var ext = fileext.split('.').pop();
    console.log(ext);
    if (ext == "docx") {
        let outputfile = Date.now() + "output.pdf"
        docxtopdf(req.file.path, outputfile, (err, result) => {
            if (err) { console.log("Error") }
            else {
                res.download(outputfile, () => {
                    fs.unlink(outputfile, (err) => {
                        if (err) console.log(err);
                        else console.log("File Deleted");
                    })
                })
            }
        })
    }
    else { req.flash('message', 'Please Select Docx File') }
})

module.exports = router