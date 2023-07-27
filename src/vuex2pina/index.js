const handleVuex = require('./vuex.js');
const handelVue = require('./vue.js');
module.exports = async function (options) {
  console.log("vuex2pina start");

  const storeNameMap = await handleVuex(options);
  await handelVue({ ...options, storeNameMap });

  console.log("vuex2pina done");
}