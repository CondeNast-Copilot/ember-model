require('ember-model/computed');
var get = Ember.get,
    set = Ember.set;

function storeFor(record) {
  var owner = Ember.getOwner(record);
  if (owner) {
    return owner.lookup('service:store');
  }

  return null;
}

function getType(record, type) {

  if (typeof this.type === "string" && this.type) {
    type = Ember.get(Ember.lookup, this.type);

    if (!type) {
      var store = storeFor(record);
      type = store.modelFor(this.type);
      type.reopenClass({ adapter: store.adapterFor(this.type) });
    }
  }

  return type;
}

Ember.belongsTo = function(type, options) {
  options = options || {};

  var meta = { type: type, isRelationship: true, options: options, kind: 'belongsTo', getType: getType};

  return Ember.computed("_data", {
    get: function(propertyKey){
      var innerType = meta.getType(this, type);
      Ember.assert("Type cannot be empty.", !Ember.isEmpty(innerType));

      var key = options.key || propertyKey,
          self = this;

      var dirtyChanged = function(sender) {
        if (sender.get('isDirty')) {
          self._relationshipBecameDirty(propertyKey);
        } else {
          self._relationshipBecameClean(propertyKey);
        }
      };

      var store = storeFor(this),
          value = this.getBelongsTo(key, innerType, meta, store);
      this._registerBelongsTo(meta);
      if (value !== null && meta.options.embedded) {
        value.get('isDirty'); // getter must be called before adding observer
        value.addObserver('isDirty', dirtyChanged);
      }
      return value;
    },

    set: function(propertyKey, value, oldValue){
      var innerType = meta.getType(this, type);
      Ember.assert("Type cannot be empty.", !Ember.isEmpty(innerType));

      var dirtyAttributes = get(this, '_dirtyAttributes'),
          createdDirtyAttributes = false,
          self = this;

      var dirtyChanged = function(sender) {
        if (sender.get('isDirty')) {
          self._relationshipBecameDirty(propertyKey);
        } else {
          self._relationshipBecameClean(propertyKey);
        }
      };

      if (!dirtyAttributes) {
        dirtyAttributes = [];
        createdDirtyAttributes = true;
      }

      if (value) {
        Ember.assert(`Attempted to set property of type: ${value.constructor} with a value of type: ${innerType}`,
                    value instanceof innerType);
      }

      if (oldValue !== value) {
        dirtyAttributes.pushObject(propertyKey);
      } else {
        dirtyAttributes.removeObject(propertyKey);
      }

      if (createdDirtyAttributes) {
        set(this, '_dirtyAttributes', dirtyAttributes);
      }

      if (meta.options.embedded) {
        if (oldValue) {
          oldValue.removeObserver('isDirty', dirtyChanged);
        }
        if (value) {
          value.addObserver('isDirty', dirtyChanged);
        }
      }

      return value === undefined ? null : value;
    }
  }).meta(meta);
};

Ember.Model.reopen({
  getBelongsTo: function(key, type, meta, store) {
    var idOrAttrs = get(this, '_data.' + key),
        record;

    if (Ember.isNone(idOrAttrs)) {
      return null;
    }

    if (meta.options.polymorphic) {
      Ember.assert('The class ' + type.toString() + ' is missing the polymorphicType implementation.', type.polymorphicType);
      var typeName = type.polymorphicType(idOrAttrs);
      type = store.modelFactoryFor(typeName);
    }

    if (meta.options.embedded) {
      var primaryKey = get(type, 'primaryKey'),
        id = idOrAttrs[primaryKey];
      var owner = Ember.getOwner(this);
      record = type.create({ isLoaded: false, id: id });
      Ember.setOwner(record, owner);

      record.load(id, idOrAttrs);
    } else {
      if (store) {
        record = store._findSync(meta.type, idOrAttrs);
      } else {
        record = type.find(idOrAttrs);
      }
    }

    return record;
  }
});
