import express from "express"
import cors from "cors"
import jobRoutes from "./api/routes/job.routes.js"

const app = express()

app.use(cors())
app.use(express.json())

app.use("/api", jobRoutes)

export default app
