const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
app.use(cors());
const server = http.createServer(app);
const port = process.env.PORT || 3001;

server.listen(port, () => {
  console.log("Example app listening on port " + port);
});
