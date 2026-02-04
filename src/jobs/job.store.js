const jobs = new Map();

export function createJob(job) {
  jobs.set(job.jobId, job);
}

export function updateJob(jobId, data) {
  if (!jobs.has(jobId)) return;
  jobs.set(jobId, { ...jobs.get(jobId), ...data });
}

export function getJob(jobId) {
  return jobs.get(jobId);
}
