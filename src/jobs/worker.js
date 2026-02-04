import { exec } from "child_process";
import path from "path";
import { updateJob } from "./job.store.js";
import fs from "fs";

export async function processJob(job) {
  if (!fs.existsSync("outputs")) {
    fs.mkdirSync("outputs");
  }

  switch (job.type) {
    case "office-to-pdf":
      return officeToPDF(job);
    case "image-to-pdf":
      return imageToPDF(job);
    case "compress-pdf":
      return compressPDF(job);
    default:
      updateJob(job.jobId, {
        status: "failed",
        error: "Unknown job type"
      });
  }
}

function officeToPDF(job) {
  const inputPath = job.filePath;
  const ext = path.extname(inputPath).toLowerCase();

  const blocked = [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"];

  if (blocked.includes(ext)) {
    updateJob(job.jobId, {
      status: "failed",
      error: "File gambar tidak didukung. Gunakan Image to PDF."
    });
    return;
  }

  const outputDir = "outputs";
  const jobId = job.jobId;

  updateJob(jobId, { status: "processing", progress: 10 });

  exec(
    `libreoffice --headless --convert-to pdf "${inputPath}" --outdir ${outputDir}`,
    (err) => {
      if (err) {
        updateJob(jobId, { status: "failed", error: err.message });
        return;
      }

      const outputFile = path.parse(inputPath).name + ".pdf";

      updateJob(jobId, {
        progress: 100,
        status: "finished",
        outputPath: `outputs/${outputFile}`
      });
    }
  );
}

function imageToPDF(job) {
  console.log("START imageToPDF", job.jobId);

  const input = path.resolve(job.filePath);
  const output = path.resolve("outputs", `${job.jobId}.pdf`);

  exec(`img2pdf "${input}" -o "${output}"`, { timeout: 60000 }, (err) => {
    console.log("DONE imageToPDF", job.jobId, err);

    if (err) {
      updateJob(job.jobId, { status: "failed", error: err.message });
      return;
    }

    updateJob(job.jobId, {
      progress: 100,
      status: "finished",
      outputPath: `outputs/${job.jobId}.pdf`
    });
  });
}

function compressPDF(job) {
  const input = job.filePath;
  const output = `outputs/${job.jobId}.pdf`;
const level = job.quality || "ebook";
  const before = getFileSizeMB(input);

  updateJob(job.jobId, {
    status: "processing",
    progress: 30,
    originalSize: before
  });

  exec(`gs -sDEVICE=pdfwrite -dPDFSETTINGS=/${level} -dNOPAUSE -dBATCH -dQUIET -sOutputFile="${output}" "${input}"`, (err) => {
    if (err) {
      updateJob(job.jobId, {
        status: "failed",
        error: err.message
      });
      return;
    }

    const after = getFileSizeMB(output);
    const saved = before - after;
    const percent = (saved / before) * 100;

    updateJob(job.jobId, {
      progress: 100,
      status: "finished",
      outputPath: output,
      compressedSize: after,
      savedMB: saved.toFixed(2),
      savedPercent: percent.toFixed(1)
    });
  });
}

function getFileSizeMB(path) {
  const bytes = fs.statSync(path).size;
  return bytes / 1024 / 1024;
}

