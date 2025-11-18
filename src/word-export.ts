import { Document, Packer, Paragraph, ImageRun } from "docx";
import fs from "fs-extra";
import path from "path";
import sizeOf from "image-size";
import { ScreenshotType } from "./types";
import { SCREENSHOT_DIR } from "./constants";

export const generateWordFiles = async (): Promise<void> => {
  const types: ScreenshotType[] = ["desktop", "ios", "android", "breadcrumbs"];
  const themes = ["light", "dark"];

  for (const type of types) {
    // Special case: breadcrumbs → single doc, no theme split
    if (type === "breadcrumbs") {
      const folder = path.join(SCREENSHOT_DIR, type);
      if (!(await fs.pathExists(folder))) continue;

      const files = await fs.readdir(folder);
      const screenshots: string[] = files
        .filter((f) => f.endsWith(".png"))
        .map((f) => path.join(folder, f));

      if (screenshots.length === 0) continue;

      const doc = new Document({
        sections: [
          {
            children: screenshots.flatMap((filePath, idx) => {
              const imageBuffer = fs.readFileSync(filePath);
              const dimensions = sizeOf(imageBuffer);
              const maxWidth = 600;
              const scale =
                dimensions.width && dimensions.width > maxWidth
                  ? maxWidth / dimensions.width
                  : 1;

              const width = dimensions.width
                ? dimensions.width * scale
                : maxWidth;
              const height = dimensions.height
                ? dimensions.height * scale
                : 400;

              return [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: imageBuffer,
                      transformation: { width, height },
                      type: "png",
                    }),
                  ],
                }),
                new Paragraph({
                  text: `Breadcrumb Screenshot ${idx + 1}`,
                }),
              ];
            }),
          },
        ],
      });

      const outPath = path.join(SCREENSHOT_DIR, `breadcrumbs.docx`);
      const buffer = await Packer.toBuffer(doc);
      await fs.writeFile(outPath, buffer);
      console.log(`📄 Word file created: ${outPath}`);
      continue; // skip theme loop for breadcrumbs
    }

    // Normal flow for desktop, ios, android
    for (const theme of themes) {
      const folder = path.join(SCREENSHOT_DIR, type);
      if (!(await fs.pathExists(folder))) continue;

      const files = await fs.readdir(folder, { withFileTypes: true });
      const themeScreenshots: string[] = [];

      // Collect screenshots recursively from step folders
      for (const dirent of files) {
        if (dirent.isDirectory()) {
          const stepFolder = path.join(folder, dirent.name);
          const stepFiles = await fs.readdir(stepFolder);
          for (const f of stepFiles) {
            if (f.includes(`_${theme}_`)) {
              themeScreenshots.push(path.join(stepFolder, f));
            }
          }
        }
      }

      if (themeScreenshots.length === 0) continue;

      const doc = new Document({
        sections: [
          {
            children: themeScreenshots.flatMap((filePath) => {
              const imageBuffer = fs.readFileSync(filePath);

              // 💻 Scale down desktop screenshots if too wide
              const dimensions = sizeOf(imageBuffer);
              const maxWidth = 600;
              const scale =
                dimensions.width && dimensions.width > maxWidth
                  ? maxWidth / dimensions.width
                  : 1;

              const width = dimensions.width
                ? dimensions.width * scale
                : maxWidth;
              const height = dimensions.height
                ? dimensions.height * scale
                : 400;

              return [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: imageBuffer,
                      transformation: { width, height },
                      type: "png",
                    }),
                  ],
                }),
              ];
            }),
          },
        ],
      });

      const outPath = path.join(SCREENSHOT_DIR, `${type}_${theme}.docx`);
      const buffer = await Packer.toBuffer(doc);
      await fs.writeFile(outPath, buffer);
      console.log(`📄 Word file created: ${outPath}`);
    }
  }
};
