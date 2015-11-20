cache-helpers
=============

`cache-helpers` is a Node.JS module containing several generic caching
functions. It was written as a way of abstracting out a number of commonly used
patterns in the [Dark Sky API](http://developer.darkskyapp.com/).

*   `cacheHelpers.once`: Takes a (presumably expensive) function which takes a
    single callback and calls it with an optional error argument and a data
    argument. It returns a function that you may use as a proxy for the passed
    function. The first time it is called, it will call the function and cache
    its data. Subsequent calls will return the cached data.

    (It is smart enough to only call the backing function once even if it is
    called many times simultaneously.)

*   `cacheHelpers.timeBasedWithGrace`: Takes a (presumably expensive) function,
    like `once`, above, and two numbers: a soft cache timeout and a hard cache
    timeout. These timeouts may be in any arbitrary units you prefer, though
    either seconds or milliseconds is most convenient. Like `once`, it returns
    a proxy function, which is called with the current time (in whatever units
    you specified for the timeouts), and a callback which is called when the
    data is available.

    The first time this function is called, it will call the callback once the
    backing function returns. Subsequent calls do different things depending on
    how much time has elapsed since the data was cached: if the soft timeout
    has not elapsed, then the cached data is returned immediately. If the soft
    timeout has elapsed but the hard timeout has not, the cached data is
    returned immediately, but the backing function is called in the background
    to update the cache, so as not to impede whatever processing you want to
    do. Finally, if the hard timeout has elapsed, the cache is updated before
    calling the callback.

    You may think of these two limits as "the time until data is out of date"
    and "the time until data is unnacceptably out of date".

    (Like `once`, this function is smart enough to not call the backing
    function more often than necessary.)

These are kind of advanced, and may be fairly hard to understand without a
concrete use case. Checking out the tests may help.


License
-------

To the extent possible by law, The Dark Sky Company, LLC has [waived all
copyright and related or neighboring rights][cc0] to this library.

[cc0]: http://creativecommons.org/publicdomain/zero/1.0/
