# WebRTC Video Chat Application

A one-to-one video chat application built with WebRTC and Socket.io.

## Prerequisites

- Node.js
- npm (comes with Node.js)
- Web browser with WebRTC support (Chrome, Firefox, Safari, Edge)

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
   This will install required dependencies such as:
   - express
   - socket.io
   - (other dependencies as needed)
## Running the Application
1. Start the server:
   ```
   npm start
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

The server uses Socket.io for signaling and Express for serving static files. You can change the port number '3000' to any that you prefer. Then you would use localhost:(your port).

```javascript
// In server.js
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

