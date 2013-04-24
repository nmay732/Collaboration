var express = require('express');
var routes  = require('./routes/routes.js');
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

// Maximum allowed connections to a game
var max_cons = 1;

var io  = require('socket.io').listen(server);
io.set('log level', 1);

io.sockets.on('connection',
              function (socket) {

                  if(bid >= max_cons){ //if there are already the max connections
                        socket.emit('max_reached', max_cons);
                        console.log("max reached");
                        return;
                  }

                  bid++;

                  // Create circle:
                  var circle = { id : bid,
                                x  : 100,
                                y  : 100,
                                color: getColor() };

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

function getColor(){
    var color;
    var same = true;
    while(same){ //while there is a circle with this color active, pick a different color
        color = randomColor();
        var flag = false;
        for(var i=1; i<bid; i++){ //current bid is the object we are currently creating
            if(circles[i].color == color){
                console.log("match found!!!");
                flag = true; //found a match. signal to loop again
            }
        }
        same = flag; //sync flag and while condition
    }
    return color;
}

function randomColor(){
    // choose which colors will not be expressed by assigning them zero
    var r = 1;
    var g = 1;
    var b = 1;

    //make sure at least one value is zero (ensures stronger colors)
    while (r!=0 && g!=0 && b!=0){
        var r = Math.floor(2*Math.random());
        var g = Math.floor(2*Math.random());
        var b = Math.floor(2*Math.random());
    }

    //assign expressed colors values (limiting to 200 avoids painfully bright colors)
    //limits to 1 of 90 visually distinct colors
    r *= Math.floor(5*Math.random())*40;
    g *= Math.floor(5*Math.random())*40;
    b *= Math.floor(5*Math.random())*40;
    var hue = 'rgb(' + r + ',' + g + ',' + b + ')';
    return hue;
}
