const { UserAgent, Registerer, Inviter, SessionState, Web } = SIP;

// Test flag
const isTest = true;

var call = {
  "call": false,
  "phone": "0559661311",
  "name": "eli",
  "email": "something"
}

// Hook call object
var callProxy = new Proxy(call, {
  set: function (target, key, value) {
    console.log(`${key} set to ${value}`);
    if (key == "call") {
      if (value) startCall();
      else hangup();
    }
    target[key] = value;
    return true;
  }
});

let serverDomain, username, password;
if (isTest) {
  serverDomain = 'sipjs.onsip.com';
  username = 'Alice';
  password = 'password';
} else {
  serverDomain = credentials.domain;
  username = credentials.user;
  password = credentials.pass;
}

// UserAgent configuration
const configuration = isTest 
  ? {
      uri:  UserAgent.makeURI(`sip:${username}@${serverDomain}`), // Caller
      transportOptions: {
        server: `wss://edge.sip.onsip.com`
      },
      delegate: {
        onInvite: handleInvite
      }
    }
  : {
      uri:  UserAgent.makeURI(`sip:${username}@${serverDomain}`), // Caller
      authorizationUsername: username,
      authorizationPassword: password,
      transportOptions: {
        server: `wss://${serverDomain}`
      },
      delegate: {
        onInvite: handleInvite
      }
    };

let userAgent, registerer;
let session, callPhoneNumber, isCalling = false, callRecorder = null, callDirection, callStatus = "notanswered";
let tabUniqueID;

const baseApiUrl = 'https://bull36.com/api/sip_file.php';
const remoteMediaElement = document.getElementById('remoteAudio');

window.onload = intialize;
window.onbeforeunload = finalize;

function intialize() {
  getButtons("keypad").forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.getElementById("phone").value = document.getElementById("phone").value + e.target.innerText;
    });
  })
  
  document.getElementById("phone").addEventListener('input', (e) => {
    callProxy.phone = e.target.value;
  });

  document.getElementById("callButton").disabled = true;
  document.getElementById("callButton").addEventListener('click', () => {
    if (!isCalling) {
      startCall();
    } else {
      hangup();
    }
  });
  
  document.getElementById("reloadButton").addEventListener('click', () => {
    localStorage.clear();
    
    initTab();
  });

  initTab();
  
  userAgent = new UserAgent(configuration);
  registerer = new Registerer(userAgent);
  
  userAgent.start()
    .then(() => {
      println("Connected to the SIP provider.");
      registerer
        .register({
          requestDelegate: {
            onReject: (response) => {
              let message = `Registration of "${user.id}" rejected.\n`;
              message += `Reason: ${response.message.reasonPhrase}\n`;
              alert(message);
            }
          }
        })
        .then(() => {
          println("Registered to the SIP provider.");
          document.getElementById("callButton").disabled = false;
        })
        .catch(err => {
          println("Failed to register to the SIP provider");
          printError(err);
        });
    })
    .catch(err => {
      printError("Failed to connect to the SIP provider");
      printError(err);
    });
}

function startCall() {
  if (isCalling) return;

  isCalling = true;
  document.getElementById("callButton").style.backgroundColor = '#ff0000';
  callDirection = "out";

  callPhoneNumber = call.phone; // document.getElementById("phone").value;
  sendStartCallMessage();
  callStatus = "notanswered";

  const targetURI = isTest
    ? UserAgent.makeURI("sip:ben@superdev.onsip.com")
    : UserAgent.makeURI(`sip:${callPhoneNumber}@${serverDomain}`);

  session = new Inviter(userAgent, targetURI, {
    sessionDescriptionHandlerOptions: {
      constraints: { audio: true, video: false },
      requestDelegate: {
        onReject: (response) => {
          let message = `Registration of "${user.id}" rejected.\n`;
          message += `Reason: ${response.message.reasonPhrase}\n`;
          alert(message);
        }
      }
    }
  });

  session.stateChange.addListener(state => {
    println(`Session state changed to ${state}`);
    
    switch (state) {
      case SessionState.Established:
        setupRemoteMedia();
        break;
      case SessionState.Terminated:
        sendEndCallMessage();
        cleanupMedia();
        endCall();
        break;
      default: break;
    }
  });

  session.invite()
    .then(() => println("Sent invitation to the user"))
    .catch((err) => printError(["Failed to start a call", err]));
}

function sendStartCallMessage() {
  $.post(baseApiUrl, {
    token: "GC8RUZ98QWERT",
    api: "sip",
    type: "start_call",
    direction: callDirection,
    phone: callPhoneNumber
  }, (data, status) => {
    println("Sent start_call to the server.");
    println(["start_call", callPhoneNumber, callDirection, data, status]);
  });
}

function setupRemoteMedia() {
  println("Setting remote media...");
  callStatus = "answered";
  const localStream = new MediaStream(), remoteStream = new MediaStream();

  session.sessionDescriptionHandler.peerConnection.getSenders().forEach((sender) => {
    if (sender.track) localStream.addTrack(sender.track);
  });

  session.sessionDescriptionHandler.peerConnection.getReceivers().forEach((receiver) => {
    if (receiver.track) {
      remoteStream.addTrack(receiver.track);
    }
  });
  remoteMediaElement.srcObject = remoteStream;
  remoteMediaElement.play();

  println("Mixing local stream and remote stream...");
  // Create a new AudioContext object
  var context = new AudioContext();

  // Create two new MediaStreamAudioSourceNode objects to represent the local and remote audio streams
  var localSource = context.createMediaStreamSource(localStream);
  var remoteSource = context.createMediaStreamSource(remoteStream);

  // Create a new GainNode object to control the volume of each audio source
  var localGain = context.createGain();
  var remoteGain = context.createGain();

  // Set the initial volume levels
  localGain.gain.value = 1;
  remoteGain.gain.value = 1;

  // Connect the audio sources to the gain nodes
  localSource.connect(localGain);
  remoteSource.connect(remoteGain);

  // Create a new MediaStreamDestination object to output the mixed audio
  var destination = context.createMediaStreamDestination();

  // Connect the gain nodes to the output destination
  localGain.connect(destination);
  remoteGain.connect(destination);

  // Create a new MediaRecorder object and pass the mixed audio stream to it
  let input = context.createMediaStreamSource(destination.stream);

  println("Start recording...");
  if (callRecorder) delete callRecorder;
  callRecorder = new Recorder(input, { numChannels: 1 });
  callRecorder.record();
}

function handleInvite(invitation) {
  println("Handling invitation...");
  session = invitation;
  callDirection = "in";
  session.stateChange.addListener(state => {
    println(`Session state changed to ${state}`);
    
    switch (state) {
      case SessionState.Established:    
        setupRemoteMedia();
        break;
      case SessionState.Terminated:
        sendEndCallMessage();
        cleanupMedia();
        endCall();
        break;
      default: break;
    }
  });  
  
  callPhoneNumber = session.incomingInviteRequest.message.to.uri.user;
  sendStartCallMessage();
  callStatus = "notanswered";

  if (isCalling) {
    session.reject();
    return;
  }

  isCalling = true;
  document.getElementById("callButton").style.backgroundColor = '#ff0000';

  // Confirm accept or reject?
  let confirmText = "Incoming call:";
  confirmText += "\nFrom: " + session.incomingInviteRequest.message.from.uri.aor;
  confirmText += "\nTo: " + session.incomingInviteRequest.message.to.uri.aor;
  confirmText += "\nAccept or Reject?";

  if (!confirm(confirmText)) session.reject();
  else {
    session.accept({
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false }
      }
    });
  }
}

function sendEndCallMessage() {
  println("Send end_call to the server...");
  // Prepare form data for call log
  var formData = new FormData();
  formData.append('token', "GC8RUZ98QWERT");
  formData.append('api','sip');
  formData.append('type', "end_call");
  formData.append('direction', callDirection);
  formData.append('phone', callPhoneNumber);
  formData.append('status', callStatus);

  if (callStatus === "notanswered") {
    $.ajax({
      url: baseApiUrl,
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: (data, status) => {
        println(["Call ended", data, status]);
      },
      error: () => printError("Failed to end the call")
    });
  } else {
    callRecorder.stop();
    callRecorder.exportWAV((blob) => {
      formData.append("file", blob, "test.wav");
      saveAs(blob);

      $.ajax({
        url: baseApiUrl,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: (data, status) => {
          println(["Call ended", data, status]);
        },
        error: () => printError("Failed to end the call")
      });

      callRecorder = null;
      cleanupMedia();
    });
  }

  // Close session
  switch(session.state) {
    case SessionState.Initial:
    case SessionState.Establishing:
      if (session instanceof Inviter) session.cancel();
      else session.reject();
      break;
    case SessionState.Established:
      session.bye();
      break;
    default:
      break;
  }
}

function cleanupMedia() {
  remoteMediaElement.srcObject = null;
  remoteMediaElement.pause();
}

function hangup() {
  println(["Hang up...", session.state]);
  switch(session.state) {
    case SessionState.Initial:
    case SessionState.Establishing:
      if (session instanceof Inviter) session.cancel();
      else session.reject();
      break;
    case SessionState.Established:
      session.bye();
      break;
  }

  session = null;
}

function endCall() {
  if (!isCalling) return;

  isCalling = false;
  document.getElementById("callButton").style.backgroundColor = '#4CD192';
}

function finalize(event) {
  println("Finalize...");
  event.preventDefault();
  event.returnValue = '';
  localStorage.clear();
};

// Utils
function getButtons(id) {
  const els = document.getElementsByClassName(id);
  if (!els.length) {
    throw new Error(`Elements "${id}" not found.`);
  }
  const buttons = [];
  for (let i = 0; i < els.length; i++) buttons.push(els[i]);
  return buttons;
}

function println(msg) {
  if (Array.isArray(msg)) {
    console.log("###", ...msg);
  } else {
    console.log("###", msg);
  }
}

function printError(err) {
  if (Array.isArray(err)) {
    console.error("###", ...err);
  } else {
    console.error("###", err);
  }
}

/**
 * Between Tabs Communication
 */
function breakTab() {
  document.getElementById("root").style.display = 'none';
  document.getElementById("other-tab").style.display = 'flex';

  if (session != null) {
    hangup();
    $('#staticBackdrop').modal('hide');
  }
}

function initTab() {
  tabUniqueID = new Date().getTime();
  if (localStorage.getItem("sipjs4client")) {
    document.getElementById("root").style.display = 'none';
    document.getElementById("other-tab").style.display = 'flex';
    println("Oh, multi tabs detected.");
  } else {
    document.getElementById("root").style.display = 'block';
    document.getElementById("other-tab").style.display = 'none';
    localStorage.setItem('sipjs4client', tabUniqueID);
    println("Set time to the localStorage");
  }
}

// Event listener for the 'storage' event
window.addEventListener('storage', function(event) {
  if (event.storageArea === localStorage) {
    // Check if the key you're interested in has changed
    if (event.key === 'sipjs4client') {
      // The value of 'yourKey' in localStorage has changed
      if (event.newValue === null) {
        initTab();
      }
      if (event.newValue !== tabUniqueID) {
        breakTab();
      }
    }
  }
});
