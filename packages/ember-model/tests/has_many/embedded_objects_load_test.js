var attr = Ember.attr;

module("Ember.EmbeddedHasManyArray - embedded objects loading");

test("derp", function() {
  var json = {
    id: 1,
    title: 'foo',
    comments: [
      {id: 1, text: 'uno'},
      {id: 2, text: 'dos'},
      // ensure that records without an id work correctly
      {text: 'tres'}
    ]
  };

  var Comment = Ember.Model.extend({
    text: attr()
  });

  var Article = Ember.Model.extend({
    title: attr(),

    comments: Ember.hasMany(Comment, { key: 'comments', embedded: true })
  });

  var owner = buildOwner();
  Ember.setOwner(Comment, owner);
  Ember.setOwner(Article, owner);

  var article = Article.create(owner.ownerInjection());
  Ember.run(article, article.load, json.id, json);

  var comments = article.get('comments');

  equal(comments.get('length'), 3);
  ok(Ember.run(comments, comments.get, 'firstObject') instanceof Comment);
  deepEqual(Ember.run(comments, comments.mapBy, 'text'), ['uno', 'dos', 'tres']);
  ok(!comments.isEvery('isNew'), "Records should not be new");
});

test("can load content with cyclical relationships", function() {
  var articleOneFixture = {
    id: 1,
    hed : 'Article one fixture'
  };

  var articleTwoFixture = {
    id: 2,
    hed : 'Article two fixture'
  };

  var Article = Ember.Model.extend({
    id: attr(),
    hed: attr(),
    relatedItems: Ember.hasMany('article', { embedded: true })
  });

  var owner = buildOwner();
  Ember.setOwner(Article, owner);
  owner.register('model:article', Article);
  owner.register('service:store', Ember.Model.Store);

  var articleOne = Article.create(owner.ownerInjection());
  var articleTwo = Article.create(owner.ownerInjection());
  articleOne.load(articleOneFixture.id, articleOneFixture);
  articleTwo.load(articleTwoFixture.id, articleTwoFixture);

  //relate article one and article two to each other to form a loop
  articleOne.relatedItems.pushObject(articleTwo);
  articleTwo.relatedItems.pushObject(articleOne);

  var articleOneJSON = articleOne.toJSON();

  ok(articleOneJSON);
  equal(articleOneJSON.hed, 'Article one fixture');
  equal(articleOneJSON.relatedItems.length, 1);

  var articleTwoRel = articleOneJSON.relatedItems[0];
  equal(articleTwoRel.hed, 'Article two fixture');
  equal(articleTwoRel.relatedItems.length, 1);
});

test("loading embedded data into a parent updates the child records", function() {
  expect(2);

  var json = {
    id: 1,
    comments: [
      {id: 1, body: 'new'}
    ]
  };

  var Comment = Ember.Model.extend({
    id: attr(),
    body: attr()
  });

  Comment.adapter = {
    find: function(record, id) {
      record.load(id, {body: 'old'});
    }
  };

  var Post = Ember.Model.extend({
    id: attr(),
    comments: Ember.hasMany('comment', {key: 'comments', embedded: true})
  });

  var owner = buildOwner();
  Ember.setOwner(Comment, owner);
  Ember.setOwner(Post, owner);
  owner.register('model:comment', Comment);
  owner.register('model:post', Post);
  owner.register('service:store', Ember.Model.Store);

  Post.adapter = {
    find: function(record, id) {
      record.load(id, {comments: []});
    }
  };

  var comment = Comment.find(1);
  equal(comment.get('body'), 'old');

  var post = Post.find(1);
  post.load(1, json);

  equal(comment.get('body'), 'new');
});

test("loading embedded data into a parent with deleted children deletes the children", function() {
  expect(1);

  var Comment = Ember.Model.extend({
    id: attr(),
    body: attr()
  });

  var Post = Ember.Model.extend({
    id: attr(),
    comments: Ember.hasMany('comment', {key: 'comments', embedded: true})
  });

  var owner = buildOwner();
  Ember.setOwner(Comment, owner);
  Ember.setOwner(Post, owner);
  owner.register('model:comment', Comment);
  owner.register('model:post', Post);
  owner.register('service:store', Ember.Model.Store);

  Post.adapter = {
    find: function(record, id) {
      record.load(id, {comments: []});
    }
  };

  var post = Post.find(1);
  var comment = Comment.create();
  post.get('comments').pushObject(comment);

  var json = {
    id: 1,
    comments: [
      {id: 1, body: 'new'}
    ]
  };

  // deletes all children and load new ones.
  post.get('comments').forEach(function(comment) {
    comment.didDeleteRecord();
  });
  post.load(1, json);

  equal(post.get('comments.length'), 1);
 // equal(post.get('comments.firstObject.body'), 'new');
});
