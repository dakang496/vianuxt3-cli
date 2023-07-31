const helper = require("../helper.js");
const path = require("path");
const parse = require("@vue/compiler-sfc").parse;
const transformAsync = require("@babel/core").transformAsync;

const VueHandler = require("./vueHandler.js");

module.exports = async function(options) {
  const storeNameMap = options.storeNameMap;

  helper.handleFiles(async(content, { filePath }) => {
    // console.log("file", filePath);
    const extension = path.extname(filePath);
    let script = null;
    const isVue = extension === ".vue";

    if (isVue) {
      const parsed = parse(content);

      script = parsed.descriptor.script?.content;
    } else if (extension === ".js") {
      script = content;
    }
    if (!script) {
      return content;
    }

    let handler = null;

    const options = {
      plugins: [
        [
          function(context, config) {
            handler = new VueHandler(context, config, {
              filePath,
            });

            return handler.create();
          },
          { storeNameMap, autoImport: true },
        ],
      ],
      compact: false,
    };

    try {
      const result = await transformAsync(script, options);

      if (handler && !handler.modified) {
        // console.log("not modified", filePath);
        return content;
      }

      const finalScript = await helper.formatCode(result.code, {}, filePath);
      const newContent = content.replace(script, (isVue ? "\n" : "") + finalScript + "\n");

      return newContent;
    } catch (error) {
      console.warn("!!!!", filePath, "!!!!");
      console.error(error);
      throw error;
    }
  }, {
    fileRules: [
      path.resolve(options.source, "components/**/*.{vue,js}"),
      path.resolve(options.source, "pages/**/*.{vue,js}"),
      path.resolve(options.source, "layout/**/*.{vue,js}"),
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
    },
  });
};
