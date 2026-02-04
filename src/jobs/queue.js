import { processJob } from "./worker.js";

const queue = [];
let busy = false;

export function addJob(job) {
  queue.push(job);
  run();
}

async function run() {
  if (busy || queue.length === 0) return;
  busy = true;

  const job = queue.shift();
  await processJob(job);

  busy = false;
  run();
}
