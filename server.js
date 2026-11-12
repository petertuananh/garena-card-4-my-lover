const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const sendSmsOTP = require('./sendSmsOTP');
const { VihatClient, SmsType, VihatError, VihatApiError } = require('vihat-sdk');

// Load configuration
function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  let config = {};
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(raw);
  } catch (err) {
    console.error('Không thể đọc config.json:', err.message);
  }

  // Environment variable overrides
  if (process.env.PORT) config.server = { ...config.server, port: parseInt(process.env.PORT, 10) };
  if (process.env.SPECIAL_DATE) config.auth = { ...config.auth, specialDate: process.env.SPECIAL_DATE };
  if (process.env.LOVER_PHONE) config.lover = { ...config.lover, phone: process.env.LOVER_PHONE };
  if (process.env.LOVER_NAME) config.lover = { ...config.lover, name: process.env.LOVER_NAME };
  if (process.env.API_KEY) config.vihat = { ...config.vihat, apiKey: process.env.API_KEY };
  if (process.env.SECRET_KEY) config.vihat = { ...config.vihat, secretKey: process.env.SECRET_KEY };
  if (process.env.BRANDNAME) config.vihat = { ...config.vihat, brandname: process.env.BRANDNAME };

  return config;
}

let config = loadConfig();

// Helper to normalize card list from config (SECURE: server-side only)
function getCards(cfg) {
  if (Array.isArray(cfg.garenaCards) && cfg.garenaCards.length > 0) {
    return cfg.garenaCards.map((c, idx) => ({
      id: c.id ?? (idx + 1),
      title: c.title || `Thẻ Gà Rán (Garena) #${idx + 1}`,
      denomination: c.denomination || '100.000 VNĐ',
      serial: c.serial || '1000xxxxxxxxxx',
      storyNote: c.storyNote || null,
      cardCode: String(c.cardCode || '').trim(),
      expiryDate: c.expiryDate || '31/12/2028',
    }));
  }
  if (cfg.garenaCard) {
    return [
      {
        id: 1,
        title: 'Thẻ Gà Rán (Garena) #1',
        denomination: cfg.garenaCard.denomination || '100.000 VNĐ',
        serial: cfg.garenaCard.serial || '1000xxxxxxxxxx',
        cardCode: String(cfg.garenaCard.cardCode || '').trim(),
        expiryDate: cfg.garenaCard.expiryDate || '31/12/2028',
      },
    ];
  }
  return [];
}

const app = express();
const PORT = config.server?.port || 2911;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'garrann-jollibee-garena-2911',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 day
  })
);

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Public info API (safe to expose before login)
app.get('/api/public-info', (req, res) => {
  config = loadConfig();
  res.json({
    loverNickname: config.lover?.nickname || 'Khách Hàng VIP',
    loverName: config.lover?.name || 'Bé Yêu',
    brand: config.lover?.fakeVoucher?.brand || 'JOLLIBEE VIỆT NAM',
    dateHint: config.auth?.dateHint || 'Nhập ngày kỷ niệm đặc biệt của đôi ta',
    unlock: config.unlock || { enabled: true, hour: 16, minute: 36 },
    isLoggedIn: !!req.session.authenticated,
  });
});

// Normalize date strings for flexible matching (e.g., "20/10/2023", "20-10-2023", "20102023")
function normalizeDate(str) {
  if (!str) return '';
  return String(str).trim().replace(/[\/\-\.\s]/g, '');
}

// Login with special date
app.post('/api/login', (req, res) => {
  config = loadConfig();
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập mã định danh hội viên (ngày đặc biệt) nha! 🍗',
    });
  }

  const inputNormalized = normalizeDate(password);
  const targetSpecialDate = normalizeDate(config.auth?.specialDate);
  const acceptedList = (config.auth?.acceptedDates || []).map(normalizeDate);

  const isMatch =
    inputNormalized === targetSpecialDate ||
    acceptedList.includes(inputNormalized) ||
    String(password).trim().toLowerCase() === String(config.auth?.specialDate).trim().toLowerCase();

  if (isMatch) {
    req.session.authenticated = true;
    req.session.loginTime = new Date().toISOString();
    return res.json({
      success: true,
      message: 'Xác thực khách hàng VIP thành công! Mở voucher gà rán ngay! 🍗🎉',
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'Mã định danh không chính xác! Em thử nhớ lại ngày đặc biệt của 2 đứa mình xem nè 🥺🍗',
    });
  }
});

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Em cần nhập mã xác thực ngày đặc biệt trước nha! 🔒',
  });
}

// Mask phone number for display (e.g. 0987654321 -> 098***4321)
function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  const start = phone.slice(0, 3);
  const end = phone.slice(-4);
  return `${start}***${end}`;
}

// Protected gift info endpoint
// STRICT SECURITY: cardCode (PIN) IS COMPLETELY EXCLUDED FROM RESPONSE!
app.get('/api/gift-info', requireAuth, (req, res) => {
  config = loadConfig();
  const phone = config.lover?.phone || '';
  const cards = getCards(config);
  const sentCards = req.session.sentCards || {};

  // Calculate total voucher value
  let totalAmount = 0;
  cards.forEach((c) => {
    const num = parseInt(String(c.denomination).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) totalAmount += num;
  });
  const formattedTotal = totalAmount > 0 ? `${totalAmount.toLocaleString('vi-VN')} VNĐ` : '350.000 VNĐ';

  res.json({
    success: true,
    unlock: config.unlock || { enabled: true, hour: 16, minute: 36 },
    lover: {
      name: config.lover?.name || 'Bé Yêu',
      nickname: config.lover?.nickname || 'Khách Hàng VIP',
      phone: phone, // Fixed configured phone
      maskedPhone: maskPhone(phone),
      relationshipStartDate: config.lover?.relationshipStartDate || '2023-10-20',
      fakeVoucher: {
        brand: config.lover?.fakeVoucher?.brand || 'JOLLIBEE VIỆT NAM',
        title: config.lover?.fakeVoucher?.title || 'VOUCHER ĐẶC QUYỀN GÀ RÁN GIÒN VUI VẺ',
        comboDesc:
          config.lover?.fakeVoucher?.comboDesc ||
          'Combo 10 Miếng Gà Giòn Cay + 02 Mì Ý Sốt Bò Bằm Jollibee + 02 Khoai Tây Lắc + 02 Coca Lớn',
        totalValue: formattedTotal,
        trollHeadline: config.lover?.fakeVoucher?.trollHeadline || 'Haha cú lừa thế kỷ! Làm gì có gà rán nào ở đây... 😂🍗👉🎮',
        trollMessage:
          config.lover?.fakeVoucher?.trollMessage ||
          'GÀ RÁN chính là GARENA đó em iu! Anh biết em đang thèm cày rank và tậu skin mới hơn là ăn gà rán đúng hông? Anh tặng em dàn thẻ Garena này để nạp game tẹt ga nhé!',
      },
      loveLetter: config.lover?.loveLetter || {
        title: 'Gửi Ebeee Yêu Dấu Của Anh 💌',
        content: 'Gửi công chúa nhỏ của anh!\n\nCảm ơn em vì đã luôn ở bên anh, mang lại cho anh thật nhiều tiếng cười và niềm hạnh phúc mỗi ngày. Dù đôi lúc anh có hơi ngố, nhưng tình yêu anh dành cho em thì luôn đong đầy và chân thành nhất.\n\nDàn thẻ Gà Rán (Garena) này là món quà nhỏ anh chuẩn bị riêng cho em, chúc công chúa của anh leo rank thật vui, sắm được những bộ skin xịn sò nhất và luôn luôn tươi cười rạng rỡ nhé!\n\nAnh yêu em rất nhiều! 💖✨',
        sender: 'Anh người yêu của em 👑',
        date: 'Mãi mãi bên nhau 💕',
      },
    },
    garenaCards: cards.map((c, index) => {
      const defaultNotes = [
        'Mở màn bằng thẻ đầu tiên nà! Nạp nhẹ nhận kim cương trước nhooo 💎✨',
        'Ủa tưởng hết rồi hả? Vẫn còn nữa nèee! Thẻ này to hơn nhaaa 🔥💖',
        'Trùm cuối xuất hiện! Nạp full combo rinh trọn skin vip luôn nèee 👑🎉',
      ];
      return {
        id: c.id,
        title: c.title,
        denomination: c.denomination,
        serial: c.serial,
        cardCode: c.cardCode, // Full card PIN available to view/copy directly
        expiryDate: c.expiryDate,
        storyNote: c.storyNote || defaultNotes[index % defaultNotes.length],
        isSent: sentCards[c.id] === 'SUCCESS',
        lastSentAt: sentCards[`${c.id}_time`] || null,
      };
    }),
    totalCards: cards.length,
    smsState: {
      lastSentAt: req.session.lastSmsSentAt || null,
      smsDeliveryStatus: req.session.smsDeliveryStatus || null,
    },
  });
});

// Helper function to send single SMS OTP for a card using eSMS SendMultipleMessage_V4_post_json
async function sendCardOtpSms(card, targetPhone, cfg) {
  const brandname = cfg.vihat?.brandname || 'SOFTLAB.VN';
  const apiKey = cfg.vihat?.apiKey || process.env.API_KEY || '';
  const secretKey = cfg.vihat?.secretKey || process.env.SECRET_KEY || '';
  const simulationMode = cfg.vihat?.simulationMode === true || process.env.SIMULATION_MODE === 'true';

  console.log(`[SMS OTP Gà Rán #${card.id}] Gửi thẻ ${card.denomination} tới SĐT cố định: ${targetPhone}...`);

  if (simulationMode) {
    console.log(`[SMS Mode] 🧪 Mô phỏng thành công gửi mã OTP tới ${targetPhone}`);
    return {
      success: true,
      cardId: card.id,
      cardTitle: card.title,
      denomination: card.denomination,
      result: { CodeResult: '100', SMSID: `SIM-${card.id}-${Date.now()}` },
    };
  }

  try {
    const result = await sendSmsOTP(targetPhone.trim(), card.cardCode, {
      apiKey,
      secretKey,
      brandname,
      contentTemplate: cfg.vihat?.contentTemplate,
      timeout: 10000,
    });

    console.log(`[sendCardOtpSms] Thẻ #${card.id} gửi thành công:`, result);
    return {
      success: true,
      cardId: card.id,
      cardTitle: card.title,
      denomination: card.denomination,
      partsCount: result.partsCount || 1,
      message:
        result.partsCount === 2
          ? `Mã thẻ ${card.denomination} gồm 16 số đã được gửi qua 2 tin nhắn SMS OTP (ghép 2 mã lại để nạp nha)! 📲`
          : `Mã nạp thẻ ${card.denomination} đã được gửi trực tiếp tới SMS số điện thoại cố định ${maskPhone(targetPhone)}! 📲`,
      result,
    };
  } catch (err) {
    console.error(`[sendCardOtpSms] Thẻ #${card.id} gửi thất bại:`, err.message);
    return {
      success: false,
      cardId: card.id,
      cardTitle: card.title,
      denomination: card.denomination,
      error: err.message || 'Lỗi gửi tin eSMS',
    };
  }
}

// Protected Send SMS OTP endpoint supporting multiple cards to the fixed phone
app.post('/api/send-sms', requireAuth, async (req, res) => {
  config = loadConfig();
  const now = Date.now();

  // Rate limit cooldown per request (10 seconds)
  const cooldownMs = 10000;
  if (req.session.lastSmsSentAt && now - req.session.lastSmsSentAt < cooldownMs) {
    const remainingSec = Math.ceil((cooldownMs - (now - req.session.lastSmsSentAt)) / 1000);
    return res.status(429).json({
      success: false,
      message: `Em chờ ${remainingSec} giây nữa rồi bấm tiếp nha để nhà mạng không bị nghẽn nhé! ⏳`,
    });
  }

  // FIXED PHONE NUMBER FROM CONFIG
  const fixedPhone = config.lover?.phone;
  if (!fixedPhone) {
    return res.status(400).json({
      success: false,
      message: 'Chưa cấu hình số điện thoại cố định của người yêu trong config.json! ❌',
    });
  }

  const cards = getCards(config);
  if (cards.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Chưa có thẻ Garena nào trong config.json! ❌',
    });
  }

  req.session.sentCards = req.session.sentCards || {};

  const requestedCardId = req.body.cardId;
  let cardsToSend = [];

  if (requestedCardId === 'all' || !requestedCardId) {
    cardsToSend = cards;
  } else {
    const targetCard = cards.find((c) => String(c.id) === String(requestedCardId));
    if (!targetCard) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thẻ Garena yêu cầu! ❌',
      });
    }
    cardsToSend = [targetCard];
  }

  console.log(`[SMS Request] Chuẩn bị gửi ${cardsToSend.length} thẻ đến SĐT cố định: ${fixedPhone}`);

  const results = [];
  let successCount = 0;

  for (const card of cardsToSend) {
    const sendRes = await sendCardOtpSms(card, fixedPhone, config);
    results.push(sendRes);

    if (sendRes.success) {
      successCount++;
      req.session.sentCards[card.id] = 'SUCCESS';
      req.session.sentCards[`${card.id}_time`] = new Date().toISOString();
    } else {
      req.session.sentCards[card.id] = 'FAILED';
    }

    if (cardsToSend.length > 1) {
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  req.session.lastSmsSentAt = now;

  if (successCount > 0) {
    req.session.smsDeliveryStatus = 'SUCCESS';
    return res.json({
      success: true,
      message:
        cardsToSend.length === 1
          ? (results[0]?.message || `Mã nạp thẻ ${cardsToSend[0].denomination} đã được gửi trực tiếp tới SMS số điện thoại cố định ${maskPhone(fixedPhone)}! Em kiểm tra tin nhắn nhé! 📲🍗`)
          : `Đã gửi thành công ${successCount}/${cardsToSend.length} thẻ qua SMS OTP tới số điện thoại cố định ${maskPhone(fixedPhone)}! Em mở tin nhắn xem ngay nhé! 📲🎮`,
      phone: maskPhone(fixedPhone),
      sentCount: successCount,
      totalRequested: cardsToSend.length,
      details: results,
    });
  } else {
    req.session.smsDeliveryStatus = 'FAILED';
    return res.status(502).json({
      success: false,
      message: `Chưa thể gửi SMS tới nhà mạng lúc này. Đừng lo, hãy liên hệ anh yêu để nhận mã hoặc thử lại sau ít phút nhé! 🥺`,
      phone: maskPhone(fixedPhone),
      errorDetail: results[0]?.error || 'Lỗi kết nối tới cổng eSMS',
      details: results,
    });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: 'Đã khóa lại voucher! Hẹn gặp lại em nha 💕' });
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const cards = getCards(config);
  console.log(`=======================================================`);
  console.log(`🍗 Ứng dụng Troll Gà Rán (Garena) đang chạy tại:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`👉 Port: ${PORT}`);
  console.log(`👉 Mật khẩu ngày đặc biệt: ${config.auth?.specialDate}`);
  console.log(`👉 Số điện thoại nhận OTP (cố định): ${config.lover?.phone}`);
  console.log(`👉 Số lượng thẻ: ${cards.length} thẻ`);
  cards.forEach((c) => console.log(`   - [${c.title}] Mệnh giá: ${c.denomination}`));
  console.log(`👉 Bảo mật: Mã nạp (PIN) hoàn toàn KHÔNG gửi về trình duyệt!`);
  console.log(`=======================================================`);
});
