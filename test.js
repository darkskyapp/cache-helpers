var assert = require("chai").assert,
    cache  = require("./")

describe("cache", function() {
  var n

  function inc(callback) {
    return callback(null, n++)
  }

  beforeEach(function() {
    n = 0
  })

  describe("once", function() {
    it("should only call the backing cache function once", function() {
      var cinc = cache.once(inc)

      cinc(function(err, n) {
        assert.equal(n, 0)
      })

      cinc(function(err, n) {
        assert.equal(n, 0)
      })

      cinc(function(err, n) {
        assert.equal(n, 0)
      })
    })
  })

  describe("timeBasedWithGrace", function() {
    it("should only update the cache as appropriate", function() {
      var cinc = cache.timeBasedWithGrace(inc, 100, 1000)

      /* First datapoint. */
      cinc(0, function(err, n) {
        assert.deepEqual(n, 0)
      })

      /* Read cached. */
      cinc(50, function(err, n) {
        assert.deepEqual(n, 0)
      })

      /* Soft timeout: return cached but update in the background. */
      cinc(200, function(err, n) {
        assert.deepEqual(n, 0)
      })

      /* Read cached. */
      cinc(250, function(err, n) {
        assert.deepEqual(n, 1)
      })

      /* Hard timeout: update n before returning. */
      cinc(2500, function(err, n) {
        assert.deepEqual(n, 2)
      })
    })

    /* FIXME: Ensure that calling the function a bajillion times causes each
     * callback to get called. */
  })
})
