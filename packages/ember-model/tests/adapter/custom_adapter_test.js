var CustomModel;
var owner;

module("Ember.CustomAdapter", {
  setup: function() {
    owner = buildOwner();
    Ember.CustomAdapter = Ember.Adapter.extend();
    Ember.CustomAdapter.reopenClass({
      toString() {
        return 'Ember.CustomAdapter';
      }
    });
    CustomModel = Ember.Model.extend({
      name: Ember.attr(),
    });
    Ember.setOwner(CustomModel, owner);
    CustomModel.adapter = Ember.CustomAdapter.create();
  }
});

test("throws an error message with class name", function() {
  expect(1);

  throws(function() {
    Ember.run(CustomModel, CustomModel.find(1));
  }, /Ember.CustomAdapter must implement find/);
});
