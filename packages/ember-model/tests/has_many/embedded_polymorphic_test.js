var hasMany = Ember.hasMany;
var attr = Ember.attr;
var get = Ember.get;
var store;
var owner;

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

test('models have the right class type', function (assert) {
  expect(5);
  var ArticleModel = store.modelFor('article');
  var PhotoModel = store.modelFor('photo');
  var ClipModel = store.modelFor('clip');
  var article = ArticleModel.create();
  Ember.setOwner(article, owner);
  Ember.run(article, article.load, 1, ArticleModel.FIXTURES[0]);
  assert.equal(Ember.run(article, article.get, 'media.length'), 2, 'Article has two media items');
  
  var media = article.get('media').toArray();
  var photo = media[0];
  var clip = media[1];

  assert.equal(photo.get('filename'), 'foo.jpg', 'Photo filename is correct');
  assert.equal(clip.get('filename'), 'bar.mov', 'Clip filename is correct');

  assert.ok(photo instanceof PhotoModel, 'Instance of first member is Photo');
  assert.ok(clip instanceof ClipModel, 'Instance of second member is Clip');
});

test('models have the right type when adding a new polymorphic item', function (assert) {
  expect(3);
  var ArticleModel = store.modelFor('article');
  var PhotoModel = store.modelFor('photo');
  var photoRecord = Ember.run(store, store.createRecord, 'photo');
  var article = ArticleModel.create();
  Ember.setOwner(article, owner);
  Ember.run(article, article.load, 1, ArticleModel.FIXTURES[0]);
  assert.equal(Ember.run(article, article.get, 'media.length'), 2, 'Article has two media items');

  photoRecord.set('id', 4);
  article.get('media').pushObject(photoRecord);

  assert.equal(Ember.run(article, article.get, 'media.length'), 3, 'Article has two media items');
  var media = article.get('media').toArray();

  assert.ok(media[2] instanceof PhotoModel, 'Instance of Photo');
});

test('models have the right type when creating a new polymorphic item', function (assert) {
  expect(5);
  var ArticleModel = store.modelFor('article');
  var PhotoModel = store.modelFor('photo');
  var ClipModel = store.modelFor('clip');
  var article = ArticleModel.create();
  Ember.setOwner(article, owner);
  Ember.run(article, article.load, 1, ArticleModel.FIXTURES[0]);
  assert.equal(Ember.run(article, article.get, 'media.length'), 2, 'Article has two media items');

  article.get('media').create({
    id: 8,
    filename: 'foo.jpg',
    meta: {
      type: 'photo'
    }
  });

  assert.equal(Ember.run(article, article.get, 'media.length'), 3, 'Article has three media items');
  var media = article.get('media').toArray();

  assert.ok(media[2] instanceof PhotoModel, 'Instance of Photo');

  article.get('media').create({
    id: 5,
    filename: 'vid.mov',
    meta: {
      type: 'clip'
    }
  });

  assert.equal(Ember.run(article, article.get, 'media.length'), 4, 'Article has four media items');
  media = article.get('media').toArray();

  assert.ok(media[3] instanceof ClipModel, 'Instance of Clip');
});

test('models fail assertion when there is no polymorphicType implementation', function (assert) {
  expect(1);
  var MediaModel = store.modelFor('media');
  MediaModel.reopenClass({
    polymorphicType: null
  });
  var ArticleModel = store.modelFor('article');
  var article = ArticleModel.create();
  Ember.setOwner(article, owner);
  Ember.run(article, article.load, 1, ArticleModel.FIXTURES[0]);
  assert.throws(function () {
    Ember.run(article, article.get, 'media.firstObject');
  }, 'assertion error thrown');
});

test('models fail assertion when creating a new item with no polymorphicType implementation', function (assert) {
  expect(1);
  var MediaModel = store.modelFor('media');
  MediaModel.reopenClass({
    polymorphicType: null
  });
  var ArticleModel = store.modelFor('article');
  var article = ArticleModel.create();
  Ember.setOwner(article, owner);
  Ember.run(article, article.load, 1, ArticleModel.FIXTURES[0]);
  assert.throws(function () {
    article.get('media').create({
      id: 8,
      filename: 'foo.jpg',
      meta: {
        type: 'photo'
      }
    });
  }, 'assertion error thrown');
});
