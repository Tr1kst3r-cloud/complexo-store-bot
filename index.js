const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} = require("discord.js");

const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot online 🚀");
});

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("ready", () => {
  console.log(`Bot logado como ${client.user.tag}`);
});

// ==================== PAINEL TICKET ====================

client.on("messageCreate", async (message) => {
  if (message.content === "!ticket") {

    const botao = new ButtonBuilder()
      .setCustomId("criar_ticket")
      .setLabel("🎟️ Criar Ticket")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(botao);

    message.channel.send({
      content: "🎫 Sistema de Suporte\nClique para abrir um ticket.",
      components: [row]
    });
  }

  if (message.content === "!loja") {

    const botao = new ButtonBuilder()
      .setCustomId("comprar_vip")
      .setLabel("🛒 Comprar VIP - R$10")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(botao);

    message.channel.send({
      content: "🛍️ Loja Oficial\nClique abaixo para comprar VIP.",
      components: [row]
    });
  }
});

// ==================== INTERAÇÕES ====================

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  // ===== CRIAR TICKET =====
  if (interaction.customId === "criar_ticket") {

    await interaction.deferReply({ ephemeral: true });

    const categoria = interaction.guild.channels.cache.find(
      c => c.name === "TICKETS" && c.type === ChannelType.GuildCategory
    );

    const canal = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: categoria?.id,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });

    const fechar = new ButtonBuilder()
      .setCustomId("fechar_ticket")
      .setLabel("❌ Fechar Ticket")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(fechar);

    await canal.send({
      content: `Olá ${interaction.user} 👋\nDescreva seu problema.`,
      components: [row]
    });

    const logs = interaction.guild.channels.cache.find(c => c.name === "logs-tickets");
    if (logs) logs.send(`🎟️ Ticket criado por ${interaction.user}`);

    await interaction.editReply({ content: `✅ Ticket criado: ${canal}` });
  }

  // ===== FECHAR TICKET =====
  if (interaction.customId === "fechar_ticket") {

    const logs = interaction.guild.channels.cache.find(c => c.name === "logs-tickets");
    if (logs) logs.send(`❌ Ticket fechado por ${interaction.user}`);

    await interaction.reply({ content: "🔒 Fechando ticket...", ephemeral: true });

    setTimeout(() => {
      interaction.channel.delete();
    }, 3000);
  }

  // ===== COMPRAR VIP =====
  if (interaction.customId === "comprar_vip") {

    await interaction.deferReply({ ephemeral: true });

    const cargo = interaction.guild.roles.cache.find(r => r.name === "VIP");
    const logs = interaction.guild.channels.cache.find(c => c.name === "logs-vendas");

    if (!cargo) {
      return interaction.editReply({ content: "❌ Cargo VIP não encontrado." });
    }

    await interaction.member.roles.add(cargo);

    if (logs) {
      logs.send(`🛒 Nova venda\nCliente: ${interaction.user}\nProduto: VIP\nValor: R$10`);
    }

    await interaction.editReply({
      content: "✅ Compra aprovada! Você recebeu o cargo VIP."
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
