/*
 * TeaBag: routes/admin.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author:  spolu
 *
 * @log:
 * - 2014-02-19 spolu  Creation
 */
"use strict";

var querystring = require('querystring');
var util = require('util');
var http = require('http');
var async = require('async');
var common = require('../../lib/common.js');
var storage = require('../../lib/storage.js').storage({});

/******************************************************************************/
/*                               UTILITY METHODS                              */
/******************************************************************************/
// ### user_create 
//
// Utility method to create a user. It's indempotent and does not override
// existing users.
// ```
// @user_id {number} the user_id to create
// @cb_     {function(err), user}
// ```
exports.user_create = function(user_id, cb_) {
  storage.get(user_id, 'user.json', function(err, json) {
    if(err && err.code === 'ENOENT') {
      async.parallel({
        'user.json': function(cb_) {
          return storage.put(user_id, 'user.json', {}, cb_);
        },
        'tokens.json': function(cb_) {
          return storage.put(user_id, 'tokens.json', [], cb_);
        },
        'table.json': function(cb_) {
          return storage.put(user_id, 'table.json', {}, cb_);
        }
      }, function(err) {
        return cb_(err, {});
      });
    }
    else if(err) {
      return cb_(err);
    }
    else {
      return cb_(null, json);
    }
  });
};

// ### user_tokens_revoke
//
// Utility method to revoke all current tokens for a given user.
// ```
// @user_id {number} the user_id whose tokens should be revoked
// @cb_     {function(err)}
// ```
exports.user_tokens_revoke = function(user_id, cb_) {
  /* TODO(spolu): Revoke all tokens. */
  return cb_();
};

/******************************************************************************/
/*                                   ROUTES                                   */
/******************************************************************************/
//
// ### PUT /admin/user/:user_id/master/:master
//
exports.put_master = function(req, res, next) {
  var user_id = parseInt(req.param('user_id', 10));
  if(!user_id) {
    return res.error(common.err('Invalid `user_id`: ' + req.param('user_id'),
                                'AdminError:InvalidUserId'));
  }

  var master = req.param('master');
  if(!master) {
    return res.error(common.err('Invalid `master`: ' + req.param('master'),
                                'AdminError:InvalidMaster'));
  }

  var user = null;
  async.series([
    function(cb_) {
      exports.user_create(user_id, function(err, json) {
        user = json;
        return cb_(err);
      });
    },
    function(cb_) {
      user.master = master;
      return storage.put(user_id, 'user.json', user, cb_);
    },
    function(cb_) {
      return exports.user_tokens_revoke(user_id, cb_);
    }
  ], function(err) {
    if(err) {
      return res.error(err);
    }
    return res.ok();
  });
};
