const fs = require("fs");
const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
app.use(cors());
const server = http.createServer(app);
const port = process.env.PORT || 3001;

const io = new Server(server, {
  cors: {
    methods: ["GET", "POST"],
  },
});

// ATRIBUTOS DO JOGO
let configs = {};
configs.jogadores = [];
configs.prontos = 0;

const funcoes = JSON.parse(fs.readFileSync("funcoes.json", "utf-8"));

io.on("connection", (socket) => {
  // ao logar
  console.log(`User Connected: ${socket.id}`);

  // ao abrir ajuda
  socket.on("solicitarFuncoes", () => {
    socket.emit("receberFuncoes", funcoes);
  });

  // quando colocar o nick
  socket.on("novoJogador", (data) => {
    configs.jogadores.push({ id: socket.id, nome: data });
    console.log("Jogador " + data + " entrou com id: " + socket.id);

    io.emit("atualizarJogadores", configs.jogadores);
    io.emit("jogadoresProntos", configs.prontos);
  });

  socket.on("alterarPronto", (data) => {
    if (data) {
      configs.jogadores.at(socket.id).pronto = true;
      configs.prontos += 1;
    } else {
      configs.jogadores.at(socket.id).pronto = false;
      configs.prontos -= 1;
    }
    io.emit("jogadoresProntos", configs.prontos);
  });

  socket.on("disconnect", () => {
    if (configs.jogadores.length) {
      const jogadorDesconectado = configs.jogadores.find(
        (jogador) => jogador.id === socket.id
      );

      if (jogadorDesconectado.pronto) {
        configs.prontos--;
      }

      console.log("Jogador " + jogadorDesconectado.nome + " saiu.");
      configs.jogadores = configs.jogadores.filter(
        (jogador) => jogador.id !== socket.id
      );

      io.emit("atualizarJogadores", configs.jogadores);
    }
  });
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
