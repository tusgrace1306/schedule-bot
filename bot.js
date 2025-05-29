// require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const schedule = require('node-schedule');
const moment = require('moment-timezone');

const token = process.env.DISCORD_TOKEN;
const channelId = process.env.DISCORD_CHANNEL_ID;
const ownerId = process.env.DISCORD_OWNER_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const dutyList = ['Nami', 'Giang', 'Long', 'Huệ', 'Chường', 'Vui', 'Tú', 'Khánh', 'Toán', 'Hậu', 'Quỳnh'];
let currentDuty = null;
let currentDutyMessageId = null;

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

function buildButtonRows() {
  const rows = [];
  for (let i = 0; i < dutyList.length; i += 5) {
    const row = new ActionRowBuilder();
    row.addComponents(
      ...dutyList.slice(i, i + 5).map((name, index) =>
        new ButtonBuilder()
          .setCustomId(`choose_${i + index}`)
          .setLabel(name)
          .setStyle(ButtonStyle.Primary)
      )
    );
    rows.push(row);
  }
  return rows;
}

async function remindDuty() {
  try {
    const owner = await client.users.fetch(ownerId);
    if (!owner) return console.error("❌ Không tìm thấy owner");

    const components = buildButtonRows();

    const dmChannel = await owner.createDM();
    const message = await dmChannel.send({
      content: `🕓 Đến giờ chọn người trực nhật hôm nay.`,
      components,
    });

    currentDutyMessageId = message.id;

    console.log("✅ Đã gửi DM nhắc owner chọn người trực");
  } catch (err) {
    console.error("❌ Lỗi khi gửi DM cho owner:", err);
  }
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const { customId, user } = interaction;

  if (customId.startsWith('choose_')) {
    if (user.id !== ownerId) {
      return interaction.reply({ content: '🚫 Chỉ owner được chọn người trực.', ephemeral: true });
    }

    const index = parseInt(customId.split('_')[1]);
    currentDuty = { name: dutyList[index] };

    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('done')
        .setLabel('✅ Đã trực')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('vang')
        .setLabel('❌ Vắng mặt')
        .setStyle(ButtonStyle.Danger),
    );

    const dutyMsg = await interaction.channel.send({
      content: `📢 Hôm nay đến lượt **${currentDuty.name}** trực nhật!\nNhớ thay túi rác, nếu là thứ 6 hãy tưới cây nhé 🌿`,
      components: [confirmRow],
    });

    currentDutyMessageId = dutyMsg.id;
    await interaction.update({ content: `✅ Đã chọn ${currentDuty.name}`, components: [] });
  }

  if (customId === 'done' || customId === 'vang') {
    if (!currentDuty) return;

    if (customId === 'done') {
      await interaction.channel.send(`✅ **${currentDuty.name}** đã hoàn thành trực nhật.`);
    } else if (customId === 'vang') {
      await interaction.channel.send(`❌ **${currentDuty.name}** vắng mặt hôm nay. <@${ownerId}>, vui lòng chọn lại.`);
      await remindDuty();
    }

    currentDuty = null;
    await interaction.message.delete();
    await interaction.reply({ content: 'Đã ghi nhận.', ephemeral: true });
  }
});

const rule = new schedule.RecurrenceRule();
rule.tz = 'Asia/Ho_Chi_Minh';
rule.hour = 17;
rule.minute = 15;

schedule.scheduleJob(rule, remindDuty);

client.login(token);