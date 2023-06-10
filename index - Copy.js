const { UserAgent, Registerer, Inviter, SessionState, Web } = SIP;

// const serverDomain = 'webrtc.bluebe.net';
// const username = '316!!caspiWRTCxr';
// const password = 'Ncj487De';
const serverDomain = 'sipjs.onsip.com';
const username = 'Alice';
const password = 'password';
const baseApiUrl = 'https://bull36.com/api.php';

const uri = UserAgent.makeURI(`sip:${username}@${serverDomain}`);

const mediaElement = document.getElementById('remoteAudio');

let session, phoneNum, isCalling = false, rec;

function getButtons(id) {
  const els = document.getElementsByClassName(id);
  if (!els.length) {
    throw new Error(`Elements "${id}" not found.`);
  }
  const buttons = [];
  for (let i = 0; i < els.length; i++) buttons.push(els[i]);
  return buttons;
}

document.getElementById("callButton").addEventListener('click', () => {
  isCalling = true;
  if (isCalling) {
    phoneNum = document.getElementById("phone").value;
    makeCall(phoneNum);
  } else {
    endCall();
  }
});

getButtons("keypad").forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.getElementById("phone").value = document.getElementById("phone").value + e.target.innerText;
  });
})

// WebSocket server to connect with
const configuration = {
  uri:  uri, // Caller
  // media: {
  //   constraints: { audio: true, video: false }, // audio only call
  //   remote: { audio: document.getElementById("remote-audio") }
  // },
  // authorizationUsername: username,
  // authorizationPassword: password,
  transportOptions: {
    // server: `wss://${serverDomain}`
    server: `wss://edge.sip.onsip.com`
  },
  delegate: {
    onInvite
  }
};

const userAgent = new UserAgent(configuration);
const registerer = new Registerer(userAgent);

userAgent.start().then(() => {
  console.info("###", 'started');
  registerer.register({
    // An example of how to get access to a SIP response message for custom handling
    requestDelegate: {
      onReject: (response) => {
        console.warn(`[${user.id}] REGISTER rejected`);
        let message = `Registration of "${user.id}" rejected.\n`;
        message += `Reason: ${response.message.reasonPhrase}\n`;
        alert(message);
      }
    }
  })
  .then(() => {
    console.info("###", 'SIP registration successful.');
  })
  .catch(err => {
    console.error('Cannot register to the SIP Provider');
    console.error(err);
  });
})
.catch(err => {
  console.error('Cannot connect to the SIP Provider');
  console.error(err);
});

function onInvite(invitation) {
  let confirmText = "Incoming call:";
  console.log(invitation);
  confirmText += "\nFrom: " + invitation.incomingInviteRequest.message.from.uri.aor;
  confirmText += "\nTo: " + invitation.incomingInviteRequest.message.to.uri.aor;
  confirmText += "\nAccept or Reject?";
  
  // let callApiUrl = baseApiUrl;

  session = invitation;

  if (confirm(confirmText)) {
    phoneNum = invitation.incomingInviteRequest.message.to.uri.user;
    startCall(() => {
      invitation.accept({
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: false }
        }
      });
    });
  invitation.stateChange.addListener(state => {
    console.info("###", `Session state changed to ${state}`);
    
    switch (state) {
      case SessionState.Initial:
        console.info("###", "Initialize session state");
        break;
      case SessionState.Establishing:
        console.info("###", "Session state is Establishing");
        break;
      case SessionState.Established:
        startCall(() => {
          setupRemoteMedia(invitation);
        });
        break;
      case SessionState.Terminating:
      case SessionState.Terminated:
        endCall();
        break;
      default:
        throw new Error("Unknown session state.");
    }
  });
    // callApiUrl += "?token=GC8RUZ98QWERT";
    // callApiUrl += "&api=sip";
    // callApiUrl += "&type=start_call";
    // callApiUrl += "&direction=in";
    // callApiUrl += "&phone=" + invitation.incomingRequestMessage.to.uri.user;
    // $.get(callApiUrl, (data, status) => {
    //   if (status == "success") {
    //     let parseData = JSON.parse(data);
    //     if (parseData.status) {
    //       invitation.accept({
    //         sessionDescriptionHandlerOptions: {
    //           constraints: { audio: true, video: false }
    //         }
    //       });
    //     }
    //   }
    // })
  } else {
    invitation.reject();
  }
}

function makeCall(phoneNumber) {
  // const targetURI = UserAgent.makeURI(`sip:${phoneNumber}@${serverDomain}`);
  const targetURI = UserAgent.makeURI("sip:ben@superdev.onsip.com");

  const inviter = session = new Inviter(userAgent, targetURI, {
    sessionDescriptionHandlerOptions: {
      constraints: { audio: true, video: false },
      requestDelegate: {
        onReject: (response) => {
          console.warn(`[${user.id}] REGISTER rejected`);
          let message = `Registration of "${user.id}" rejected.\n`;
          message += `Reason: ${response.message.reasonPhrase}\n`;
          alert(message);
        }
      }
    }
  });

  inviter.stateChange.addListener(state => {
    console.info("###", `Session state changed to ${state}`);
    
    switch (state) {
      case SessionState.Initial:
        console.info("###", "Initialize session state");
        break;
      case SessionState.Establishing:
        console.info("###", "Session state is Establishing");
        break;
      case SessionState.Established:
        startCall(() => {
          setupRemoteMedia(inviter);
        });
        break;
      case SessionState.Terminating:
      case SessionState.Terminated:
        endCall();
        break;
      default:
        throw new Error("Unknown session state.");
    }
  });

  inviter.invite()
    .then(() => {
      console.info("###", "Invite sent");
    })
    .catch(err => {
      console.error('Failed to make a call');
    });
}

const remoteStream = new MediaStream();
function setupRemoteMedia(session) {
  console.log("###", session);
  session.sessionDescriptionHandler.peerConnection.getReceivers().forEach((receiver) => {
    if (receiver.track) {
      remoteStream.addTrack(receiver.track);
    }
  });
  mediaElement.srcObject = remoteStream;
  mediaElement.play();

  const audioContext = new AudioContext();
  let input = audioContext.createMediaStreamSource(remoteStream);
  rec = new Recorder(input, { numChannels: 1 });
  rec.record();
}

function cleanupMedia() {
  mediaElement.srcObject = null;
  mediaElement.pause();
}

function startCall(callback) {
  $.post(baseApiUrl, {
    token: "GC8RUZ98QWERT",
    api: "sip",
    type: "start_call",
    direction: "in",
    phone: phoneNum
  }, (data, status) => {
    if (status == "success") {
      let parseData = JSON.parse(data);
      if (parseData.status) {
        return callback();
      }
    }
  });
}

function endCall() {
  console.log("###", "End Call");
  rec.stop();
  rec.exportWAV((blob) => {
    console.log(blob);
    // Create a new FormData object.
    var formData = new FormData();

    formData.append('token', "GC8RUZ98QWERT");
    formData.append('type', "end_call");
    formData.append('direction', "in");
    formData.append('phone', phoneNum);
    formData.append('file', blob);

    $.ajax({
      url: baseApiUrl,
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: (data, status) => {
        cleanupMedia();
        console.log('succeed', '#', data, '#', status);
        /*if (status === "success") {
          let parseData = JSON.parse(data);
          if (parseData.status) {
            cleanupMedia();
          }
        }*/
      },
      error: () => {
        console.error('End call Error!');
      }
    });
  });

  switch(session.state) {
    case SessionState.Initial:
    case SessionState.Establishing:
      if (session instanceof Inviter) {
        // An unestablished outgoing session
        session.cancel();
      } else {
        // An unestablished incoming session
        session.reject();
      }
      break;
    case SessionState.Established:
      // An established session
      session.bye();
      break;
    case SessionState.Terminating:
    case SessionState.Terminated:
      // Cannot terminate a session that is already terminated
      break;
  }
}