/**
 * TeaBag: channel.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-03-05 spolu   Creation (on a plane!)
 */
"use strict";

var util = require('util');
var events = require('events');
var fs = require('fs');
var http = require('http');
var https = require('https');
var async = require('async');
var common = require('../../lib/common.js');

// ## store
//
// Teabag Client Channel Object
//
// The store object interfaces the teabag client with the stores associated
// with the different channels it uses. The store object shows the actual state
// of the store and may not reflect the last known state for a given channel.
// (eg. no connection)
//
// The store object starts by connecting to the oplog stream of the store it is
// in charge of. Oplog events are filtered to the (type, path) tuples it
// already interacted with. It uses long-polling
//
// ```
// @spec { id, json, token, registry }
// ```
var store = function(spec, my) {
  my = my || {};
  spec = spec || {};
  var _super = {};        


  my.id = spec.id;
  my.json = spec.json || {};
  my.token = spec.token;
  my.registry = spec.registry;

  my.tuples = {};

  //
  // _public_
  // 
  var init;      /* init(cb_()); */
  var get;       /* get(type, path, cb_); */

  //
  // #### _private_ 
  //
  var long_poll; /* long_poll(); */
  
  //
  // #### _that_
  //
  var that = {};  

  /****************************************************************************/
  /* PRIVATE HELPERS */
  /****************************************************************************/
  // ### long_poll
  //
  // Runs the long polling on the store oplog stream endpoint. The long polling
  // is resilient to network errors
  long_poll = function() {
    var handle_error = function(err) {
      common.log.error(err);
      my.lp_itv = setTimeout(long_poll, 1000);
    }

    var stream_url = my.store_url + 'oplog/stream' + 
      '?token=' + my.token;

    my.lp_req = (my.json.secure ? https : http).get(stream_url, 
                                                    function(res) {
      res.setEncoding('utf8');
      var body = '';
      res.on('data', function(chunk) {
        body += chunk;
      });
      res.on('end', function() {
        my.lp_req = null;
        try {
          var stream = JSON.parse(body);
          if(stream && !stream.error) {
            /* TODO(spolu): handle stream data. */
            return long_poll();
          }
          else {
            var err = common.err('Store Stream Error: ' + my.strem_url,
                                 'StoreError:StreamError');
            if(stream && stream.error) {
              err = common.err(json.error.message,
                               json.error.name);
            }
            throw err;
          }
        }
        catch(err) {
          return handle_error(err);
        }
      });
    }).on('error', handle_error);
  };
  
  /****************************************************************************/
  /* PUBLIC METHODS */
  /****************************************************************************/
  // ### get
  //
  // Retrieves a value from the store and starts keeping the associated oplog
  // updated for that tuple (type, path)
  // ```
  // @type {string} the data type
  // @path {string} the path to retrieve
  // @cb_  {function(err, value)} callback
  // ```
  get = function(type, path, cb_) {
    if(!my.registry[type]) {
      return cb_(common.err('Type not registered: ' + type,
                            'StoreError:TypeNotRegistered'));
    }
    if(my.tuples[type] && my.tuples[type][path]) {
      return cb_(null, my.tuples[type][path].value);
    }
    else {
      var oplog_url = my.store_url + 'oplog' +
        '?type=' + type + '&path=' + escape(path) + '&token=' + my.token;

      (my.json.secure ? https : http).get(oplog_url, 
                                          function(res) {
        res.setEncoding('utf8');
        var body = '';
        res.on('data', function(chunk) {
          body += chunk;
        });
        res.on('end', function() {
          try {
            var oplog = JSON.parse(body);
            my.tuples[type] = my.typles[type] || {};
            my.tuples[type][path] = {
              oplog: oplog,
              value: my.registry[type](oplog)
            };
            return cb_(null, my.tuples[type][path].value);
          }
          catch(err) {
            return cb_(err);
          }
        });
      }).on('error', cb_);
    }
  };

  // ### init
  //
  // Inits the channel by connecting to its oplog stream. This is a long-polling
  // connection resilient to deconnexions and errors.
  // ```
  // @cb_ {function(err)}
  // ```
  init = function(cb_) {
    var url_p = require('url').parse(my.json.url || '');
    if((url_p.protocol !== 'http:' && url_p.protocol !== 'https:') ||
       url_p.query || url_p.search || 
       !url_p.path || url_p.path[url_p.path.length - 1] !== '/') {
      return cb_(common.err('Invalid store URL: ' + my.json.url,
                            'StoreError:InvalidUrl'));
    }

    my.store_url = url_p.href;
    long_poll();

    common.log.out('STORE [' + my.id + '] Initialization');
    return cb_();
  };

  common.method(that, 'init', init, _super);

  return that;
};

exports.store = store;
