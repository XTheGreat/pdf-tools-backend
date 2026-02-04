import { updateJob } from "./job.store.js";

export async function processJob(job) {
  for (let i = 1; i <= 10; i++) {
    await new Promise(r => setTimeout(r, 500));
    updateJob(job.id, {
      progress: i * 10,
      status: "processing"
    });
  }

  updateJob(job.id, {
    progress: 100,
    status: "finished",
    filePath: job.outputPath
  });
}
