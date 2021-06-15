importScripts('../dist/pipeline.umd.development.js');

Util = {
  genderRandomArray: function(len) {
    if (typeof len != 'number') {
      len = parseInt(len, 10);
    }
    if (!len) {
      len = 100000;
    }
    var i = 0;
    var arr = [];
    while (i++ < len) {
      arr.push((Math.random() * 100000) >>> 0);
    }
    return arr;
  },
};

// setTimeout(() => {
//   self.postMessage({ a: 1 });
//   self.postMessage('abc');
// }, 2000);
