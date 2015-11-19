"use strict";
var assert, cache;

assert = require("assert");
cache  = require("./");

describe("cache", function() {
  describe("time-based", function() {
    var inc, n;

    inc = function(callback) {
      process.nextTick(function() {
        callback(null, n++);
      });
    };

    beforeEach(function() {
      n = 0;
    });

    describe("once", function() {
      it("should only call the backing cache function once", function(done) {
        var cinc = cache.once(inc);

        cinc(function(err, n) {
          assert.ifError(err);
          assert.equal(n, 0);
          cinc(function(err, n) {
            assert.ifError(err);
            assert.equal(n, 0);
            cinc(function(err, n) {
              assert.ifError(err);
              assert.equal(n, 0);
              done(null);
            });
          });
        });
      });

      it("should call the backing cache function once even if simultaneous " +
         "calls are made", function(done) {
        var cinc = cache.once(inc),
            m = 0;

        cinc(function(err, n) {
          assert.ifError(err);
          assert.equal(n, 0);
          if(++m === 3) {
            done(null);
          }
        });

        cinc(function(err, n) {
          assert.ifError(err);
          assert.equal(n, 0);
          if(++m === 3) {
            done(null);
          }
        });

        cinc(function(err, n) {
          assert.ifError(err);
          assert.equal(n, 0);
          if(++m === 3) {
            done(null);
          }
        });
      });
    });

    describe("timeBasedWithGrace", function() {
      it("should only update the cache as appropriate", function(done) {
        var cinc = cache.timeBasedWithGrace(inc, 100, 1000);

        /* First datapoint. */
        cinc(0, function(err, n) {
          assert.ifError(err);
          assert.deepEqual(n, 0);

          /* Read cached. */
          cinc(50, function(err, n) {
            assert.ifError(err);
            assert.deepEqual(n, 0);

            /* Soft timeout: return cached but update in the background. */
            cinc(200, function(err, n) {
              assert.ifError(err);
              assert.deepEqual(n, 0);

              /* Read cached. */
              cinc(210, function(err, n) {
                assert.ifError(err);
                assert.deepEqual(n, 1);

                /* Hard timeout: update n before returning. */
                cinc(2500, function(err, n) {
                  assert.ifError(err);
                  assert.deepEqual(n, 2);

                  done(null);
                });
              });
            });
          });
        });
      });

      /* FIXME: Ensure that calling the function a bajillion times causes each
       * callback to get called. */
    });
  });

  describe("key-value", function() {
    var n

    function inc(key, callback) {
      return callback(null, key ^ n++)
    }

    beforeEach(function() {
      n = 0
    })

    describe("sizeBasedKeyValue", function() {
      it("should cache for each key, until you fill the space", function() {
        var f = cache.sizeBasedKeyValue(inc, 2)

        f(20, function(err, value) {
          assert.equal(value, 20)
        })

        f(20, function(err, value) {
          assert.equal(value, 20)
        })

        f(40, function(err, value) {
          assert.equal(value, 41)
        })

        f(20, function(err, value) {
          assert.equal(value, 20)
        })

        f(40, function(err, value) {
          assert.equal(value, 41)
        })

        f(30, function(err, value) {
          assert.equal(value, 28)
        })

        f(40, function(err, value) {
          assert.equal(value, 41)
        })

        f(20, function(err, value) {
          assert.equal(value, 23)
        })

        f(40, function(err, value) {
          assert.equal(value, 41)
        })
      })

      /* FIXME: Ensure that calling the function a bajillion times causes each
       * callback to get called. */
    })
  })
})
