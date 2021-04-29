module.exports = {
  // This function will run for each entry/format/env combination
  rollup(config, options) {
    //   console.log(config, options);
    // console.log(config.output);
    // config.output.esModule = false;
    config.output.exports = 'default';
    // console.log(config.output);
    return config; // always return a config.
  },
};
