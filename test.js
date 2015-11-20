"use strict";
var assert, cache;

assert = require("assert");
cache  = require("./");

describe("cache", function() {
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

    it("should only call the callback once if called multiple times " +
       "simultaneously", function(done) {
      var cinc, m;

      cinc = cache.timeBasedWithGrace(inc, 100, 1000);
      m = 0;

      cinc(0, function(err, n) {
        assert.ifError(err);
        assert.strictEqual(n, 0);
        if(++m === 3) {
          done(null);
        }
      });

      cinc(0, function(err, n) {
        assert.ifError(err);
        assert.strictEqual(n, 0);
        if(++m === 3) {
          done(null);
        }
      });

      cinc(0, function(err, n) {
        assert.ifError(err);
        assert.strictEqual(n, 0);
        if(++m === 3) {
          done(null);
        }
      });
    });

    it("should only call the callback once if called multiple times " +
       "simultaneously in soft timeout state", function(done) {
      var cinc;

      cinc = cache.timeBasedWithGrace(inc, 100, 1000);

      cinc(0, function(err, n) {
        var m;

        assert.ifError(err);
        assert.strictEqual(n, 0);

        m = 0;

        cinc(200, function(err, n) {
          assert.ifError(err);
          assert.strictEqual(n, 0);
          if(++m === 3) {
            done(null);
          }
        });

        /* We assume that by the time this gets executed, the background update
         * succeeded... */
        cinc(200, function(err, n) {
          assert.ifError(err);
          assert.strictEqual(n, 1);
          if(++m === 3) {
            done(null);
          }
        });

        cinc(200, function(err, n) {
          assert.ifError(err);
          assert.strictEqual(n, 1);
          if(++m === 3) {
            done(null);
          }
        });
      });
    });

    /* FIXME: Ensure that calling the function a bajillion times causes each
     * callback to get called. */
  });

  describe("sizeBasedKeyValue", function() {
    var inc, n;

    inc = function(key, callback) {
      process.nextTick(function() {
        callback(null, key ^ n++);
      });
    };

    beforeEach(function() {
      n = 0;
    });

    it("should cache for each key, until you fill the space", function(done) {
      var f = cache.sizeBasedKeyValue(inc, 2);

      f(20, function(err, value) {
        assert.ifError(err);
        assert.equal(value, 20);

        f(20, function(err, value) {
          assert.ifError(err);
          assert.equal(value, 20);

          f(40, function(err, value) {
            assert.ifError(err);
            assert.equal(value, 41);

            f(20, function(err, value) {
              assert.ifError(err);
              assert.equal(value, 20);

              f(40, function(err, value) {
                assert.ifError(err);
                assert.equal(value, 41);

                f(30, function(err, value) {
                  assert.ifError(err);
                  assert.equal(value, 28);

                  f(40, function(err, value) {
                    assert.ifError(err);
                    assert.equal(value, 41);

                    f(20, function(err, value) {
                      assert.ifError(err);
                      assert.equal(value, 23);

                      f(40, function(err, value) {
                        assert.ifError(err);
                        assert.equal(value, 41);

                        done(null);
                      });
                    });
                  });
                });
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
