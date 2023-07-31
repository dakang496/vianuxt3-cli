const helper = require("../helper.js");
const path = require("path");
const _ = require("lodash");
const transformAsync = require("@babel/core").transformAsync;

const VuexHandler = require("./vuexHandler.js");

module.exports = async function(options) {
  const storeNameMap = {};

  await helper.handleFiles(async(content, { filePath, extension, relativePath }) => {
    if (extension !== ".js") {
      return content;
    }
    const storeId = relativePath.replace(extension, "");

    storeNameMap[_.camelCase(storeId)] = true;

    const options = {
      plugins: [
        [
          function(context, config) {
            const handler = new VuexHandler(context, config);

            return handler.create();
          },
          {
            storeId,
          },
        ],
      ],
      compact: false,
    };

    try {
      const result = await transformAsync(content, options);

      const finalScript = await helper.formatCode(result.code, {}, filePath);

      const newContent = content.replace(content, finalScript + "\n");

      return newContent;
    } catch (error) {
      console.warn(filePath);
      console.error(error);
      throw error;
    }
  }, {
    fileRules: [path.resolve(options.source, "store/**/*.js")],
    output: {
      source: path.resolve(options.source, "store"),
      dest: path.resolve(options.dest, "stores"),
    },
  });

  return storeNameMap;
};
