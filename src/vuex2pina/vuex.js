const helper = require('../helper.js');
const path = require("path");
var _ = require('lodash');
const transformAsync = require("@babel/core").transformAsync;
const vuexHandler = require('./vuexHandler.js');


module.exports = async function (options) {

  const storeNameMap = {}

  await helper.handleFiles(async (content, { filePath, extension, relativePath }) => {
    if (extension !== ".js") {
      return content;
    }
    const storeId = relativePath.replace(extension, "");

    storeNameMap[_.camelCase(storeId)] = true;

    const options = {
      plugins: [
        [
          function (context, config) {
            const handler = new vuexHandler(context, config)

            return handler.create();
          },
          {
            storeId: storeId,
          }
        ]
      ]
    }

    const result = await transformAsync(content, options);
    const newContent = content.replace(content, "\n" + result.code + "\n");


    return newContent;
  }, {
    fileRules: [path.resolve(options.root, "store/**/*.js")],
    // fileRules: ["nuxt/store/**/account.js"],
    output: {
      source: path.resolve(options.root, "store"),
      dest: path.resolve(options.root, "stores"),
    }
  });

  return storeNameMap;

}


