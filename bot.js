require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const moment = require('moment-timezone');

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const ownerId = process.env.BOT_OWNER_ID;
const bot = new TelegramBot(token, { polling: true });

const fixedDutyList = ['Nami', 'Giang', 'Long', 'Huệ', 'Chường', 'Vui', 'Tú', 'Khánh', 'Toán', 'Hậu', 'Quỳnh'];

let currentDuty = null;
let currentDutyMessageId = null;

console.log("🚀 Bot started and polling for messages...");

async function remindOwnerToChoose() {
  let options = fixedDutyList.map((name, index) => ([{
    text: name,
    callback_data: `choose_${index}`
  }]));

  if (currentDutyMessageId !== null) {
    try {
      await bot.deleteMessage(chatId, currentDutyMessageId);
      console.log("🗑️ Đã xóa tin nhắc cũ trước khi chọn lại.");
    } catch (err) {
      console.error("❌ Không thể xoá tin nhắc cũ (có thể đã bị xoá tay):", err.message);
    }
    currentDutyMessageId = null;
  }

  bot.sendMessage(ownerId, `🕓 Đến giờ chọn người trực nhật hôm nay.`, {
    reply_markup: { inline_keyboard: options }
  }).then(() => {
    console.log("📩 Gửi nhắc owner chọn người trực thành công.");
  }).catch((err) => {
    console.error("❌ Lỗi khi gửi nhắc owner:", err);
  });
}

bot.on('callback_query', async (query) => {
  const userId = String(query.from.id);
  const data = query.data;

  if (data.startsWith('choose_')) {
    if (userId !== ownerId) {
      return bot.answerCallbackQuery(query.id, {
        text: '🚫 Chỉ owner được chọn người trực.',
        show_alert: true
      });
    }

    const index = parseInt(data.split('_')[1]);
    if (index >= 0 && index < fixedDutyList.length) {
      currentDuty = { name: fixedDutyList[index] };

      const message = `📢 Hôm nay đến lượt *${currentDuty.name}* trực nhật, nhớ thay túi rác khi đổ rác (nếu là thứ 6 hãy tưới nước cho các cây cảnh trong văn phòng).\nNếu bạn vắng, hãy nhấn nút *Vắng mặt* hoặc *Đã trực* nếu đã hoàn thành.`;

      bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Đã trực', callback_data: 'done' },
            { text: '❌ Vắng mặt', callback_data: 'vang' }
          ]]
        }
      }).then((sentMessage) => {
        currentDutyMessageId = sentMessage.message_id;
        console.log(`✅ Đã chọn ${currentDuty.name} và gửi thông báo vào group.`);
      }).catch((err) => {
        console.error("❌ Lỗi khi gửi thông báo vào group:", err);
      });

      await bot.answerCallbackQuery(query.id, { text: `✅ Đã chọn ${currentDuty.name}` });
    }

  } else if (data === 'done' || data === 'vang') {
    if (!currentDuty) return;

    if (data === 'done') {
      const resultText = `✅ *${currentDuty.name}* đã hoàn thành trực nhật.`;
      await bot.sendMessage(ownerId, resultText, { parse_mode: 'Markdown' });

      if (currentDutyMessageId !== null) {
        await bot.deleteMessage(chatId, currentDutyMessageId)
          .then(() => console.log("🗑️ Đã xoá tin nhắc sau khi hoàn thành."))
          .catch((err) => console.error("❌ Xoá tin nhắc thất bại:", err));
        currentDutyMessageId = null;
      }

      currentDuty = null;

    } else if (data === 'vang') {
      const resultText = `❌ *${currentDuty.name}* vắng mặt hôm nay. Vui lòng chọn người khác.`;
      await bot.sendMessage(ownerId, resultText, { parse_mode: 'Markdown' });

      currentDuty = null;
      await remindOwnerToChoose();
    }

    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id
    });

    await bot.answerCallbackQuery(query.id, { text: 'Đã ghi nhận.' });
  }
});

const rule = new schedule.RecurrenceRule();
rule.tz = 'Asia/Ho_Chi_Minh';
rule.hour = 17;
rule.minute = 0;
schedule.scheduleJob(rule, () => remindOwnerToChoose());