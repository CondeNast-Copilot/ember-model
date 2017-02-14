var store, registry, owner, App;

function buildOwner () {
  var Owner = Ember.Object.extend(Ember._RegistryProxyMixin, Ember._ContainerProxyMixin, {
    init: function() {
      this._super.apply(arguments);
      var registry = new Ember.Registry(this._registryOptions);
      this.__registry__ = registry;
      this.__container__ = registry.container({ owner: this });
    }
  });

  return Owner.create();
}

module("Ember.Adapter#findAll");

test("Model.find() delegates to Adapter#findAll", function() {
  expect(7);

  var Model = Ember.Model.extend({
    name: Ember.attr(),
    type: 'test'
  });
  Model.adapter = Ember.FixtureAdapter.create();
  Model.FIXTURES = [
    {id: 1, name: 'Erik'}
  ];

  owner = buildOwner();
  Ember.setOwner(Model, owner);
  owner.register('model:test', Model);
  store = Ember.Model.Store.create();
  Ember.setOwner(store, owner);
  owner.register('service:store', Ember.Model.Store);

  var records = Ember.run(Model, Model.find);
  ok(records instanceof Ember.RecordArray, "RecordArray is returned");
  ok(!records.get('isLoaded'));
  ok(records.get('isLoading'));
  stop();

  records.on('didLoad', function() {
    start();
    // equal(records.get('firstObject.id'), 1); // TODO: built-in CP for primaryKey
    equal(records.get('firstObject.name'), 'Erik');
    ok(records.get('firstObject.isLoaded'));
    ok(records.get('isLoaded'));
    ok(!records.get('isLoading'));
  });
});

test("Model.find() returns the same RecordArray for each successful call", function() {
  var Model = Ember.Model.extend();
  Model.adapter = {
    findAll: Ember.RSVP.resolve
  };

  var firstResult = Model.find();
  var secondResult = Model.find();

  equal(firstResult, secondResult, "The same RecordArray was returned");
});

//test("Model.find() returns a new RecordArray if the last call failed", function() {
//  var Model = Ember.Model.extend();
//  Model.adapter = {
//    findAll: Ember.RSVP.reject
//  };
//
//  var firstResult, secondResult;
//  Ember.run(function() {
//    firstResult = Model.find();
//  });
//  secondResult = Model.find();
//
//  notEqual(firstResult, secondResult, "A new RecordArray was returned");
//});
