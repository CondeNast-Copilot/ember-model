var Model, owner, store, RESTModel, data;

function ajaxSuccess(data) {
  return new Ember.RSVP.Promise(function(resolve, reject) {
    resolve(data);
  });
}

module("Ember.RecordArray", {
  setup: function() {
    Model = Ember.Model.extend({
      id: Ember.attr(),
      name: Ember.attr(),
      type: 'test'
    });
    Model.adapter = Ember.FixtureAdapter.create();
    Model.FIXTURES = [
      {id: 1, name: 'Erik'},
      {id: 2, name: 'Stefan'},
      {id: 3, name: 'Kris'}
    ];
    owner = buildOwner();
    store = Ember.Model.Store.create();
    Ember.setOwner(store, owner);
    Ember.setOwner(Model, owner);
    owner.register('model:test', Model);
    owner.register('service:store', Ember.Model.Store);
    data = [
      {id: 1, name: 'Erik'},
      {id: 2, name: 'Aaron'}
    ];
    RESTModel = Ember.Model.extend({
      id: Ember.attr(),
      name: Ember.attr(),
      type: 'test'
    });
    var adapter = Ember.RESTAdapter.create();
    adapter._ajax = function(url, params, method) {
      return ajaxSuccess(data);
    };
    adapter.findMany = function(klass, records, ids) {
      return adapter.findAll(klass, records);
    };
    RESTModel.adapter = adapter;
    RESTModel.url = '/fake/api';
    Ember.setOwner(RESTModel, owner);
    owner.register('model:test', RESTModel);
  }
});

test("load creates records with owner when owner exists", function() {
  var records = Ember.RecordArray.create({modelClass: Model});
  Ember.run(records, records.load, Model, Model.FIXTURES);
  records.forEach(function(record){
    ok(record.get('isLoaded'));
    ok(Ember.getOwner(record));
  });
});

test("when called with findMany, should contain an array of the IDs contained in the RecordArray", function() {
  var records = Ember.run(Model, Model.find, [1,2,3]);
  Ember.setOwner(records, owner);
  deepEqual(records.get('_ids'), [1,2,3]);
  equal(records.get('length'), 0);
  ok(!records.get('isLoaded'));
  stop();

  records.one('didLoad', function() {
    start();
    equal(records.get('length'), 3);
  });
});

test("findAll RecordArray implements reload", function() {
  expect(4);

  var records, changed;

  Ember.run(function() {
    records = RESTModel.findAll();
  });

  equal(records.get('length'), 2);

  data.push({id: 3, name: 'Ray'});
  data[1].name = 'Amos';

  Ember.run(function() {
    records.reload();
  });

  equal(records.get('length'), 3);
  ok(records.get('isLoaded'));
  deepEqual(RESTModel.find(2).toJSON(), {id: 2, name: 'Amos'});

});

test("findQuery RecordArray implements reload", function() {
  expect(4);

  var records, changed;

  Ember.run(function() {
    records = RESTModel.findQuery({name: 'Erik'});
  });

  equal(records.get('length'), 2);

  data.push({id: 3, name: 'Ray'});
  data[1].name = 'Amos';

  Ember.run(function() {
    records.reload();
  });

  equal(records.get('length'), 3);
  ok(records.get('isLoaded'));
  deepEqual(RESTModel.find(2).toJSON(), {id: 2, name: 'Amos'});

});

test("findMany RecordArray implements reload", function() {
  expect(4);

  var records, changed;


  Ember.run(function() {
    records = RESTModel.find([1,2]);
  });

  equal(records.get('length'), 2);

  data[1].name = 'Amos';

  Ember.run(function() {
    records.reload();
  });

  equal(records.get('length'), 2);
  ok(records.get('isLoaded'));
  deepEqual(RESTModel.find(2).toJSON(), {id: 2, name: 'Amos'});

});

test("reload handles record removal", function() {
  expect(4);

  var records, changed;
  data = [
    {id: 1, name: 'Erik'},
    {id: 2, name: 'Aaron'},
    {id: 3, name: 'Ray'}
  ];

  Ember.run(function() {
    records = RESTModel.findAll();
  });

  equal(records.get('length'), 3);

  data.splice(1, 1);

  Ember.run(function() {
    records.reload();
  });

  equal(records.get('length'), 2);
  deepEqual(records.objectAt(0).toJSON(), {id: 1, name: 'Erik'});
  deepEqual(records.objectAt(1).toJSON(), {id: 3, name: 'Ray'});
});

test("RecordArray handles already inserted new models being saved", function() {
  expect(3);

  var records, changed;
  data = [
    {id: 1, name: 'Erik'}
  ];

  Ember.run(function() {
    records = RESTModel.findAll();
  });

  equal(records.get('length'), 1);

  var newModel = RESTModel.create();
  Ember.setOwner(newModel, Ember.getOwner(RESTModel));

  records.pushObject(newModel);

  Ember.run(function() {
    newModel.save();
  });

  equal(records.get('length'), 2);
  equal(records.objectAt(1), newModel);
});
