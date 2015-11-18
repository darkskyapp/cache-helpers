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

/* FIXME: why have an inProgress field? just set callbacks to null initially
 * have it be an array only when we're in progress... */
exports.timeBasedWithGrace = function(func, soft, hard) {
  var cache      = undefined,
      softLimit  = 0,
      hardLimit  = 0,
      inProgress = false,
      callbacks  = []

  return function(now, callback) {
    /* If we're before the hardlimit, just call the callback immediately with
     * cached data. Otherwise, if we're after it, we'll have to defer the
     * callback until later on. */
    if(now < hardLimit)
      callback(null, cache)

    else
      callbacks.push(callback)

    /* If there's nothing more to do (because we're before the soft limit or
     * because somebody else is already doing it), check out. */
    if(now < softLimit || inProgress)
      return

    /* Okay, so no we have to update the cache. Mark that we're doing something
     * so that nobody else tries to. */
    inProgress = true

    /* Call the backing function. */
    return func(function(err, data) {
      /* If nothing went wrong, update the cache and timeouts. */
      if(!err) {
        cache     = data
        softLimit = now + soft
        hardLimit = now + hard
      }

      /* Call each of the callbacks that we buffered up. (We just pass `err` to
       * them because if there was no error, it's just going to be null anyway.
       * Vice-versa applies as well.) */
      while(callbacks.length)
        callbacks.pop()(err, data)

      /* Finally, the last thing we do is mark that we're no longer in
       * progress, since we just finished. */
      inProgress = false
    })
  }
}

exports.sizeBasedKeyValue = function(func, size) {
  var cache     = [],
      callbacks = {}

  size += size

  return function(key, callback) {
    /* Look up in the cache. */
    var i

    for(i = 0; i !== cache.length; i += 2)
      if(cache[i] === key) {
        if(i !== 0)
          Array.prototype.unshift.apply(cache, cache.splice(i, 2))

        return callback(null, cache[1])
      }

    /* Somebody else is already polling the backend. Get notified when they're
     * done, and bail. */
    if(callbacks[key]) {
      callbacks[key].push(callback)
      return
    }

    callbacks[key] = [callback]

    /* Call the backing store. */
    return func(key, function(err, value) {
      /* Successful result? Then add it to the cache. */
      if(!err) {
        if(cache.length === size)
          cache.length -= 2

        cache.unshift(key, value)
      }

      /* Notify all the saved callbacks, and then clean up. */
      while(callbacks[key].length)
        callbacks[key].pop()(err, value)

      delete callbacks[key]
    })
  }
}
