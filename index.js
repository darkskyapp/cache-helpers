"use strict";

exports.once = function(func) {
  var f, handler;

  handler = function(callback) {
    var list;

    list = [callback];

    f = function(callback) {
      list.push(callback);
    };

    func(function(err, result) {
      var i;

      f = err?
            handler:
            function(callback) {
              process.nextTick(function() {
                callback(err, result);
              });
            };

      for(i = 0; i < list.length; i++) {
        list[i](err, result);
      }
    });
  };

  f = handler;

  return function(callback) {
    f(callback);
  };
};

exports.timeBasedWithGrace = function(func, soft, hard) {
  var f, handler;

  /* "Hard" handler. */
  handler = function(time, callback) {
    var list;

    list = [callback];

    f = function(time, callback) {
      list.push(callback);
    };

    func(function(err, result) {
      var hard_time, i, sandler, soft_time;

      if(err) {
        f = handler;
      }

      else {
        soft_time = time + soft;
        hard_time = time + hard;

        sandler = function(time, callback) {
          var list;

          if(time >= hard_time) {
            handler(time, callback);
          }

          else {
            process.nextTick(function() {
              callback(err, result);
            });

            if(time >= soft_time) {
              list = null;

              f = function(time, callback) {
                if(time >= hard_time) {
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
              };

              func(function(new_err, new_result) {
                var i;

                if(!new_err) {
                  err       = new_err;
                  result    = new_result;
                  soft_time = time + soft;
                  hard_time = time + hard;
                }

                f = sandler;

                if(list) {
                  for(i = 0; i < list.length; i++) {
                    list[i](err, result);
                  }
                }
              });
            }
          }
        };

        f = sandler;
      }

      for(i = 0; i < list.length; i++) {
        list[i](err, result);
      }
    });
  };

  f = handler;

  return function(time, callback) {
    f(time, callback);
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
