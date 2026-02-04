import express from "express";
import cors from "cors";
import jobRoutes from "./api/routes/job.routes.js";
import fs from "fs";

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://pdf-tools-one-gamma.vercel.app',
    'https://pdf-tools-gql2sjpdq-xthegreats-projects.vercel.app',
    /^https:\/\/pdf-tools-.*\.vercel\.app$/,
    process.env.FRONTEND_URL || '*'
  ],
  credentials: true
}));

app.use("/outputs", express.static("outputs"));
app.use("/uploads", express.static("uploads"));

app.use("/api/jobs", jobRoutes);

app.get("/api/download/:filename", (req, res) => {
  const filePath = `outputs/${req.params.filename}`;

  res.download(filePath, (err) => {
    if (!err) {
      fs.unlinkSync(filePath);
    }
  });
});

app.get("/", (req, res) => {
  res.json({ status: "OK", message: "PDF Tools Backend is running" });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});