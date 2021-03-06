/* globals describe, before, after, it, beforeEach */

const assert = require('assert')
const mockery = require('mockery')
const crypto = require('crypto')
const fs = require('fs')

function clearData (done) {
  memblob.data = {'existing.tgz': 'asdf'}
  done()
}

function stubUpdate () {
  verify.verify = cacheVerify
  verify.update = (info, callback) => {
    info.updateCalled = true
    callback(null, info)
  }
}

var verify
var cacheVerify
var thisFileHash
var memblob = require('abstract-blob-store')()

describe('verify', () => {
  before((done) => {
    mockery.registerMock('./ibs', memblob)

    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    })
    verify = require('../../src/npm-pipe-ipfs/verify')
    cacheVerify = verify.verify
    done()
  })
  after((done) => {
    mockery.deregisterAll()
    mockery.disable()
    done()
  })

  it('should export an object with methods', (done) => {
    assert.equal(typeof verify, 'object')
    ;['verify', 'update', 'report', 'counter'].forEach((name) => {
      assert.equal(typeof verify[name], 'function')
    })
    done()
  })

  describe('verify method', () => {
    before(function (done) {
      stubUpdate()
      const shasum = crypto.createHash('sha1')
      shasum.setEncoding('hex')
      fs.createReadStream(__filename)
        .on('end', function () {
          shasum.end()
          thisFileHash = shasum.read()
          done()
        })
        .pipe(shasum)
    })
    beforeEach(clearData)

    it("checks hash and does't call update", (done) => {
      const info = {
        path: '/the/path/1',
        tarball: 'existing.tgz',
        shasum: '3da541559918a808c2402bba5012f6c60b27661c'
      }
      verify.verify(info, (err, d) => {
        assert.ifError(err)
        assert(!d.updateCalled)
        done()
      })
    })

    it('with non-existent tarball, update was called', (done) => {
      const info = {
        path: '/the/path/2',
        tarball: 'notarealfile.tgz',
        shasum: thisFileHash
      }
      verify.verify(info, (err, d) => {
        assert.ifError(err)
        assert(d.updateCalled)
        done()
      })
    })
  })
})
