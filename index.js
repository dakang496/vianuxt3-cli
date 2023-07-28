#!/usr/bin/env node

const program = require('commander');
const ora = require('ora');

const pkg = require('./package.json');
program.version(pkg.version, '-v, --version');
// program.option('-c, --config [file]', 'setup profile', 'vianuxt.config.js');

const handleVuex2pina = require('./src/vuex2pina/index.js');

async function showSpinner(text, callback) {
  const spinner = ora(text);
  spinner.start();
  try {
    await callback();
    spinner.succeed();
  } catch (error) {
    spinner.fail();
    throw error;
  }
}



program
  .command('vuex2pinia')
  .option('-s, --source [path]', 'source directory of project',"./")
  .option('-d, --dest [path]', 'dest directory of project',"./")
  .description('convert vuex to pinia')
  .action(function (options) {
    showSpinner('vuex2pinia', async function () {
      handleVuex2pina(options);
    });
  });
  program.parse(process.argv);

