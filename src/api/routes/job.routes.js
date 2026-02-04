import express from "express";
import {
  createJobHandler,
  getJobStatus,
  downloadJob
} from "../controllers/job.controller.js";
import upload from "../../config/multer.js";

const router = express.Router();

router.post("/", upload.single("file"), createJobHandler);
router.get("/:id", getJobStatus);
router.get("/:id/download", downloadJob);

export default router;
