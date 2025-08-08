import express from "express";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const port = process.env.PORT || 3000;

// Setup upload folder
const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("apk"), async (req, res) => {
  const apkPath = req.file.path;
  const outputDir = `decompiled/${req.file.filename}`;

  // Run jadx using system command
  exec(`java -jar jadx-1.5.2-all.jar -d ${outputDir} ${apkPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).send("Decompilation failed");
    }

    // Send zipped folder
    const archiver = require("archiver");
    const archive = archiver("zip");
    const zipPath = `${outputDir}.zip`;
    const output = fs.createWriteStream(zipPath);

    output.on("close", () => {
      res.download(zipPath, "decompiled_source.zip", () => {
        // Clean up
        fs.unlinkSync(zipPath);
        fs.rmSync(outputDir, { recursive: true, force: true });
        fs.unlinkSync(apkPath);
      });
    });

    archive.pipe(output);
    archive.directory(outputDir, false);
    archive.finalize();
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
