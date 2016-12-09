var hasMany = Ember.hasMany;
var attr = Ember.attr;
var get = Ember.get;
var store;
var owner;

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


module("Polymorphic Ember.EmbeddedHasManyArray", {
  setup: function() {
    var ARTICLE_FIXTURE = [{
      id: 1,
      hed: 'Test',
      media: [{
        id: 2,
        filename: 'foo.jpg',
        meta: {
          type: 'photo'
        }
      }, {
        id: 3,
        filename: 'bar.mov',
        meta: {
          type: 'clip'
        }
      }]
    }];

    var Article = Ember.Model.extend({
      type: 'article',
      id: attr(),
      hed: attr(),
      media: hasMany('media', {
        embedded: true,
        polymorphic: true
      })
    });

    Article.primaryKey = 'id';

    var Media = Ember.Model.extend({
      type: 'media',
      id: attr(),
      filename: attr()
    });

    Media.primaryKey = 'id';

    Media.reopenClass({
      polymorphicType: function (record) {
        return get(record, 'meta.type');
      }
    });

    var Photo = Media.extend({
      aspectRatios: attr()
    });

    var Clip = Media.extend({
      duration: attr()
    });
    owner = buildOwner();
    store = Ember.Model.Store.create();
    Ember.setOwner(store, owner);
    Article.adapter = Ember.FixtureAdapter.create({});
    Article.FIXTURES = ARTICLE_FIXTURE;
    owner.register('model:article', Article);
    owner.register('model:media', Media);
    owner.register('model:photo', Photo);
    owner.register('model:clip', Clip);
    owner.register('service:store', Ember.Model.Store);
  }
});

test('models have the right class type', function () {
  expect(5);
  var ArticleModel = store.modelFor('article');
  var PhotoModel = store.modelFor('photo');
  var ClipModel = store.modelFor('clip');
  var article = ArticleModel.create();
  Ember.setOwner(article, owner);
  Ember.run(article, article.load, 1, ArticleModel.FIXTURES[0]);
  equal(Ember.run(article, article.get, 'media.length'), 2, 'Article has two media items');
  
  var media = article.get('media').toArray();
  var photo = media[0];
  var clip = media[1];

  equal(photo.get('filename'), 'foo.jpg', 'Photo filename is correct');
  equal(clip.get('filename'), 'bar.mov', 'Clip filename is correct');

  ok(photo instanceof PhotoModel, 'Instance of first member is Photo');
  ok(clip instanceof ClipModel, 'Instance of second member is Clip');
});

test('models have the right type when adding a new polymorphic item', function () {
  expect(3);
  var ArticleModel = store.modelFor('article');
  var PhotoModel = store.modelFor('photo');
  var photoRecord = Ember.run(store, store.createRecord, 'photo');
  var article = ArticleModel.create();
  Ember.setOwner(article, owner);
  Ember.run(article, article.load, 1, ArticleModel.FIXTURES[0]);
  equal(Ember.run(article, article.get, 'media.length'), 2, 'Article has two media items');

  photoRecord.set('id', 4);
  article.get('media').pushObject(photoRecord);

  equal(Ember.run(article, article.get, 'media.length'), 3, 'Article has two media items');
  var media = article.get('media').toArray();

  ok(media[2] instanceof PhotoModel, 'Instance of Photo');
});

test('models have the right type when creating a new polymorphic item', function () {
  expect(5);
  var ArticleModel = store.modelFor('article');
  var PhotoModel = store.modelFor('photo');
  var ClipModel = store.modelFor('clip');
  var article = ArticleModel.create();
  Ember.setOwner(article, owner);
  Ember.run(article, article.load, 1, ArticleModel.FIXTURES[0]);
  equal(Ember.run(article, article.get, 'media.length'), 2, 'Article has two media items');

  article.get('media').create({
    id: 8,
    filename: 'foo.jpg',
    meta: {
      type: 'photo'
    }
  });

  equal(Ember.run(article, article.get, 'media.length'), 3, 'Article has three media items');
  var media = article.get('media').toArray();

  ok(media[2] instanceof PhotoModel, 'Instance of Photo');

  article.get('media').create({
    id: 5,
    filename: 'vid.mov',
    meta: {
      type: 'clip'
    }
  });

  equal(Ember.run(article, article.get, 'media.length'), 4, 'Article has four media items');
  media = article.get('media').toArray();

  ok(media[3] instanceof ClipModel, 'Instance of Clip');
});
