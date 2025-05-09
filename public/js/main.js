'use strict';

const socket = io.connect();

const deviceSelection = document.querySelector('#deviceSelection');
const audioSource = document.querySelector('#audioSource');
const videoSource = document.querySelector('#videoSource');
const confirmDevices = document.querySelector('#confirmDevices');
const localVideo = document.querySelector('#localVideo-container video');
const videoGrid = document.querySelector('#videoGrid');
const notification = document.querySelector('#notification');
const notify = (message) => {
    notification.innerHTML = message;
};


//Using STUN servers
const pcConfig = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
                'stun:stun3.l.google.com:19302',
                'stun:stun4.l.google.com:19302',
            ],
        },
    ],
};


// Initialize webrtc
const webrtc = new Webrtc(socket, pcConfig, {
    log: true,
    warn: true,
    error: true,
});


//Create or join a room
const roomInput = document.querySelector('#roomId');
const joinBtn = document.querySelector('#joinBtn');
joinBtn.addEventListener('click', async () => {
    const room = roomInput.value;
    if (!room) {
        notify('Room ID not provided');
        return;
    }

    // Show device selection
    await populateDeviceSelectors();
    deviceSelection.style.display = 'block';
    joinBtn.disabled = true;
});

// Device select confirmation
confirmDevices.addEventListener('click', async () => {
    const audioSourceId = audioSource.value;
    const videoSourceId = videoSource.value;
    const hasCameras = videoSource.style.display !== 'none';
  
    const audioConstraints = audioSourceId
      ? { deviceId: { exact: audioSourceId } }
      : true;
    const videoConstraints = hasCameras
      ? {
          deviceId: videoSourceId ? { exact: videoSourceId } : undefined
        }
      : false;
  
    try {
    
      const stream = await webrtc.getLocalStream(audioConstraints, videoConstraints);
  
      //DEBUG
      console.log('Local audio tracks:', stream.getAudioTracks());
      console.log('Local video tracks:', stream.getVideoTracks());
  
      localVideo.srcObject = stream;
      deviceSelection.style.display = 'none';
      webrtc.joinRoom(roomInput.value);
      joinBtn.disabled = false;
  
    } catch (error) {
      notify('Error accessing devices: ' + error.message);
    }
  });
  
  
  
// Function show device selectors
async function populateDeviceSelectors() {
  try {
    // Only audio permission, so if you dont have a camera you can still call for voice
    const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    tempStream.getTracks().forEach(t => t.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioDevices = devices.filter(d => d.kind === 'audioinput');
    const videoDevices = devices.filter(d => d.kind === 'videoinput');

    // Clear selects
    audioSource.innerHTML = '';
    videoSource.innerHTML = '';

    // Default options
    audioSource.appendChild(new Option('Default (Browser will choose)', ''));
    videoSource.appendChild(new Option('Default (Browser will choose)', ''));

    // Mic inputs
    audioDevices.forEach((d, i) => {
      const label = (d.label || `Mic ${i+1}`).replace(/\([^)]*\)/g, '').trim();
      audioSource.appendChild(new Option(label, d.deviceId));
    });

    if (videoDevices.length > 0) {
      // Camera inputs
      videoDevices.forEach((d, i) => {
        const label = (d.label || `Camera ${i+1}`).replace(/\([^)]*\)/g, '').trim();
        videoSource.appendChild(new Option(label, d.deviceId));
      });
    } else {
      // If no camera then hide the UI
      document.querySelector('#deviceSelection label[for="videoSource"]')
              .style.display = 'none';
      videoSource.style.display = 'none';
    }

    // Auto-select if only one
    if (audioDevices.length === 1) {
      audioSource.value = audioDevices[0].deviceId;
    }
    if (videoDevices.length === 1) {
      videoSource.value = videoDevices[0].deviceId;
    }

  } catch (error) {
    console.error('Error enumerating devices:', error);
    notify('Error getting device list. Please allow device access.');
    audioSource.innerHTML = '';
    videoSource.innerHTML = '';
    audioSource.appendChild(new Option('Default Microphone', ''));
    videoSource.appendChild(new Option('Default Camera', ''));
  }
}

const setTitle = (status, e) => {
    const room = e.detail.roomId;

    console.log(`Room ${room} was ${status}`);

    notify(`Room ${room} was ${status}`);
    document.querySelector('h1').textContent = `Room: ${room}`;
    webrtc.gotStream();
};
webrtc.addEventListener('createdRoom', setTitle.bind(this, 'created'));
webrtc.addEventListener('joinedRoom', setTitle.bind(this, 'joined'));


// Leave the room
const leaveBtn = document.querySelector('#leaveBtn');
leaveBtn.addEventListener('click', () => {
    webrtc.leaveRoom();
});
webrtc.addEventListener('leftRoom', (e) => {
    const room = e.detail.roomId;
    document.querySelector('h1').textContent = '';
    notify(`Left the room ${room}`);
});



const initialVideo = typeof videoSource !== 'undefined' && videoSource.style.display !== 'none';
webrtc
  .getLocalStream(true, initialVideo ? { width:640, height:480 } : false)
  .then(stream => localVideo.srcObject = stream);

webrtc.addEventListener('userLeave', (e) => {
    console.log(`user ${e.detail.socketId} left room`);
});


//New user connecting
webrtc.addEventListener('newUser', (e) => {
    const socketId = e.detail.socketId;
    const stream = e.detail.stream;

    if (videoGrid.children.length > 0) {
        notify('Only one-on-one calls are supported. Cannot connect to additional users.');
        return;
    }

    const videoContainer = document.createElement('div');
    videoContainer.setAttribute('class', 'grid-item');
    videoContainer.setAttribute('id', socketId);

    const video = document.createElement('video');
    video.setAttribute('autoplay', true);
    video.setAttribute('playsinline', true);
    video.srcObject = stream;

    const p = document.createElement('p');
    p.textContent = 'Remote User';

    videoContainer.append(p);
    videoContainer.append(video);
    videoGrid.append(videoContainer);
    
    notify('Connected with remote user');
});


webrtc.addEventListener('removeUser', (e) => {
    const socketId = e.detail.socketId;
    if (!socketId) {
        videoGrid.innerHTML = '';
        notify('Call ended');
        return;
    }
    document.getElementById(socketId).remove();
    notify('Remote user disconnected');
});


webrtc.addEventListener('error', (e) => {
    const error = e.detail.error;
    console.error(error);

    notify(error);
});


webrtc.addEventListener('notification', (e) => {
    const notif = e.detail.notification;
    console.log(notif);

    notify(notif);
});

//MUTE
let isMuted = false;
const muteBtn = document.querySelector('#muteBtn');

muteBtn.addEventListener('click', () => {
    const localStream = webrtc.localStream;
    
    if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        
        if (audioTracks.length > 0) {
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            isMuted = !isMuted;
            muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
            notify(isMuted ? 'Microphone muted' : 'Microphone unmuted');
        } else {
            notify('No audio track found');
        }
    } else {
        notify('Local stream not available');
    }
});