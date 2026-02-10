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
      return await officeToPDF(job);
    case "image-to-pdf":
      return await imageToPDF(job);
    case "compress-pdf":
      return await compressPDF(job);
    default:
      updateJob(job.jobId, {
        status: "failed",
        error: "Unknown job type"
      });
  }
}

function officeToPDF(job) {
  return new Promise((resolve, reject) => {
    const inputPath = job.filePath;
    const ext = path.extname(inputPath).toLowerCase();

    const blocked = [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"];

    if (blocked.includes(ext)) {
      updateJob(job.jobId, {
        status: "failed",
        error: "File gambar tidak didukung. Gunakan Image to PDF."
      });
      resolve();
      return;
    }

    const outputDir = "outputs";
    const jobId = job.jobId;

    updateJob(jobId, { status: "processing", progress: 10 });

    exec(
      `libreoffice --headless --convert-to pdf "${inputPath}" --outdir ${outputDir}`,
      { timeout: 120000 },
      (err) => {
        if (err) {
          updateJob(jobId, { status: "failed", error: err.message });
          resolve();
          return;
        }

        const outputFile = path.parse(inputPath).name + ".pdf";

        updateJob(jobId, {
          progress: 100,
          status: "finished",
          outputPath: `outputs/${outputFile}`
        });
        
        resolve();
      }
    );
  });
}

function imageToPDF(job) {
  return new Promise((resolve, reject) => {
    console.log("START imageToPDF", job.jobId);

    const input = path.resolve(job.filePath);
    const output = path.resolve("outputs", `${job.jobId}.pdf`);

    updateJob(job.jobId, { status: "processing", progress: 50 });

    exec(`img2pdf "${input}" -o "${output}"`, { timeout: 60000 }, (err) => {
      console.log("DONE imageToPDF", job.jobId, err);

      if (err) {
        updateJob(job.jobId, { status: "failed", error: err.message });
        resolve();
        return;
      }

      updateJob(job.jobId, {
        progress: 100,
        status: "finished",
        outputPath: `outputs/${job.jobId}.pdf`
      });
      
      resolve();
    });
  });
}

function compressPDF(job) {
  return new Promise((resolve, reject) => {
    const input = job.filePath;
    const output = `outputs/${job.jobId}.pdf`;
    
    console.log(`🔍 DEBUG - Received job:`, {
      jobId: job.jobId,
      type: job.type,
      quality: job.quality,
      qualityType: typeof job.quality,
      filePath: job.filePath
    });
    
    const validLevels = ["screen", "ebook", "printer", "prepress"];
    const level = validLevels.includes(job.quality) ? job.quality : "ebook";

    console.log(`DEBUG - Selected level:`, {
      requestedQuality: job.quality,
      selectedLevel: level,
      isValid: validLevels.includes(job.quality)
    });
    
    const qualitySettings = {
      screen: {
        colorImageResolution: 72,
        grayImageResolution: 72,
        monoImageResolution: 300,
        jpegQuality: 0.4,
        description: "Lowest quality - Screen viewing"
      },
      ebook: {
        colorImageResolution: 150,
        grayImageResolution: 150,
        monoImageResolution: 300,
        jpegQuality: 0.6,
        description: "Medium quality - E-readers"
      },
      printer: {
        colorImageResolution: 300,
        grayImageResolution: 300,
        monoImageResolution: 600,
        jpegQuality: 0.8,
        description: "High quality - Printing"
      },
      prepress: {
        colorImageResolution: 300,
        grayImageResolution: 300,
        monoImageResolution: 1200,
        jpegQuality: 0.9,
        description: "Highest quality - Professional"
      }
    };

    const settings = qualitySettings[level];
    
    console.log(`Compressing PDF with quality: ${level} (${settings.description})`);
    console.log(`Resolution:`, {
      color: settings.colorImageResolution + ' DPI',
      gray: settings.grayImageResolution + ' DPI',
      mono: settings.monoImageResolution + ' DPI',
      jpeg: (settings.jpegQuality * 100) + '%'
    });
    
    const before = getFileSizeMB(input);

    updateJob(job.jobId, {
      status: "processing",
      progress: 30,
      originalSize: before,
      quality: level
    });

    const gsCommand = `gs \
      -sDEVICE=pdfwrite \
      -dCompatibilityLevel=1.4 \
      -dNOPAUSE \
      -dQUIET \
      -dBATCH \
      -dDetectDuplicateImages=true \
      -dCompressFonts=true \
      -dSubsetFonts=true \
      -dAutoRotatePages=/None \
      -dDownsampleColorImages=true \
      -dDownsampleGrayImages=true \
      -dDownsampleMonoImages=true \
      -dColorImageDownsampleType=/Bicubic \
      -dColorImageResolution=${settings.colorImageResolution} \
      -dGrayImageDownsampleType=/Bicubic \
      -dGrayImageResolution=${settings.grayImageResolution} \
      -dMonoImageDownsampleType=/Subsample \
      -dMonoImageResolution=${settings.monoImageResolution} \
      -dColorImageDownsampleThreshold=1.0 \
      -dGrayImageDownsampleThreshold=1.0 \
      -dMonoImageDownsampleThreshold=1.0 \
      -dColorImageFilter=/DCTEncode \
      -dGrayImageFilter=/DCTEncode \
      -dMonoImageFilter=/CCITTFaxEncode \
      -dJPEGQ=${Math.round(settings.jpegQuality * 100)} \
      -dOptimize=true \
      -dEmbedAllFonts=true \
      -dUseFlateCompression=true \
      -dPreserveEPSInfo=false \
      -dPreserveOPIComments=false \
      -dPreserveOverprintSettings=false \
      -dUCRandBGInfo=/Remove \
      -dColorConversionStrategy=/sRGB \
      -sOutputFile="${output}" \
      "${input}"`;
    
    console.log(`Ghostscript command:`, gsCommand.split('\\\n').join(' ').trim());

    exec(gsCommand, { timeout: 180000 }, (err, stdout, stderr) => {
      if (err) {
        console.error(`Compression failed:`, err.message);
        if (stderr) console.error(`STDERR:`, stderr);
        updateJob(job.jobId, {
          status: "failed",
          error: err.message
        });
        resolve();
        return;
      }

      if (!fs.existsSync(output)) {
        updateJob(job.jobId, {
          status: "failed",
          error: "Output file not created"
        });
        resolve();
        return;
      }

      const after = getFileSizeMB(output);
      const saved = before - after;
      const percent = ((before - after) / before) * 100;

      console.log(`Compression complete:`, {
        level: level,
        original: before.toFixed(2) + " MB",
        compressed: after.toFixed(2) + " MB",
        saved: saved.toFixed(2) + " MB (" + percent.toFixed(1) + "%)",
        settings: `${settings.colorImageResolution}DPI @ ${Math.round(settings.jpegQuality * 100)}% JPEG`
      });

      if (after >= before * 0.98) {
        console.warn(`File already optimized or compressed version is larger`);
        
        fs.copyFileSync(input, output);
        
        updateJob(job.jobId, {
          progress: 100,
          status: "finished",
          outputPath: output,
          originalSize: before,
          compressedSize: before,
          savedMB: "0.00",
          savedPercent: "0.0",
          message: "File is already optimized"
        });
      } else {
        updateJob(job.jobId, {
          progress: 100,
          status: "finished",
          outputPath: output,
          originalSize: before,
          compressedSize: after,
          savedMB: saved.toFixed(2),
          savedPercent: percent.toFixed(1)
        });
      }
      
      resolve();
    });
  });
}

function getFileSizeMB(filePath) {
  const bytes = fs.statSync(filePath).size;
  return bytes / 1024 / 1024;
}