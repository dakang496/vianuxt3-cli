const fsExtra = require("fs-extra");
const glob = require("glob");
const path = require("path");
const formatCode = require("./formatCode.js");

module.exports = {
  handleFiles: async function(handler, config = {}) {
    const files = glob.globSync(config.fileRules, config.fileOptions);

    for (let i = 0; i < files.length; i++) {
      const filePath = files[i];
      const content = fsExtra.readFileSync(filePath, "utf8");

      try {
        const extension = path.extname(filePath);
        const options = config.output;
        const source = options ? options.source : "";
        const dest = options ? options.dest : "";
        const relativePath = source ? path.relative(path.resolve(source), filePath) : "";
        const outputPath = dest ? path.resolve(path.resolve(dest), relativePath) : "";

        const newContent = await handler(content, {
          extension,
          filePath,
          relativePath,
        });

        outputPath && fsExtra.outputFileSync(outputPath, newContent);
      } catch (error) {
        console.error(error);
      }
    }
  },
  formatCode,
};
