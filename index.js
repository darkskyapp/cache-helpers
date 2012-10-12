exports.once = function(func) {
  var cache     = undefined,
      callbacks = null

  return function(callback) {
    if(cache !== undefined)
      return callback(null, cache)

    if(callbacks) {
      callbacks.push(callback)
      return
    }

    callbacks = [callback]

    return func(function(err, data) {
      if(!err)
        cache = data

      while(callbacks.length)
        callbacks.pop()(err, data)

      callbacks = null
    })
  }
}

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
