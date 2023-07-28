
const helper = require('../helper.js');
const path = require("path");
const parse = require('@vue/compiler-sfc').parse;
const transformAsync = require("@babel/core").transformAsync;

const VueHandler = require('./vueHandler.js');


module.exports = async function (options) {
  const storeNameMap = options.storeNameMap;

  helper.handleFiles(async (content, { filePath }) => {
    // console.log("file", filePath);
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
            const handler = new VueHandler(context, config,{
              filePath
            })

            return handler.create();
          },
          { storeNameMap, autoImport: true }]
      ]
    }

    const result = await transformAsync(script, options);
    const newContent = content.replace(script, "\n" + result.code + "\n");


    return newContent;
  }, {
    fileRules: [
      path.resolve(options.source, "components/**/*.{vue,js}"),
      path.resolve(options.source, "pages/**/*.{vue,js}"),
      path.resolve(options.source, "layout/**/*.{vue,js}"),
      path.resolve(options.source, "plugins/**/*.{vue,js}"),
      path.resolve(options.source, "modules/**/*.{vue,js}"),
    ],
    // fileOptions: {
    //   ignore: [
    //     path.resolve(options.source, "stores/**/*"),
    //     path.resolve(options.source, "store/**/*")
    //   ],
    // },
    output: {
      source: path.resolve(options.source),
      dest: path.resolve(options.dest),
    }
  })
}


