import formidable from "formidable"

const fileParser = async (req, res, next) => {
    //formidable handles form data or file upload
    const form = formidable()

    //After having fields and files, we want store fields in req.body and files in req.file
    //express.json() cant read data as file to req.body, so we need to store fields in req.body and file in req.file
    // array destructuring
    const [fields, files] = await form.parse(req)
    if (!req.body) req.body = {}

    //Ví dụ dữ liệu fields
    // {
    //   "username": [
    //     "john_doe"
    //   ]
    // }

    for (let key in fields) {
        req.body[key] = fields[key][0]
    }

    if (!req.files) req.files = {}

    //Ví dụ dữ liệu files
    // {
    //   "avatar": [
    //     {
    //       "name": "avatar1.jpg",
    //       "type": "image/jpeg",
    //       "size": 1024
    //     },
    //     {
    //       "name": "avatar2.png",
    //       "type": "image/png",
    //       "size": 2048
    //     }
    //   ]

    for (let key in files) {
        const actualFiles = files[key];
        //if there is no file
        if (!actualFiles) break;

        //if we upload more than 1 file
        if (actualFiles.length > 1) {
            req.files[key] = actualFiles
        }
        //if we upload only 1 file
        else {
            req.files[key] = actualFiles[0]
        }
    }
    next()
}
export default fileParser