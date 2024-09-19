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

let assets = {
  jogadores: [],
  prontos: 0,
};

const funcoes = JSON.parse(fs.readFileSync("funcoes.json", "utf-8"));

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // TELA DE LOGIN --------------------------------------------------------------------------------
  socket.join("login");

  // abriu menu ajuda
  socket.on("funcoes", () => {
    socket.emit("funcoes", funcoes);
  });

  // pediu pra entrar
  socket.on("entrar", (nick, callback) => {
    // verifica nick
    if (assets.jogadores.some((jogador) => jogador.nome === nick)) {
      // nick em uso
      callback({
        status: "error",
      });
    } else {
      // nick disponivel
      callback({
        status: "ok",
      });
      // cadastra no server
      assets.jogadores.push({ id: socket.id, nome: nick, pronto: false });
      // troca sala
      socket.join("lobby");
      // atualiza quem ta no lobby
      io.to("lobby").emit("jogadores", assets.jogadores);
    }
  });

  // TELA DO LOBBY --------------------------------------------------------------------------------
  // apertou pronto
  socket.on("alterarPronto", (value) => {
    // verifica quem foi
    const jogador = assets.jogadores.find((j) => j.id === socket.id);
    if (jogador) {
      // muda o pronto
      jogador.pronto = value;
      if (jogador.pronto) {
        assets.prontos++;
      } else {
        assets.prontos--;
      }
    }
    // atualiza quem ta no lobby
    io.to("lobby").emit("jogadores", assets.jogadores);
    io.to("lobby").emit("prontos", assets.prontos);
  });

  // DESCONECTOU DA PAGINA ------------------------------------------------------------------------
  socket.on("disconnect", () => {
    // verifica se tinha alguem logado
    if (assets.jogadores.length) {
      // procure quem saiu
      const jogadorDesconectado = assets.jogadores.find(
        (jodador) => jodador.id == socket.id
      );
      // remove pronto se pronto
      if (jogadorDesconectado.pronto) {
        assets.prontos--;
      }
      // remove cadastro
      assets.jogadores = assets.jogadores.filter(
        (jogador) => jogador.id !== socket.id
      );
      console.log("Jogador " + jogadorDesconectado.nome + " saiu.");
      // atualiza quem ta no lobby
      io.to("lobby").emit("jogadores", assets.jogadores);
      io.to("lobby").emit("prontos", assets.prontos);
    }
  });
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
