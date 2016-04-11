var socket = io();

const USER_STATE = {
  INIT: 0,
  WAITING: 1,
  PLAYING: 2
}

const RESULTS = {
  CREATED:1,
  JOINED: 2,
  ROOM_FULL: 3,
  ROOM_NOT_FOUND: 4,
  ROOM_EXIST:5,
  ALL_DONE: 6,
  PARTNER_READY: 7
}

var user = {
  state: USER_STATE.INIT,
  token: undefined,
  sex: undefined
}


$('#m-create').click(() => {
  const roomName = $('#room-id').val();
  if(user.state == USER_STATE.INIT) {
    createRoom(roomName,'M')
  }

})

$('#f-create').click(() => {
  const roomName = $('#room-id').val();
  if(user.state == USER_STATE.INIT) {
    createRoom(roomName,'F')
  }

})

$('#join').click(() => {

  const roomName = $('#room-id').val()

  $.get(`/join/${roomName}`).then((resp) => {
    const apiResult = resp.result
    const token = resp.token

    if(apiResult === RESULTS.JOINED && user.state === USER_STATE.INIT) {

      // save the token
      user.token = token

      user.sex = oppositeSex(token.substring(0,1))

      // change state to PLAYING
      user.state = USER_STATE.PLAYING

      showInputBySex(user.sex)

      // subscribe the rooms
      socket.on(`rooms/${token}`, (jsonStr) => {
        const wsResp = JSON.parse(jsonStr)
        console.log(wsResp)

        switch (wsResp.result) {
          case RESULTS.ALL_DONE:
            $('#pppd').html(wsResp.paakpaakDay)

            break;
          case RESULTS.PARTNER_READY:
            $('#partner-ready-notice').html(`${detailsSex(wsResp.sex)} is ready`)
        }
      })
    }
  })

})


$('#ready').click(() => {
  if(user.state === USER_STATE.PLAYING && user.sex){
    socket.emit(`rooms`,JSON.stringify({
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
    }))

    $('#ready').attr('disabled','disabled')
  }

})

function oppositeSex(sex) {
  return sex === 'M'? 'F' : 'M'
}

function detailsSex(sex){
  return sex === 'M' ? 'Male' : 'Female'
}

function createRoom(roomName,sex) {
    $.get(`/rooms/${roomName}/${sex}`).then((resp) => {
      const apiResult = resp.result
      const token = resp.token

      if(apiResult === RESULTS.CREATED) {

        // save the token
        user.token = token

        user.sex = token.substring(0,1)

        // change state to WAITING
        user.state = USER_STATE.WAITING

        // subscribe the rooms
        socket.on(`rooms/${token}`, (jsonStr) => {
          const wsResp = JSON.parse(jsonStr)

          console.log(wsResp)

          switch (wsResp.result) {
            case RESULTS.JOINED:
              user.state = USER_STATE.PLAYING

              showInputBySex(user.sex)

              break;

            case RESULTS.PARTNER_READY:
              $('#partner-ready-notice').html(`${detailsSex(wsResp.sex)} is ready`)

              break
            case RESULTS.ALL_DONE:
              $('#pppd').html(wsResp.paakpaakDay)
              break;
          }
        })
      } else if(apiResult === RESULTS.ROOM_EXIST){
        alert("Room name already exist!")
      }
    })
}

function showInputBySex(sex){
  if(sex == 'M'){
    $('.female').show();
  } else {
    $('.male').show();
  }
}