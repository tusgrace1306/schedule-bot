require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const moment = require('moment-timezone');

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const ownerId = process.env.BOT_OWNER_ID; // Giữ string, không parseInt
const bot = new TelegramBot(token, { polling: true });

const fixedDutyList = ['Nami', 'Giang', 'Long', 'Huệ', 'Chường', 'Vui', 'Tú', 'Khánh', 'Toán', 'Hậu', 'Quỳnh'];

let currentDuty = null;

console.log("🚀 Bot started and polling for messages...");

async function remindOwnerToChoose() {
  let options = fixedDutyList.map((name, index) => ([{
    text: name,
    callback_data: `choose_${index}`
  }]));

  bot.sendMessage(ownerId, `🕓 Đến giờ chọn người trực nhật hôm nay.`, {
    reply_markup: { inline_keyboard: options }
  }).then(() => {
    console.log("📩 Gửi nhắc owner chọn người trực thành công.");
  }).catch((err) => {
    console.error("❌ Lỗi khi gửi nhắc owner:", err);
  });
}

bot.on('callback_query', async (query) => {
  const userId = String(query.from.id); // So sánh kiểu string
  const data = query.data;

  if (data.startsWith('choose_')) {
    if (userId !== ownerId) {
      console.log("⚠️ Người không phải owner cố chọn người trực.");
      return bot.answerCallbackQuery(query.id, { text: '🚫 Chỉ owner được chọn người trực.', show_alert: true });
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
      }).then(() => {
        console.log(`✅ Đã chọn ${currentDuty.name} và gửi thông báo vào group.`);
      }).catch((err) => {
        console.error("❌ Lỗi khi gửi thông báo vào group:", err);
      });

      await bot.answerCallbackQuery(query.id, { text: `✅ Đã chọn ${currentDuty.name}` });
    }
  } else if (data === 'done' || data === 'vang') {
    if (!currentDuty) {
      console.log("⚠️ Không có currentDuty, bỏ qua callback.");
      return;
    }

    if (data === 'done') {
      const resultText = `✅ *${currentDuty.name}* đã hoàn thành trực nhật.`;
      bot.sendMessage(ownerId, resultText, { parse_mode: 'Markdown' }).then(() => {
        console.log(`📬 Đã gửi kết quả 'hoàn thành' cho owner.`);
      }).catch((err) => {
        console.error("❌ Lỗi khi gửi kết quả cho owner:", err);
      });
    } else if (data === 'vang') {
      const resultText = `❌ *${currentDuty.name}* vắng mặt hôm nay. Vui lòng chọn người khác.`;
      bot.sendMessage(ownerId, resultText, { parse_mode: 'Markdown' }).then(() => {
        console.log(`📬 Đã gửi kết quả 'vắng mặt' cho owner. Đang yêu cầu chọn lại.`);
      }).catch((err) => {
        console.error("❌ Lỗi khi gửi kết quả vắng mặt cho owner:", err);
      });
      currentDuty = null;
      await remindOwnerToChoose();
    }

    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id
    });
    await bot.answerCallbackQuery(query.id, { text: 'Đã ghi nhận.', show_alert: false });
  }
});

const rule = new schedule.RecurrenceRule();
rule.tz = 'Asia/Ho_Chi_Minh';
rule.hour = 17;
rule.minute = 0;
schedule.scheduleJob(rule, () => remindOwnerToChoose());