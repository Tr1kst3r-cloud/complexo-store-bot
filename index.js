const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// Servidor web obrigatório para o Render
app.get("/", (req, res) => {
  res.send("Bot online 🚀");
});

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});

// Configuração do bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Quando o bot ligar
client.once("ready", () => {
  console.log(`Bot logado como ${client.user.tag}`);
});

// Comando simples
client.on("messageCreate", (message) => {
  if (message.content === "!ping") {
    message.reply("Pong 🏓");
  }
});

// Login com variável de ambiente (IMPORTANTE)
client.login(process.env.DISCORD_TOKEN);
