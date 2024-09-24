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

// lobby
let jogadores = [];
let prontos = 0;

// ingame
let jogadoresIngame = [];
let carregados = 0;

// distrubuir funcoes
function distrubuir() {
  let quantidadeAldeia = 0;
  let quantidadeLobos = 0;

  console.log("distribuindo...");
  jogadoresIngame.forEach((jogador) => {
    if (quantidadeAldeia === 0) {
      while (true) {
        let funcaoAleatoria =
          funcoes[Math.floor(Math.random() * funcoes.length)];
        if (funcaoAleatoria.equipe === "aldeia") {
          jogador.funcao = funcaoAleatoria;
          quantidadeAldeia++;
          break;
        }
      }
    } else if (quantidadeLobos === 0) {
      while (true) {
        let funcaoAleatoria =
          funcoes[Math.floor(Math.random() * funcoes.length)];
        if (funcaoAleatoria.equipe === "lobisomens") {
          jogador.funcao = funcaoAleatoria;
          quantidadeLobos++;
          break;
        }
      }
    } else {
      jogador.funcao = funcoes[Math.floor(Math.random() * funcoes.length)];
    }
  });
  console.log("funcoes atribuidas!");
}

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
    if (jogadores.some((jogador) => jogador.nome === nick)) {
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
      jogadores.push({ id: socket.id, nome: nick, pronto: false });
      console.log("Jogador '" + nick + "' conectado com o id: " + socket.id);
      // troca sala
      socket.join("lobby");
      // atualiza quem ta no lobby
      io.to("lobby").emit("jogadores", jogadores);
      io.to("lobby").emit("prontos", prontos);
      io.to("lobby").emit("pararContagem");
    }
  });

  // TELA DO LOBBY --------------------------------------------------------------------------------
  // apertou pronto
  socket.on("alterarPronto", (value) => {
    // verifica quem foi
    const jogador = jogadores.find((j) => j.id === socket.id);
    if (jogador) {
      // coloca ou tira de pronto
      jogador.pronto = value;
      if (jogador.pronto) {
        console.log(jogador.nome + " deu pronto");
        prontos++;
      } else {
        console.log(jogador.nome + " tirou o pronto");
        prontos--;
      }
    }
    // atualiza quem ta no lobby
    io.to("lobby").emit("jogadores", jogadores);
    io.to("lobby").emit("prontos", prontos);
    // se todos prontos começar contagem regressiva
    if (jogadores.length === prontos) {
      io.to("lobby").emit("iniciarContagem");
    } else {
      io.to("lobby").emit("pararContagem");
    }
  });

  // TELA DO JOGO ---------------------------------------------------------------------------------
  socket.on("carreguei", () => {
    console.log(jogadores.find((j) => j.id === socket.id).nome + " carregou");
    socket.join("ingame");
    carregados++;
    if (carregados == jogadores.length) {
      console.log("todo mundo carregou");
      jogadoresIngame = jogadores;
      distrubuir();
      carregados = 0;
    }
  });

  socket.on("esperandoFuncao", () => {
    const jogador = jogadoresIngame.find((j) => j.id === socket.id);
    socket.emit("receberFuncao", jogador.funcao);
    console.log(jogador.nome + " recebeu sua funcao");
  });

  socket.on("esperandoNomes", () => {
    let nomes = [];
    jogadoresIngame.forEach((jogador) => {
      nomes.push(jogador.nome);
    });
    socket.emit("receberNomes", nomes);
  });

  // DESCONECTOU DA PAGINA ------------------------------------------------------------------------
  socket.on("disconnect", () => {
    // verifica se tinha alguem logado
    if (jogadores.length) {
      // procure quem saiu
      const jogadorDesconectado = jogadores.find(
        (jodador) => jodador.id == socket.id
      );
      // remove pronto se pronto
      if (jogadorDesconectado.pronto) {
        prontos--;
      }
      // remove cadastro
      jogadores = jogadores.filter((jogador) => jogador.id !== socket.id);
      console.log("Jogador " + jogadorDesconectado.nome + " saiu.");
      // atualiza quem ta no lobby
      io.to("lobby").emit("jogadores", jogadores);
      io.to("lobby").emit("prontos", prontos);
      if (jogadores.length === prontos) {
        io.to("lobby").emit("iniciarContagem");
      }
    }
  });
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
