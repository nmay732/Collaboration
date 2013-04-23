var express = require('express');
var routes  = require('./routes');
var http    = require('http');

var app = module.exports = express();

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes
app.get('/', function (req, res) {
    res.redirect('/circle.html');
});

var server = http.createServer(app);

server.listen(3000);
console.log("Express server listening on port %d in %s mode",
            server.address().port, app.settings.env);

// Records the next circle id:
var bid = 0;

// Maintains the list of active client circles:
var circles = {};

var io  = require('socket.io').listen(server);
io.set('log level', 1);

io.sockets.on('connection',
              function (socket) {
                  bid++;

                  // Create circle:
                  var circle = { id : bid,
                                x  : 100,
                                y  : 100 };

                  // Add circle:
                  circles[bid] = circle;

                  // Send back to client
                  socket.set('id', bid, function () {
                      var msg = { you  : circle,
                                  them : circles };
                      socket.emit('circle', msg);
                  });

                  // Send to other clients
                  socket.broadcast.emit('+circle', circle);

                  // Register move events:
                  socket.on('move', function (circle) {
                      var b = circles[circle.id];
                      b.x = circle.x;
                      b.y = circle.y;
                      socket.broadcast.emit('move', circle);
                  });

                  socket.on('disconnect', function () {
                      socket.get('id', function (err, id) {
                          var circle = circles[id];
                          delete circles[id];
                          socket.broadcast.emit('-circle', circle);
                      });
                  });
              });
