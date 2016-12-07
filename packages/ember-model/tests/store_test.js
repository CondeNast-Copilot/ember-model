var TestModel, EmbeddedModel, UUIDModel, store, registry, owner, App;

function buildOwner() {
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

module("Ember.Model.Store", {
  setup: function() {
    owner = buildOwner();

    store = Ember.Model.Store.create();
    Ember.setOwner(store, owner);
    TestModel = Ember.Model.extend({
      token: Ember.attr(),
      name: Ember.attr(),
      type: 'test',
      embeddedBelongsTo: Ember.belongsTo('embedded', {
        key: 'embeddedBelongsTo',
        embedded: true
      }),
      embeddedHasmany: Ember.hasMany('embedded', {
        key: 'embeddedHasmany',
        embedded: true
      })
    });
    TestModel.primaryKey = 'token';
    TestModel.adapter = Ember.FixtureAdapter.create({});
    TestModel.FIXTURES = [
      {
        token: 'a',
        name: 'Erik',
        embeddedBelongsTo: {id: 1, name: 'Record 1'},
        embeddedHasmany: [
          {id: 1, name: 'Record 1'},
          {id: 2, name: 'Record 2'}
        ]
      },
      {
        token: 'b',
        name: 'Christina',
        embeddedBelongsTo: {id: 1, name: 'Record 1'},
        embeddedHasmany: [
          {id: 1, name: 'Record 1'},
          {id: 2, name: 'Record 2'}
        ]
      }
    ];

    EmbeddedModel = Ember.Model.extend({
      id: Ember.attr(),
      name: Ember.attr(),
      type: 'test'
    });
    EmbeddedModel.adapter = Ember.FixtureAdapter.create({});

    var uuid = 1234;

    UUIDModel = Ember.Model.extend({
      init: function() {
        this.set('id', uuid++);
        return this._super.apply(this, arguments);
      },
      token: Ember.attr(),
      name: Ember.attr()
    });
    EmbeddedModel.adapter = Ember.FixtureAdapter.create({});

    owner.register('model:test', TestModel);
    owner.register('model:embedded', EmbeddedModel);
    owner.register('model:uuid', UUIDModel);
    owner.register('service:store', Ember.Model.Store);
  }
});

test("store.createRecord(type) returns a record with an owner", function() {
  var record = Ember.run(store, store.createRecord, 'test');
  equal(Ember.getOwner(record), owner);
});

test("store.createRecord(type) with properties", function() {
  expect(2);
  var record = Ember.run(store, store.createRecord, 'test', {token: 'c', name: 'Andrew'});
  equal(record.get('token'), 'c');
  equal(record.get('name'), 'Andrew');
});

test("model.load(hashes) returns a existing record with correct owner", function() {
  var model = store.modelFor('uuid'),
      record = Ember.run(store, store.createRecord, 'uuid');

  equal(model, UUIDModel);
  equal(Ember.getOwner(record), owner);

  ok(record.set('token', 'c'));

  equal(record.get('id'), 1234);
  equal(record.get('token'), 'c');

  model.load({id: 1234, token: 'd', name: 'Andrew'}, owner);

  equal(record.get('id'), 1234);
  equal(record.get('token'), 'd');
  equal(record.get('name'), 'Andrew');
  equal(Ember.getOwner(record), owner);

  model.load({id: 1234, name: 'Peter'}, owner);

  equal(record.get('id'), 1234);
  equal(record.get('token'), undefined);
  equal(record.get('name'), 'Peter');
  equal(Ember.getOwner(record), owner);
});

test("store.find(type) returns a record with hasMany and belongsTo that should all have an owner", function() {
  expect(4);
  var promise = Ember.run(store, store.find, 'test', 'a');
  promise.then(function(record) {
    start();
    ok(Ember.getOwner(record));
    ok(Ember.getOwner(record.get('embeddedBelongsTo')));

    record.get('embeddedHasmany').forEach(function(embeddedBelongsToRecord) {
      ok(Ember.getOwner(embeddedBelongsToRecord));
    });
  });
  stop();
});

test("store.find(type, id) returns a promise and loads an owner for the record", function() {
  expect(2);

  var promise = Ember.run(store, store.find, 'test','a');
  promise.then(function(record) {
    start();
    ok(record.get('isLoaded'));
    ok(Ember.getOwner(record));
  });
  stop();
});

test("store.find(type) returns a promise and loads an owner for each record", function() {
  expect(5);

  var promise = Ember.run(store, store.find, 'test');
  promise.then(function(records) {
    start();
    equal(records.content.length, 2);
    records.forEach(function(record){
      ok(record.get('isLoaded'));
      ok(Ember.getOwner(record));
    });
  });
  stop();
});

test("store.find(type, Array) returns a promise and loads an owner for each record", function() {
  expect(5);

  var promise = Ember.run(store, store.find, 'test', ['a','b']);
  promise.then(function(records) {
    start();
    equal(records.content.length, 2);
    records.forEach(function(record){
      ok(record.get('isLoaded'));
      ok(Ember.getOwner(record));
    });
  });
  stop();
});

test("store.adapterFor(type) returns klass.adapter first", function() {
  var adapter = Ember.run(store, store.adapterFor, 'test');
  equal(adapter.constructor, Ember.FixtureAdapter);
});

test("store.adapterFor(type) returns type adapter if no klass.adapter", function() {
  TestModel.adapter = undefined;
  owner.register('adapter:test', Ember.FixtureAdapter);
  owner.register('adapter:application', null);
  var adapter = Ember.run(store, store.adapterFor, 'test');
  ok(adapter instanceof Ember.FixtureAdapter);
});

test("store.adapterFor(type) returns application adapter if no klass.adapter or type adapter", function() {
  TestModel.adapter = undefined;
  owner.register('adapter:test', null);
  owner.register('adapter:application', Ember.FixtureAdapter);
  var adapter = Ember.run(store, store.adapterFor, 'test');
  ok(adapter instanceof Ember.FixtureAdapter);
});

test("store.adapterFor(type) defaults to RESTAdapter if no adapter specified", function() {

  TestModel.adapter = undefined;
  owner.register('adapter:test', null);
  owner.register('adapter:application', null);
  owner.register('adapter:REST',  Ember.RESTAdapter);
  var adapter = Ember.run(store, store.adapterFor, 'test');
  ok(adapter instanceof Ember.RESTAdapter);
});

test("store.find(type) records use application adapter if no klass.adapter or type adapter", function() {
  expect(3);
  TestModel.adapter = undefined;
  EmbeddedModel.adapter = undefined;
  owner.register('adapter:test', null);
  owner.register('adapter:application', Ember.FixtureAdapter);

  var promise = Ember.run(store, store.find, 'test','a');

  promise.then(function(record) {
    start();
    ok(record.get('constructor.adapter') instanceof Ember.FixtureAdapter, 'Adapter for record is application adapter');
    ok(record.get('embeddedBelongsTo.constructor.adapter') instanceof Ember.FixtureAdapter, 'Adapter for belongsTo record is application adapter');
    ok(record.get('embeddedHasmany.firstObject.constructor.adapter') instanceof Ember.FixtureAdapter, 'Adapter for hasMany record is application adapter');
  });

  stop();
});

test("Registering a custom store on application works", function() {
  Ember.run(function() {
    var CustomStore = Ember.Model.Store.extend({ custom: true });
    App = Ember.Application.create({
      TestRoute: Ember.Route.extend(),
      Store: CustomStore
    });
  });

  var container = App.__container__;
  ok(container.lookup('service:store').get('custom'));

  var testRoute = container.lookup('route:test');
  ok(testRoute.get('store.custom'));

  Ember.run(App, 'destroy');
});

test("store.serializerFor(type) returns type serializer by default", function() {
  var TestSerializer =  Ember.Object.extend({});

  owner.register('serializer:test', TestSerializer);

  var serializer = Ember.run(store, store.serializerFor, 'test');
  ok(serializer instanceof TestSerializer);
});

test("store.serializerFor(type) defaults to JSONSerializer if no serializer is specified", function() {
  owner.register('serializer:test', null);
  owner.register('serializer:application', null);
  owner.register('serializer:JSON',  Ember.JSONSerializer);
  var serializer = Ember.run(store, store.serializerFor, 'test');
  ok(serializer instanceof Ember.JSONSerializer);
});

test("store.adapterFor returns an adapter with a serializer", function() {
  var TestSerializer =  Ember.Object.extend({});
  owner.register('serializer:test', TestSerializer);

  var adapter = Ember.run(store, store.adapterFor, 'test');
  ok(adapter.get('serializer') instanceof TestSerializer);
});
