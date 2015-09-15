var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var bcrypt = require('bcrypt-nodejs');


var app = express();

//login session
app.use(cookieParser());
app.use(session({ secret: 'fucking secrets!', cookie: { maxAge: 60000 }}))



app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/logout', function(req, res){
    req.session.destroy(function(){
        res.redirect('/');
    });
});

app.get('*', util.restrict);

app.get('/',
function(req, res) {
  res.render('index');
});

app.get('/create',
function(req, res) {
  res.render('index');
});

app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', 
function(req, res) {
  // console.log("post to links");
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.status(404).end();
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.status(404).end();
        }

        Links.create({
          url: uri,
          title: title,
          base_url: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.post('/signup', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  // var salt = bcrypt.genSaltSync();
  // var hash = bcrypt.hashSync(password.concat(salt));

  new User({'username': username,
    'password': password
  })
  .save().then(function(){
    req.session.regenerate(function() {
      req.session.user = username;
      res.redirect('/');
    })
  });
});

app.post('/login', function(req, res){
  var username = req.body.username;
  var password = req.body.password;

  db.knex('users').where('username', '=', username).then(function(results){
    if(results.length > 0){
      var hash = results[0].hash;
      var salt = results[0].salt;

      if(bcrypt.compareSync(password, hash)){
        req.session.regenerate(function() {
          req.session.user = username;
          res.redirect('/');
        });
      } else { 
        res.redirect('/login');
      }
    
    } else { 
      res.redirect('/login');
    }

  })

})



// [ { id: 6,
//     username: 'me',
//     hash: '$2a$10$9F8F1MZf9J3B32HowWRkhemVqOnInAtlvDgR3wn/Jmf1hE676BXUi',
//     salt: '$2a$10$k8w1FVj5IIn.2wilWjJE1u' } ]


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits')+1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
