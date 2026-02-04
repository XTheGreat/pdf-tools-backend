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

  busboy.on("file", (name, file, info) => {
    const filename = `${randomUUID()}-${info.filename}`
    filePath = path.join(uploadDir, filename)

    const writeStream = fs.createWriteStream(filePath)
    file.pipe(writeStream)
  })

  busboy.on("finish", () => {
    req.filePath = filePath
    next()
  })

  req.pipe(busboy)
}
