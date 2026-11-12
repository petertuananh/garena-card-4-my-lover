const axios = require("axios");
const crypto = require("crypto");

/**
 * Gửi một SMS đơn lẻ tới eSMS
 */
async function sendSingleSmsRequest(phone, singleCode, customConfig = {}) {
    const API_KEY = customConfig.apiKey || process.env.API_KEY || "";
    const SECRET_KEY = customConfig.secretKey || process.env.SECRET_KEY || "";
    const BRANDNAME = customConfig.brandname || process.env.BRANDNAME || "SOFTLAB.VN"; 

    // Template chuẩn đã đăng ký trên eSMS (chú ý {P1,10} giới hạn tối đa 10 ký tự):
    const template = customConfig.contentTemplate || "(SOFTLAB.VN): Ma xac thuc OTP cua ban tai iam.softlab.vn la {{P}}. Tuyet doi khong chia se ma nay voi bat ky ai.";
    const content = template
        .replace(/\{\{P\}\}/g, singleCode)
        .replace(/\{\{P1\}\}/g, singleCode)
        .replace(/\$\{otpCode\}/g, singleCode)
        .replace(/\{otpCode\}/g, singleCode);

    const payload = {
        ApiKey: API_KEY,
        SecretKey: SECRET_KEY,
        Phone: phone,
        Content: content,
        Brandname: BRANDNAME,
        SmsType: customConfig.smsType || "2", // 2 là CSKH theo tài liệu eSMS
        IsUnicode: customConfig.isUnicode || "0",
        RequestId: crypto.randomUUID() // Chặn trùng trong 24h
    };

    console.log(`[sendSmsOTP] Đang gửi SMS tới ${phone} (Brand: ${BRANDNAME}, Mã: ${singleCode}, RequestId: ${payload.RequestId})`);
    console.log(`[sendSmsOTP] Nội dung: "${content}"`);

    const response = await axios.post(
        'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/', 
        payload, 
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    if (response.data.CodeResult !== "100") {
        console.error("eSMS Error Response:", response.data);
        throw new Error(`eSMS Error [${response.data.CodeResult}]: ${response.data.ErrorMessage || 'Thất bại'}`);
    }

    return response.data;
}

/**
 * Gửi SMS OTP sử dụng eSMS API
 * Tự động chẻ đôi nếu mã > 10 ký tự (do template eSMS {P1,10} giới hạn tối đa 10 ký tự)
 * @param {string} phone - Số điện thoại nhận (VD: 0901888484)
 * @param {string} otpCode - Mã OTP hoặc mã PIN thẻ Garena (16 số)
 * @param {object} [customConfig] - Cấu hình tùy chọn từ config.json
 */
async function sendSmsOTP(phone, otpCode, customConfig = {}) {
    const rawCode = String(otpCode || '').trim();

    // Template {P1,10} của eSMS chỉ cho phép tối đa 10 ký tự.
    // Nếu mã thẻ là 16 số, tự động chẻ làm 2 tin (mỗi tin 8 số) để đảm bảo 100% thành công!
    if (rawCode.length > 10) {
        const mid = Math.ceil(rawCode.length / 2);
        const part1 = rawCode.slice(0, mid);
        const part2 = rawCode.slice(mid);

        console.log(`[sendSmsOTP] ⚡ Mã PIN ${rawCode.length} số vượt quá giới hạn 10 số của template eSMS. Tự động chia làm 2 phần: [Phần 1: ${part1}] và [Phần 2: ${part2}]`);

        const res1 = await sendSingleSmsRequest(phone, part1, customConfig);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const res2 = await sendSingleSmsRequest(phone, part2, customConfig);

        console.log(`[sendSmsOTP] 🎉 Đã gửi thành công trọn bộ 2 phần mã thẻ tới ${phone}!`);
        return {
            CodeResult: "100",
            partsCount: 2,
            part1: res1,
            part2: res2,
            SMSID: `${res1.SMSID},${res2.SMSID}`
        };
    } else {
        const res = await sendSingleSmsRequest(phone, rawCode, customConfig);
        return {
            CodeResult: "100",
            partsCount: 1,
            ...res
        };
    }
}

module.exports = sendSmsOTP;
