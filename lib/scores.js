var sqlite3 = require('sqlite3');

// Connect to the database:
var db = new sqlite3.Database('./data/scores.db');

exports.addScore = function (players, time, cb) {
  db.run('insert into sailors values (NULL, ?, ?)',
    [players, time],
    cb);
};

exports.getScores = function (cb) {
  db.all('select * from scores', cb);
};
