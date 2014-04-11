/*
var tb2 = require('../index.js').teabag({
  server: 'http://localhost:3999/user/1/',
  token: '1395793349727_1398385340468_96ddae0077f6a49f7978a3eb90a46f25afa20978'
});
tb2.init(function(err) {
  tb2.register('test', function(oplog) {
    return 'foo ' + oplog.length;
  });

  console.log(tb2.channels());

  tb1.get('test', 'test', '/foo/bar', function(err, value) {
    if(err) {
      common.fatal(err);
    }
    console.log(value);
  });
});
*/

var tb1 = require('../index.js').teabag({
  table_url: 'http://localhost:3999/user/1/',
  session_token: '1396113458843_1403889455037_40c3aaccae61e210ae51a1921023dfdd9a8d2491'
});
var common = require('../../lib/common.js');

tb1.init(function(err) {
  if(err) {
    console.log(err);
    process.exit(1);
  }

  tb1.register('test', function(oplog) {
    var val = oplog[0].value || 0;
    val += (oplog.length - 1);
    return val;
  });

  console.log(tb1.channels());

  console.log('GET:');
  tb1.get('test', 'test', '/foo/bar', function(err, value) {
    if(err) {
      common.fatal(err);
    }
    console.log(value);
    console.log('PUSH:');
    tb1.push('test', 'test', '/foo/bar', { foo: 'bar' }, function(err, value) {
      if(err) {
        common.fatal(err);
      }
      console.log('GET:');
      tb1.get('test', 'test', '/foo/bar', function(err, value) {
        if(err) {
          common.fatal(err);
        }
        console.log(value);
      });
    });
  });
});

