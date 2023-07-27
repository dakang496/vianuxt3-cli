
const helper = require('../helper.js');
const path = require("path");
const parse = require('@vue/compiler-sfc').parse;
const transformAsync = require("@babel/core").transformAsync;

const VueHandler = require('./vueHandler.js');


module.exports = async function (options) {
  const storeNameMap = options.storeNameMap;

  helper.handleFiles(async (content, { filePath }) => {
    console.log("file", filePath);
    const extension = path.extname(filePath);
    let script = null;
    if (extension === ".vue") {
      const parsed = parse(content);
      script = parsed.descriptor.script?.content;

    } else if (extension === ".js") {
      script = content;
    }
    if (!script) {
      return content;
    }

    const options = {
      plugins: [
        [
          function (context, config) {
            const handler = new VueHandler(context, config)

            return handler.create();
          },
          { storeNameMap, autoImport: false }]
      ]
    }

    const result = await transformAsync(script, options);
    const newContent = content.replace(script, "\n" + result.code + "\n");


    return newContent;
  }, {
    fileRules: [
      // path.resolve(options.root, "components/**/*.vue"),
      // path.resolve(options.root, "components/**/*.js"),
      // path.resolve(options.root, "pages/**/*.vue"),
      // path.resolve(options.root, "pages/**/*.js"),
      // path.resolve(options.root, "layout/**/*.vue"),
      // path.resolve(options.root, "layout/**/*.js"),
      path.resolve(options.root, "**/*.vue"),
      path.resolve(options.root, "**/*.js"),
      // "nuxt/**/*.vue",
      // "nuxt/**/*.js"
    ],
    output: {
      source: path.resolve(options.root),
      source: path.resolve(options.root),
    }
  })
}


