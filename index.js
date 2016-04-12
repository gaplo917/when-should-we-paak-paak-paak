const express = require('express');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Memcached = require('memcached');

// The environment variables are automatically set by App Engine when running
// on GAE. When running locally, you should have a local instance of the
// memcached daemon running.
var memcachedAddr = process.env.MEMCACHE_PORT_11211_TCP_ADDR || 'localhost';
var memcachedPort = process.env.MEMCACHE_PORT_11211_TCP_PORT || '11211';
var memcached = new Memcached(memcachedAddr + ':' + memcachedPort);

const PORT = process.env.PORT || 8080

const RESULTS = {
  CREATED:1,
  JOINED: 2,
  ROOM_FULL: 3,
  ROOM_NOT_FOUND: 4,
  ROOM_EXIST:5,
  ALL_DONE: 6,
  PARTNER_READY: 7

}

app.use(express.static('public'));

app.get('/rooms/:roomName/:sex',(req,res) => {

  const roomName = req.params.roomName
  const sex = req.params.sex

  memcached.get(roomName, (err, value) => {
    if (err) { return; }
    console.log("recieve roomName:",roomName)

    if(value) {
      return res.json({
        result: RESULTS.ROOM_EXIST
      })
    } else {

      const token = sex + Math.random().toString(36).substring(5);

      memcached.set(roomName, token, 120, (err) => {
        if (err) { return ;}
        console.log("created Room")
        res.json({
          result: RESULTS.CREATED,
          token: token
        })
      })
    }
  })
})

app.get('/join/:roomName',(req,res) => {

  const roomName = req.params.roomName

  memcached.get(roomName, (err, token) => {
    if (err) { return; }
    console.log("recieve join:",roomName)
    switch (token) {
      case RESULTS.ROOM_FULL :
        console.log("the room is full")
        return res.json({result: RESULTS.ROOM_FULL})

      case undefined :
        console.log("room is not found")
        return res.json({result: RESULTS.ROOM_NOT_FOUND})

      default:

        console.log("join the room")
        memcached.set(roomName, RESULTS.ROOM_FULL, 120, (err) => {
          if (err) { return ;}
          io.emit(`rooms/${token}`, JSON.stringify({result: RESULTS.JOINED}));
          return res.json({result: RESULTS.JOINED, token: token})
        })

    }
  })
})

io.on('connection', (socket) => {

  socket.on('rooms', (jsonStr) => {
    const req = JSON.parse(jsonStr)
    const token = req.token
    const reqSex = req.sex

    memcached.get(token, (err, cachedJsonStr) => {
      if (err) { return ;}
      if(!cachedJsonStr){
        memcached.set(token, jsonStr, 120, (err) => {
          if (err) { return ;}
          io.emit(`rooms/${token}`, JSON.stringify({
            sex: reqSex,
            result: RESULTS.PARTNER_READY
          }));
        })
      } else {
        const cachedJson = JSON.parse(cachedJsonStr)
        if(cachedJson.sex != reqSex) {

         const kv = {
           mMark: reqSex == 'F'? req.m.mark : cachedJson.m.mark,
           mProp: reqSex == 'F'? req.m.prop : cachedJson.m.prop,
           fAge: reqSex == 'M'? req.f.age : cachedJson.f.age,
           fMark: reqSex == 'M'? req.f.mark : cachedJson.f.mark,
           fExp: reqSex == 'M'? req.f.exp : cachedJson.f.exp
         }
          // Calculate the result

          console.log(kv)
          const paakpaakDay = (Math.pow(40 - kv.fAge,2) + Math.pow(kv.fMark,3) * 10) / ((Math.pow(kv.mMark,2) + kv.mProp) * Math.pow(kv.fExp + 1,2))

          io.emit(`rooms/${token}`, JSON.stringify({
            paakpaakDay: paakpaakDay,
            result: RESULTS.ALL_DONE
          }));
        }

      }
    })

  })

})

http.listen(PORT, function(){
  console.log(`listening on *:${PORT}`);
});
