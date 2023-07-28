const handleVuex = require('./vuex.js');
const handelVue = require('./vue.js');
module.exports = async function (options) {
  const defaultOptions = {
    source: process.cwd(),
    dest: process.cwd(),
  }
  const _options = { ...defaultOptions, ...options };

  const storeNameMap = await handleVuex(_options);
  await handelVue({ ..._options, storeNameMap });
}