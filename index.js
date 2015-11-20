"use strict";

exports.once = function(func) {
  var err, handler, list, result, state;

  state  = 0;
  list   = null;
  err    = undefined;
  result = undefined;

  handler = function(new_err, new_result) {
    var callbacks, i;

    callbacks = list;

    state  = new_err? 0: 2;
    list   = null;
    err    = new_err;
    result = new_result;

    if(callbacks) {
      for(i = 0; i < callbacks.length; i++) {
        callbacks[i](new_err, new_result);
      }
    }
  };

  return function(callback) {
    switch(state) {
      case 0:
        state = 1;
        list  = [callback];

        func(handler);
        break;

      case 1:
        list.push(callback);
        break;

      case 2:
        process.nextTick(function() {
          callback(err, result);
        });
        break;
    }
  };
};

exports.timeBasedWithGrace = function(func, soft, hard) {
  var err, hard_timeout, list, result, soft_timeout, state;

  state        = 0;
  list         = null;
  soft_timeout = NaN;
  hard_timeout = NaN;
  err          = undefined;
  result       = undefined;

  return function(time, callback) {
    var update;

    update = false;

    switch(state) {
      case 0:
        state  = 1;
        list   = [callback];
        update = true;
        break;

      case 1:
        list.push(callback);
        break;

      case 2:
        if(time >= hard_timeout) {
          state  = 1;
          list   = [callback];
          update = true;
        }

        else {
          process.nextTick(function() {
            callback(err, result);
          });

          if(time >= soft_timeout) {
            state  = 3;
            update = true;
          }
        }
        break;

      case 3:
        if(time >= hard_timeout) {
          if(!list) {
            list = [];
          }

          list.push(callback);
        }

        else {
          process.nextTick(function() {
            callback(err, result);
          });
        }
        break;
    }

    if(update) {
      func(function(new_err, new_result) {
        var callbacks, i;

        callbacks = list;

        state        = new_err? (state - 1): 2;
        list         = null;
        soft_timeout = time + soft;
        hard_timeout = time + hard;
        err          = new_err;
        result       = new_result;

        if(callbacks) {
          for(i = 0; i < callbacks.length; i++) {
            callbacks[i](new_err, new_result);
          }
        }
      });
    }
  };
};

exports.sizeBasedKeyValue = function(func, size) {
  if(process.env["NODE_ENV"] !== "test") {
    console.warn(
      "cacheHelpers.sizeBasedKeyValue is DEPRECATED and will be removed"
    );
  }

  var cache     = [],
      callbacks = {};

  size += size;

  return function(key, callback) {
    /* Look up in the cache. */
    var i;

    for(i = 0; i !== cache.length; i += 2) {
      if(cache[i] === key) {
        if(i !== 0) {
          Array.prototype.unshift.apply(cache, cache.splice(i, 2));
        }

        return callback(null, cache[1]);
      }
    }

    /* Somebody else is already polling the backend. Get notified when they're
     * done, and bail. */
    if(callbacks[key]) {
      callbacks[key].push(callback);
      return;
    }

    callbacks[key] = [callback];

    /* Call the backing store. */
    return func(key, function(err, value) {
      /* Successful result? Then add it to the cache. */
      if(!err) {
        if(cache.length === size) {
          cache.length -= 2;
        }

        cache.unshift(key, value);
      }

      /* Notify all the saved callbacks, and then clean up. */
      while(callbacks[key].length) {
        callbacks[key].pop()(err, value);
      }

      delete callbacks[key];
    });
  };
};
