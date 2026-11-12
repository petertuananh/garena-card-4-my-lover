# 💖 Ứng Dụng Tặng Thẻ Garena Cho Người Yêu (Docker + Node.js + eSMS ViHAT)

Trang web lãng mạn, dễ thương được thiết kế riêng để tạo bất ngờ và tặng **nhiều thẻ Garena** cho người yêu với **số điện thoại nhận OTP được cấu hình cố định**.

---

## ✨ Điểm Nổi Bật

- 📱 **Số điện thoại cố định trong cấu hình:**
  - Được cấu hình trực tiếp tại `lover.phone` trong `config.json`.
  - Hệ thống tự động gửi tin nhắn đến số này, không cần người yêu phải nhập tay hay sợ nhầm số.
- 🎁 **Hỗ trợ tặng NHIỀU thẻ Garena cùng lúc:**
  - Cấu hình danh sách nhiều thẻ với các mệnh giá khác nhau (50k, 100k, 200k, 500k,...).
  - Giao diện hiển thị danh sách thẻ VIP Garena Hologram lấp lánh riêng biệt cho từng thẻ.
  - Cho phép người yêu:
    - **Gửi từng thẻ một qua SMS OTP 📲**
    - Hoặc bấm **"Gửi Tất Cả Mã Thẻ Về Điện Thoại (SMS OTP) 🚀"** để hệ thống tự động gửi lần lượt từng mã về tin nhắn máy người yêu.
    - Xem và copy mã nạp (PIN) hoặc số serial trực tiếp trên màn hình nếu muốn nạp ngay tại `napthe.vn`.
- 🎀 **Giao diện tình yêu ngọt ngào, nhiều hiệu ứng:**
  - Canvas mưa trái tim rơi bồng bềnh, vệt trái tim theo con trỏ chuột/chạm tay.
  - Hộp quà 3D biết rung rinh, bung nắp kèm pháo giấy rực rỡ (Confetti) & âm thanh chúc mừng.
  - Bức thư tình viết tay (Love Letter) vintage mở ra lời nhắn nhủ yêu thương.
  - Đồng hồ đếm thời gian bên nhau tự động tính số ngày, giờ, phút, giây.
  - Nút bí mật "Bấm để nhận 1000 nụ hôn 💋".
  - Máy phát nhạc nền tình yêu lofi piano du dương (Web Audio API).
- 🔒 **Đăng nhập bằng ngày đặc biệt:**
  - Nhập ngày kỷ niệm (VD: `20102023`, `20/10/2023`, `20-10-2023`,...).
  - Có nút gợi ý khi người yêu quên.
- 📨 **Gửi OTP qua eSMS ViHAT (`vihat-sdk`):**
  - Brandname: Cấu hình theo Brandname đăng ký của bạn trên eSMS.
  - Hỗ trợ chia tách mã nạp dài (>10 ký tự) thành các tin nhắn OTP hợp lệ theo quy định nhà mạng.

---

## ⚙️ Cấu Hình Thông Tin (`config.json`)

Bạn có thể thêm bớt bao nhiêu thẻ Garena tùy ý trong mảng `garenaCards`:

```json
{
  "server": {
    "port": 2911
  },
  "auth": {
    "specialDate": "20102023",
    "dateHint": "Ngày đầu tiên chúng mình chính thức yêu nhau (ddmmyyyy) 💕",
    "acceptedDates": [
      "20102023",
      "20/10/2023",
      "20-10-2023",
      "20.10.2023",
      "2023-10-20"
    ]
  },
  "lover": {
    "name": "Bé Yêu",
    "nickname": "Công chúa nhỏ của anh 👑",
    "phone": "0987654321",
    "relationshipStartDate": "2023-10-20",
    "loveMessage": "Gửi cô gái xinh đẹp và tuyệt vời nhất của anh! Cảm ơn em vì đã đến và làm cho thế giới của anh trở nên rực rỡ hơn mỗi ngày. Anh biết em thích chơi game và muốn có trang phục mới, nên anh chuẩn bị những món quà nhỏ này tặng em. Chúc em chơi game thật vui vẻ, luôn mỉm cười và mãi yêu anh nhé! Yêu em 3000! 💖✨"
  },
  "garenaCards": [
    {
      "id": 1,
      "title": "Thẻ Garena VIP #1",
      "denomination": "100.000 VNĐ",
      "cardCode": "9823617482910384",
      "serial": "10009482716354",
      "expiryDate": "31/12/2028"
    },
    {
      "id": 2,
      "title": "Thẻ Garena VIP #2",
      "denomination": "200.000 VNĐ",
      "cardCode": "8472918374619283",
      "serial": "10008372615492",
      "expiryDate": "31/12/2028"
    },
    {
      "id": 3,
      "title": "Thẻ Garena VIP #3",
      "denomination": "50.000 VNĐ",
      "cardCode": "7361928475019284",
      "serial": "10007261543829",
      "expiryDate": "31/12/2028"
    }
  ],
  "vihat": {
    "apiKey": "YOUR_ESMS_API_KEY",
    "secretKey": "YOUR_ESMS_SECRET_KEY",
    "brandname": "YOUR_BRANDNAME",
    "baseUrl": "http://api.esms.vn/MainService.svc",
    "contentTemplate": "(YOUR_BRANDNAME): Ma xac thuc OTP cua ban la {{P}}.",
    "simulationMode": false
  }
}
```

---

## 🚀 Quản Lý Với Docker Compose

```bash
# Vào thư mục
cd /root/garena-card-4-my-lover

# Chạy ngầm
docker compose up -d

# Xem log
docker compose logs -f

# Khởi động lại khi cần
docker compose restart
```

Truy cập: **`http://localhost:2911`**
Mật khẩu mẫu: **`20102023`** (hoặc `20/10/2023`).
