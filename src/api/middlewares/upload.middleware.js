import Busboy from "busboy"
import fs from "fs"
import path from "path"
import { randomUUID } from "crypto"

export const streamUpload = (req, res, next) => {
  const busboy = Busboy({ headers: req.headers })
  const uploadDir = path.join(process.cwd(), "uploads")

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir)
  }

  let filePath = null
  const fields = {}

  busboy.on("field", (fieldname, value) => {
    fields[fieldname] = value
    console.log(`📝 Field received: ${fieldname} = ${value}`)
  })

  busboy.on("file", (name, file, info) => {
    const filename = `${randomUUID()}-${info.filename}`
    filePath = path.join(uploadDir, filename)

    const writeStream = fs.createWriteStream(filePath)
    file.pipe(writeStream)
  })

  busboy.on("finish", () => {
    req.filePath = filePath
    req.body = fields
    
    console.log(`Upload finished:`, {
      filePath,
      type: fields.type,
      quality: fields.quality
    })
    
    next()
  })

  req.pipe(busboy)
}