'use strict';

var path = require('path');
var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');

module.exports = {
  name: 'ember-model',

  included: function() {
    this._super.included.apply(this, arguments);
    this.import('vendor/ember-model.js');
  },

  treeForVendor(vendorTree) {
    var emberModelTree = new Funnel(path.join(this.project.root, 'node_modules', '@condenast', 'ember-model'), {
      files: ['ember-model.js'],
    });

    if (vendorTree) {
      return new MergeTrees([vendorTree, emberModelTree]);
    } else {
      return emberModelTree;
    }
  },

  isDevelopingAddon () {
    return true;
  }
};
