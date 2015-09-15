var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',
  initialize: function() {    
    this.on('creating', function(model, attrs, options) {
      var salt = bcrypt.genSaltSync();
      var hash = bcrypt.hashSync(model.get('password'), salt);
      model.unset('password');
      model.set('hash', hash);
      model.set('salt', salt);
    });
  }
});

module.exports = User;