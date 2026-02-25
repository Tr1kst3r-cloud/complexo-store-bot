const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  StringSelectMenuBuilder
} = require("discord.js");

const express = require("express");
const fs = require("fs-extra");

const CHAVE_PIX = "455cb83a-ce97-471e-954f-2f1922bbbc73";

const app = express();
app.get("/", (req, res) => res.send("Bot online 🚀"));
app.listen(3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const produtosPath = "./produtos.json";

function carregarProdutos() {
  return JSON.parse(fs.readFileSync(produtosPath));
}

function salvarProdutos(produtos) {
  fs.writeFileSync(produtosPath, JSON.stringify(produtos, null, 2));
}

client.once("ready", () => {
  console.log(`Bot online como ${client.user.tag}`);
});

/* ================= COMANDOS ================= */

client.on("messageCreate", async (message) => {
  if (!message.member.permissions.has("Administrator")) return;

  // PAINEL TICKET
  if (message.content === "!painelticket") {

    if (message.channel.name !== "📫・tickets")
      return message.reply("Use no canal 📫・tickets.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId("abrir_ticket")
      .setPlaceholder("Selecione o tipo de atendimento")
      .addOptions([
        { label: "Compra", value: "compra", emoji: "🛒" },
        { label: "Suporte", value: "suporte", emoji: "🎫" },
        { label: "Parceria", value: "parceria", emoji: "🤝" }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    const painel = await message.channel.send({
      embeds: [{
        title: "🎟️ Central de Atendimento",
        description: "Selecione abaixo o tipo de atendimento.",
        color: 0x2b2d31
      }],
      components: [row]
    });

    await painel.pin();
    message.delete();
  }

  // PAINEL LOJA
  if (message.content === "!painelvendas") {

    const produtos = carregarProdutos();

    const menu = new StringSelectMenuBuilder()
      .setCustomId("comprar_produto")
      .setPlaceholder("Selecione o produto");

    Object.keys(produtos).forEach(key => {
      const p = produtos[key];
      menu.addOptions({
        label: `${p.nome} - R$${p.preco}`,
        description: p.estoque.length > 0 ? `Estoque: ${p.estoque.length}` : "❌ Esgotado",
        value: key,
        emoji: "🛍️"
      });
    });

    const row = new ActionRowBuilder().addComponents(menu);

    message.channel.send({
      embeds: [{
        title: "🛒 Loja Oficial",
        description: "Selecione o produto para comprar via PIX.",
        color: 0x00ff99
      }],
      components: [row]
    });
  }
});

/* ================= INTERAÇÕES ================= */

client.on(Events.InteractionCreate, async (interaction) => {

  // ===== ABRIR TICKET =====
  if (interaction.isStringSelectMenu() && interaction.customId === "abrir_ticket") {

    await interaction.deferReply({ ephemeral: true });

    const categoria = interaction.guild.channels.cache.find(
      c => c.name === "⎯TICKET SUPPORT" && c.type === ChannelType.GuildCategory
    );

    if (!categoria)
      return interaction.editReply({ content: "Categoria ⎯TICKET SUPPORT não encontrada." });

    const canal = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: categoria.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    interaction.editReply({ content: `✅ Ticket criado: ${canal}` });
  }

  // ===== COMPRA VIA PIX =====
  if (interaction.isStringSelectMenu() && interaction.customId === "comprar_produto") {

    await interaction.deferReply({ ephemeral: true });

    const produtos = carregarProdutos();
    const key = interaction.values[0];
    const produto = produtos[key];

    if (!produto || produto.estoque.length === 0)
      return interaction.editReply({ content: "❌ Produto esgotado." });

    const categoria = interaction.guild.channels.cache.find(
      c => c.name === "⎯TICKET SUPPORT" && c.type === ChannelType.GuildCategory
    );

    const canal = await interaction.guild.channels.create({
      name: `venda-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: categoria?.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    const confirmar = new ButtonBuilder()
      .setCustomId(`confirmar_${key}`)
      .setLabel("✅ Confirmar Pagamento (Admin)")
      .setStyle(ButtonStyle.Success);

    const cancelar = new ButtonBuilder()
      .setCustomId("cancelar_compra")
      .setLabel("❌ Cancelar")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(confirmar, cancelar);

    await canal.send({
      content:
`🛍️ Produto: ${produto.nome}
💰 Valor: R$${produto.preco}

💳 Chave PIX:
${CHAVE_PIX}

Envie o comprovante no chat.
Após verificar, um admin confirmará.`,
      components: [row]
    });

    interaction.editReply({ content: `🧾 Canal criado: ${canal}` });
  }

  // ===== CONFIRMAR PAGAMENTO =====
  if (interaction.isButton() && interaction.customId.startsWith("confirmar_")) {

    if (!interaction.member.permissions.has("Administrator"))
      return interaction.reply({ content: "Apenas admins confirmam.", ephemeral: true });

    const key = interaction.customId.replace("confirmar_", "");
    const produtos = carregarProdutos();
    const produto = produtos[key];

    if (!produto || produto.estoque.length === 0)
      return interaction.reply({ content: "Sem estoque.", ephemeral: true });

    const item = produto.estoque.shift();
    salvarProdutos(produtos);

    const userId = interaction.channel.permissionOverwrites.cache
      .find(p => p.allow.has(PermissionsBitField.Flags.ViewChannel) && p.id !== interaction.guild.id)?.id;

    if (userId) {
      const membro = await interaction.guild.members.fetch(userId);
      await membro.send(
`✅ Pagamento confirmado!

📦 Produto: ${produto.nome}
🔑 Entrega:
${item}`
      );
    }

    const logs = interaction.guild.channels.cache.find(c => c.name === "logs-vendas");
    if (logs)
      logs.send(`💰 Venda confirmada | ${produto.nome} | Canal: ${interaction.channel.name}`);

    await interaction.reply({ content: "✅ Produto entregue!", ephemeral: true });
  }

  // ===== CANCELAR =====
  if (interaction.isButton() && interaction.customId === "cancelar_compra") {
    await interaction.reply({ content: "❌ Compra cancelada.", ephemeral: true });
    setTimeout(() => interaction.channel.delete(), 3000);
  }

});

client.login(process.env.DISCORD_TOKEN);
