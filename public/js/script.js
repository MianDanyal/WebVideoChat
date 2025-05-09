document.addEventListener('DOMContentLoaded', function () {
  const socket = io();
  const inputBox = document.getElementById('inputBox');
  const sendBtn = document.getElementById('sendBtn');
  const messagesDiv = document.getElementById('messages');

  // Prompt for txt username
  let username = '';
  while (!username) {
    username = prompt('Enter your username:');
    if (!username) alert('Username is required.');
  }

  function sendMessage() {
    const text = inputBox.value.trim();
    if (text) {
      socket.emit('chat message', { username, text });
      inputBox.value = '';
    }
  }

  inputBox.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', function () {
    sendMessage();
  });

  socket.on('chat message', function (msg) {
    const msgEl = document.createElement('div');
    msgEl.innerHTML = `<strong>${msg.username}:</strong> ${msg.text}`;
    messagesDiv.appendChild(msgEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
});
