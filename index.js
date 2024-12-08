// Getting Elements from DOM
const joinButton = document.getElementById("joinBtn");
const leaveButton = document.getElementById("leaveBtn");
const toggleMicButton = document.getElementById("toggleMicBtn");
const toggleWebCamButton = document.getElementById("toggleWebCamBtn");
const createButton = document.getElementById("createMeetingBtn");
const videoContainer = document.getElementById("videoContainer");
const textDiv = document.getElementById("textDiv");
const lobbyWebcamPreview = document.getElementById("lobbyWebcamPreview");

// Declare Variables
let meeting = null;
let meetingId = "";
let isMicOn = false;
let isWebCamOn = false;

// Webcam Preview Functions
function startLobbyWebcamPreview() {
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      lobbyWebcamPreview.srcObject = stream;
    })
    .catch((error) => {
      console.error("Error accessing webcam:", error);
    });
}

function stopLobbyWebcamPreview() {
  const stream = lobbyWebcamPreview.srcObject;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    lobbyWebcamPreview.srcObject = null;
  }
}

// Initialize Meeting
function initializeMeeting() {
  try {
    // Get the username from the input field
    const username = document.getElementById('usernameTxt').value.trim();

    if (username === '') {
      alert('Please enter a username.');
      return;
    }

    window.VideoSDK.config(TOKEN);

    meeting = window.VideoSDK.initMeeting({
      meetingId, // required
      name: username, // Use the input username as the participant's name
      micEnabled: true, // optional, default: true
      webcamEnabled: true, // optional, default: true
    });

    if (!meeting) throw new Error("Failed to initialize the meeting.");

    meeting.join();

    createLocalParticipant();

    meeting.localParticipant.on("stream-enabled", (stream) => {
      setTrack(stream, null, meeting.localParticipant, true);
    });

    meeting.on("meeting-joined", () => {
      textDiv.style.display = "none";
      document.getElementById("grid-screen").style.display = "block";
      document.getElementById(
        "meetingIdHeading"
      ).textContent = `Meeting Id: ${meetingId}`;
    });

    meeting.on("meeting-left", () => {
      videoContainer.innerHTML = "";
    });

    meeting.on("participant-joined", (participant) => {
      let videoElement = createVideoElement(participant.id, participant.displayName);
      let audioElement = createAudioElement(participant.id);

      participant.on("stream-enabled", (stream) => {
        setTrack(stream, audioElement, participant, false);
      });

      videoContainer.appendChild(videoElement);
      videoContainer.appendChild(audioElement);
    });

    meeting.on("participant-left", (participant) => {
      document.getElementById(`f-${participant.id}`)?.remove();
      document.getElementById(`a-${participant.id}`)?.remove();
    });
  } catch (error) {
    console.error("Error initializing meeting:", error);
  }
}

// Create Video Element
function createVideoElement(pId, name) {
  let videoFrame = document.createElement("div");
  videoFrame.setAttribute("id", `f-${pId}`);

  let videoElement = document.createElement("video");
  videoElement.classList.add("video-frame");
  videoElement.setAttribute("id", `v-${pId}`);
  videoElement.setAttribute("playsinline", true);
  videoElement.setAttribute("width", "300");
  videoFrame.appendChild(videoElement);

  let displayName = document.createElement("div");
  displayName.innerHTML = `Name: ${name}`;
  videoFrame.appendChild(displayName);

  return videoFrame;
}

// Create Audio Element
function createAudioElement(pId) {
  let audioElement = document.createElement("audio");
  audioElement.setAttribute("autoplay", "false");
  audioElement.setAttribute("playsinline", "true");
  audioElement.setAttribute("controls", "false");
  audioElement.setAttribute("id", `a-${pId}`);
  audioElement.style.display = "none";
  return audioElement;
}

// Create Local Participant
function createLocalParticipant() {
  let localParticipant = createVideoElement(
    meeting.localParticipant.id,
    meeting.localParticipant.displayName
  );
  videoContainer.appendChild(localParticipant);
}

// Set Track
function setTrack(stream, audioElement, participant, isLocal) {
  if (stream.kind === "video") {
    isWebCamOn = true;
    const mediaStream = new MediaStream();
    mediaStream.addTrack(stream.track);
    let videoElm = document.getElementById(`v-${participant.id}`);
    videoElm.srcObject = mediaStream;
    videoElm.play().catch((error) =>
      console.error("videoElm.current.play() failed", error)
    );
  } else if (stream.kind === "audio" && !isLocal) {
    const mediaStream = new MediaStream();
    mediaStream.addTrack(stream.track);
    audioElement.srcObject = mediaStream;
    audioElement.play().catch((error) =>
      console.error("audioElm.play() failed", error)
    );
  }
}

// Event Listeners
joinButton.addEventListener("click", async () => {
  stopLobbyWebcamPreview();
  document.getElementById("join-screen").style.display = "none";
  textDiv.textContent = "Joining the meeting...";

  meetingId = document.getElementById("meetingIdTxt").value;
  initializeMeeting();
});

createButton.addEventListener("click", async () => {
  stopLobbyWebcamPreview();
  document.getElementById("join-screen").style.display = "none";
  textDiv.textContent = "Please wait, we are joining the meeting";

  try {
    const url = `https://api.videosdk.live/v2/rooms`;
    const options = {
      method: "POST",
      headers: { Authorization: TOKEN, "Content-Type": "application/json" },
    };

    const { roomId } = await fetch(url, options).then((response) =>
      response.json()
    );
    meetingId = roomId;
    initializeMeeting();
  } catch (error) {
    console.error("Error creating meeting:", error);
    alert("Failed to create a meeting.");
  }
});

// Start Webcam Preview on Load
startLobbyWebcamPreview();
// Leave Meeting Button Event Listener
leaveButton.addEventListener("click", () => {
  if (meeting) {
    // Leave the meeting
    meeting.leave();

    // Clean up meeting UI
    videoContainer.innerHTML = "";

    // Reset the meeting state
    meeting = null;
    meetingId = "";

    // Stop any active media tracks
    const lobbyStream = lobbyWebcamPreview.srcObject;
    if (lobbyStream) {
      lobbyStream.getTracks().forEach((track) => track.stop());
    }

    // Start the webcam preview for the lobby again
    startLobbyWebcamPreview();

    // Show the lobby screen
    document.getElementById("grid-screen").style.display = "none";
    document.getElementById("join-screen").style.display = "block";

    // Reset the text div
    textDiv.textContent = "Welcome! Please join or create a meeting.";
  }
});
