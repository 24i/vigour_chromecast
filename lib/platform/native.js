'use strict'

var config = require('../config')
var pkg = require('../../package.json')

exports._platform = {
  inject: require('vigour-wrapper-bridge/lib/plugin/injection')(pkg.name),
  label: 'native',
  on: {
    init: {
      chromecast (done) {
        this.send('init', {appId: config.appId.val}, () => {
          this.parent.set({
            val: true,
            ready: true
          })
          if (done) {
            done()
          }
        })
      }
    },
    connect: {
      chromecast (obj) {
        console.log('[native] on connect')
        var plugin = this.parent
        var device = obj.data
        var deviceid = device.id || plugin.devices.each(function (property) {
          return property.id
        })
        if (deviceid) {
          console.log('[native] SEND deviceid', deviceid.val)
          this.send('startCasting', { deviceId: deviceid.val }, (err, res) => {
            console.log('[native] CALLBACK', err, res)
            if (!err) {
              plugin.session.id.val = res.sessionId
              obj.done()
            } else {
              obj.done(true)
            }
          })
        } else {
          this.emit('error', 'Chromecast: No deviceid specified or found')
        }
      }
    },
    disconnect: {
      chromecast (data) {
        console.log('[native] disconnect > send stopCasting')
        var platform = this
        this.send('stopCasting', {}, function (err, res) {
          if (err) console.log('ops', err)
          console.log('[native] stopCasting callback', arguments)
          platform.emit('stoppedCasting')
        })
      }
    },
    stoppedCasting: {
      condition (data, done, event) {
        var session = this.parent.session
        session._block = true
        session.set({
          val: 0,
          id: 0
        }, event.inherits)
        session._block = false
        done()
      }
    },
    deviceJoined: {
      chromecast (device) {
        console.log('[native] deviceJoined!', device)
        var plugin = this.parent
        plugin.set({
          available: plugin.available.val + 1,
          devices: {
            [device.id]: {
              id: device.id,
              name: device.name
            }
          }
        })
      }
    },
    deviceLeft: {
      chromecast (device) {
        console.log('[native] deviceLeft!', device)
        var plugin = this.parent
        var hasDevice = plugin.devices[device.id]
        if (hasDevice) {
          console.log('found device > stop session and remove!')
          plugin.available.val -= 1
          if (plugin.session.val === hasDevice) {
            let session = plugin.session
            session._block = true
            session.set({
              val: 0,
              id: 0
            })
            session._block = false
          }
          hasDevice.remove()
        } else {
          console.warn('a device that left was not in devices')
        }
      }
    }
  }
}
