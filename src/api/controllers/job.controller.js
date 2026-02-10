import { v4 as uuid } from "uuid";
import { addJob } from "../../jobs/queue.js";
import { createJob, getJob } from "../../jobs/job.store.js";
import fs from "fs";
import path from "path";

export function createJobHandler(req, res) {
  const jobId = uuid();
  const type = req.body.type || "office-to-pdf";
  const quality = req.body.quality || "ebook";

  console.log(`Creating job:`, {
    jobId,
    type,
    quality,
    qualityType: typeof quality
  })

  const job = {
    jobId,
    type,
    quality,
    status: "queued",
    progress: 0,
    filePath: req.file?.path || req.filePath,
  };

  createJob(job);
  addJob(job);

  res.json({ jobId, status: "queued", type, quality });
}

export function getJobStatus(req, res) {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ message: "Job not found" });
  res.json(job);
}

export function downloadJob(req, res) {
  const jobId = req.params.id;
  const job = getJob(jobId);

  if (!job || job.status !== "finished") {
    return res.status(404).json({ message: "File not ready" });
  }

  res.download(path.resolve(job.outputPath), (err) => {
    if (!err) {
      fs.unlinkSync(job.outputPath);
    }
  });
}