const { UserAgent, Registerer, Web } = SIP;

const serverDomain = 'webrtc.bluebe.net';
const username = '316!!caspiWRTCxr';
const password = 'Ncj487De';
// const serverDomain = 'edge.sip.onsip.com';
// const username = 'ben';
// const password = '@gmail123';

class SimpleUserWithDataChannel extends Web.SimpleUser {
  constructor(server, options = {}, callbacks) {
    super(server, options);
    this.callbacks = callbacks;
    this._dataChannel = undefined;
  }

  get dataChannel() {
    return this._dataChannel;
  }

  set dataChannel(dataChannel) {
    this._dataChannel = dataChannel;
    if (!dataChannel) {
      return;
    }
    dataChannel.onclose = this.callbacks.onDcClose;
    dataChannel.onerror = this.callbacks.onDcError;
    dataChannel.onmessage = this.callbacks.onDcMessage;
    dataChannel.onopen = this.callbacks.onDcOpen;
    
    // dataChannel.onclose = this.callbacks.onDcClose;
    //  (event) => {
    //   console.log(`[${this.id}] data channel onClose`);
    //   this.messageInput.disabled = true;
    //   this.receiveDiv.classList.add("disabled");
    //   this.sendButton.disabled = true;
    // };
  
    // dataChannel.onerror = (event) => {
    //   console.error(`[${this.id}] data channel onError`);
    //   console.error(event.error);
    //   alert(`[${this.id}] Data channel error.\n` + event.error);
    // };
  
    // dataChannel.onmessage = (event) => {
    //   console.log(`[${this.id}] data channel onMessage`);
    //   const el = document.createElement("p");
    //   el.classList.add("message");
    //   const node = document.createTextNode(event.data);
    //   el.appendChild(node);
    //   this.receiveDiv.appendChild(el);
    //   this.receiveDiv.scrollTop = this.receiveDiv.scrollHeight;
    // };
  
    // dataChannel.onopen = (event) => {
    //   console.log(`[${this.id}] data channel onOpen`);
    //   this.messageInput.disabled = false;
    //   this.receiveDiv.classList.remove("disabled");
    //   this.sendButton.disabled = false;
    // };
  }

  send() {
    if (!this.dataChannel) {
      const error = "No data channel";
      console.error(`[${this.id}] failed to send message`);
      console.error(error);
      alert(`[${this.id}] Failed to send message.\n` + error);
      return;
    }
  
    const msg = this.messageInput.value;
    if (!msg) {
      console.log(`[${this.id}] no data to send`);
      return;
    }
  
    switch (this.dataChannel.readyState) {
      case "connecting":
        console.error("Attempted to send message while data channel connecting.");
        break;
      case "open":
        try {
          this.dataChannel.send(msg);
        } catch (error) {
          console.error(`[${this.id}] failed to send message`);
          console.error(error);
          alert(`[${this.id}] Failed to send message.\n` + error);
        }
        break;
      case "closing":
        console.error("Attempted to send message while data channel closing.");
        break;
      case "closed":
        console.error("Attempted to send while data channel connection closed.");
        break;
    }
    // this.messageInput.value = "";
  }
}

// const userAgent = new UserAgent({
//   uri: `sip:${username}@${serverDomain}`,
//   transportOptions: {
//     wsServers: `wss://${serverDomain}`,
//   },
//   authorizationUser: username,
//   password: password,
// });
// const registerer = new Registerer(userAgent);

// https://react.spruko.com/nowa-ts/preview/dashboard/dashboard-1

// WebSocket server to connect with
const server = `wss://${serverDomain}`;

const options = {
  aor: `sip:${username}@${serverDomain}`, // Caller
  // aor: `sip:ben@superdev.onsip.com`,
  media: {
    constraints: { audio: true, video: false }, // audio only call
    remote: { audio: document.getElementById("remote-audio") }
  },
  UserAgent: {
    displayName: 'Hahaha'
  }
};

console.log(server, options);

// Construct a SimpleUser instance
const simpleUser = new SimpleUserWithDataChannel(server, options, {
  onDcOpen: () => console.log('DataChannel Opened!!!'),
  onDcClose: () => console.log('DataChannel Closed!!!'),
  onDcMessage: () => console.log('DataChannel Message Received'),
  onDcError: () => console.log('DataChannel Error!!!')
});

// Connect to server and place call
simpleUser.connect()
  .then(() => {
    console.log('connected.');

    // const target = `sip:${username}@${serverDomain}`;
    // const target = "sip:ben@superdev.onsip.com";
    const target = `sip:0559661311@${serverDomain}`;
    const targetDisplay = "Ben Alex";

    simpleUser
      .call(
        target,
        undefined,
        {
          // An example of how to get access to a SIP response message for custom handling
          requestDelegate: {
            onReject: (response) => {
              console.warn(`INVITE rejected`);
              let message = `Session invitation to "${targetDisplay}" rejected.\n`;
              message += `Reason: ${response.message.reasonPhrase}\n`;
              message += `Perhaps "${targetDisplay}" is not connected or registered?\n`;
              alert(message);
            }
          },
          withoutSdp: false
        },
      )
      .catch(error => {
        console.log('Failed to call');
        console.error(error);
      });
  })
  .catch((error) => {
    // Call failed
    console.error(error);
  });

// userAgent.start().then(() => {
//   registerer.register();
// });

/*
userAgent.on('registered', () => {
  console.log('User registered');

  const destinationURI = `sip:${username}@${serverDomain}`;
  const session = userAgent.invite(destinationURI, {
    media: {
      constraints: { audio: true, video: false },
      render: { remote: document.getElementById("remote-audio") }
    }
  });

  session.on('accepted', () => {
    console.log('Call accepted');
  });
  
  session.on('terminated', () => {
    console.log('Call terminated');
  });
});
*/