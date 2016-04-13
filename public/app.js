'use strict';

var USER_STATE = {
  INIT: 0,
  WAITING: 1,
  PLAYING: 2
};

var RESULTS = {
  CREATED: 1,
  JOINED: 2,
  ROOM_FULL: 3,
  ROOM_NOT_FOUND: 4,
  ROOM_EXIST: 5,
  ALL_DONE: 6,
  PARTNER_READY: 7
};

var user = {
  state: USER_STATE.INIT,
  token: undefined,
  sex: undefined,
  socket: undefined
};
$(function () {

  $('#m-create').click(function () {
    var roomName = $('#room-id').val();
    if (user.state == USER_STATE.INIT) {
      createRoom(roomName, 'M');
    } else {
      alert("You are in a room already");
    }
  });

  $('#f-create').click(function () {
    var roomName = $('#room-id').val();
    if (user.state == USER_STATE.INIT) {
      createRoom(roomName, 'F');
    } else {
      alert("You are in a room already");
    }
  });

  $('#join').click(function () {

    var roomName = $('#room-id').val();

    $.get('/join/' + roomName).then(function (resp) {
      var apiResult = resp.result;
      var token = resp.token;

      if (apiResult === RESULTS.JOINED && user.state === USER_STATE.INIT) {

        $('#log').append("<div>Joined the room</div>");

        // save the token
        user.token = token;

        user.sex = oppositeSex(token.substring(0, 1));

        // change state to PLAYING
        user.state = USER_STATE.PLAYING;

        // create socket connection
        user.socket = io();

        showInputBySex(user.sex);

        // subscribe the rooms
        user.socket.on('rooms/' + token, function (jsonStr) {
          var wsResp = JSON.parse(jsonStr);
          console.log(wsResp);

          switch (wsResp.result) {
            case RESULTS.ALL_DONE:
              $('#pppd').html(wsResp.paakpaakDay);

              break;
            case RESULTS.PARTNER_READY:
              $('#partner-ready-notice').html(detailsSex(wsResp.sex) + ' is ready');
          }
        });
      } else if (apiResult === RESULTS.ROOM_NOT_FOUND) {
        alert("Room not found!");
      }
    });
  });

  $('#ready').click(function () {
    if (user.state === USER_STATE.PLAYING && user.sex) {
      user.socket.emit('rooms', JSON.stringify({
        sex: user.sex,
        m: {
          mark: $('#m-mark').val(),
          prop: $('#m-prop').val()
        },
        f: {
          age: $('#f-age').val(),
          mark: $('#f-mark').val(),
          exp: $('#f-exp').val()
        },
        token: user.token
      }));

      $('#ready').attr('disabled', 'disabled');
    }
  });
});

function oppositeSex(sex) {
  return sex === 'M' ? 'F' : 'M';
}

function detailsSex(sex) {
  return sex === 'M' ? 'Male' : 'Female';
}

function createRoom(roomName, sex) {
  $.get('/rooms/' + roomName + '/' + sex).then(function (resp) {
    var apiResult = resp.result;
    var token = resp.token;

    if (apiResult === RESULTS.CREATED) {

      $('#log').append("<div>Room created! Please wait other to come in!</div>");

      // save the token
      user.token = token;

      user.sex = token.substring(0, 1);

      // change state to WAITING
      user.state = USER_STATE.WAITING;

      // create socket connection
      user.socket = io();

      // subscribe the rooms
      user.socket.on('rooms/' + token, function (jsonStr) {
        var wsResp = JSON.parse(jsonStr);

        console.log(wsResp);

        switch (wsResp.result) {
          case RESULTS.JOINED:
            $('#log').append("<div>Partner has joined the room</div>");

            user.state = USER_STATE.PLAYING;

            showInputBySex(user.sex);

            break;

          case RESULTS.PARTNER_READY:
            $('#partner-ready-notice').html(detailsSex(wsResp.sex) + ' is ready');

            break;
          case RESULTS.ALL_DONE:
            $('#pppd').html(wsResp.paakpaakDay);
            break;
        }
      });
    } else if (apiResult === RESULTS.ROOM_EXIST) {
      alert("Room name already exist!");
    }
  });
}

function showInputBySex(sex) {
  if (sex == 'M') {
    $('.female').show();
  } else {
    $('.male').show();
  }
}
