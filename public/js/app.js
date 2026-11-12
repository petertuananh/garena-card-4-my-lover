/**
 * ============================================================================
 * JOLLIBEE GÀ RÁN (GARENA) TROLL EDITION - CLIENT SCRIPT
 * High-craft interaction, Direct PIN Viewing, SMS OTP dispatch, Story Mode & Love Letter
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements - Screen 1 (Auth)
  const loginScreen = document.getElementById('loginScreen');
  const giftScreen = document.getElementById('giftScreen');
  const loginForm = document.getElementById('loginForm');
  const passwordInput = document.getElementById('passwordInput');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const toggleHintBtn = document.getElementById('toggleHintBtn');
  const hintTextBox = document.getElementById('hintTextBox');
  const hintContent = document.getElementById('hintContent');
  const loginErrorMsg = document.getElementById('loginErrorMsg');
  const errorText = document.getElementById('errorText');
  const loginBtn = document.getElementById('loginBtn');
  const loginSpinner = document.getElementById('loginSpinner');
  const loverNameDisplay = document.getElementById('loverNameDisplay');

  // Screen Record Modal Alert
  const recordAlertModal = document.getElementById('recordAlertModal');
  const btnConfirmRecord = document.getElementById('btnConfirmRecord');

  // Elements - Screen 2 (Voucher & Reveal)
  const loverHeaderName = document.getElementById('loverHeaderName');
  const loverHeaderNickname = document.getElementById('loverHeaderNickname');
  const countDays = document.getElementById('countDays');
  const logoutBtn = document.getElementById('logoutBtn');

  // Fake Voucher
  const fakeVoucherCard = document.getElementById('fakeVoucherCard');
  const voucherComboDesc = document.getElementById('voucherComboDesc');
  const voucherTotalValue = document.getElementById('voucherTotalValue');
  const btnRedeemVoucher = document.getElementById('btnRedeemVoucher');
  const btnRedeemText = document.getElementById('btnRedeemText');
  const voucherCountdownBox = document.getElementById('voucherCountdownBox');
  const countdownTitle = document.getElementById('countdownTitle');
  const cdHours = document.getElementById('cdHours');
  const cdMinutes = document.getElementById('cdMinutes');
  const cdSeconds = document.getElementById('cdSeconds');
  const cdWhisper = document.getElementById('cdWhisper');

  // Troll Reveal & Story Player
  const trollRevealSection = document.getElementById('trollRevealSection');
  const trollHeadline = document.getElementById('trollHeadline');
  const trollMessage = document.getElementById('trollMessage');
  const fixedPhoneText = document.getElementById('fixedPhoneText');

  // Story Player Elements
  const storyProgressBarContainer = document.getElementById('storyProgressBarContainer');
  const storyStepTag = document.getElementById('storyStepTag');
  const storyProgressSub = document.getElementById('storyProgressSub');
  const storySlideCounter = document.getElementById('storySlideCounter');
  const storyViewport = document.getElementById('storyViewport');
  const storyCardSlide = document.getElementById('storyCardSlide');
  const storySummarySlide = document.getElementById('storySummarySlide');
  const summaryCardsList = document.getElementById('summaryCardsList');
  const btnStoryPrev = document.getElementById('btnStoryPrev');
  const btnStoryNext = document.getElementById('btnStoryNext');
  const storyDotNav = document.getElementById('storyDotNav');
  const btnReplayStory = document.getElementById('btnReplayStory');

  // Love Letter & Summary Actions
  const loveLetterTitle = document.getElementById('loveLetterTitle');
  const loveLetterContent = document.getElementById('loveLetterContent');
  const loveLetterDate = document.getElementById('loveLetterDate');
  const loveLetterSender = document.getElementById('loveLetterSender');
  const btnCopyAllPins = document.getElementById('btnCopyAllPins');

  // Audio & Toast
  const audioToggleBtn = document.getElementById('audioToggleBtn');
  const soundLabel = document.getElementById('soundLabel');
  const statusToast = document.getElementById('statusToast');
  const toastMessage = document.getElementById('toastMessage');

  // State
  let garenaCards = [];
  let currentStoryIndex = 0; // 0 to garenaCards.length - 1: Card slides; garenaCards.length: Summary Slide
  let loveCounterInterval = null;
  let relationshipStartDate = new Date();
  let isSmsCooldown = false;
  let isSoundEnabled = true;
  let isVoucherUnlocked = false;
  let countdownInterval = null;
  let unlockConfig = { enabled: true, hour: 16, minute: 36 };
  const pinVisibleMap = {}; // Tracks which card PINs are revealed on screen

  // ==========================================================================
  // 1. SIMPLE CLEAN AUDIO SYNTH (Zero external files)
  // ==========================================================================
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, duration = 0.25, type = 'sine', gainVal = 0.08) {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio not supported or blocked
    }
  }

  function playTrollRevealFanfare() {
    if (!isSoundEnabled) return;
    const notes = [
      { f: 261.63, d: 0.12 },
      { f: 329.63, d: 0.12 },
      { f: 392.00, d: 0.15 },
      { f: 523.25, d: 0.35 },
    ];
    let time = 0;
    notes.forEach((n) => {
      setTimeout(() => playTone(n.f, n.d, 'triangle', 0.12), time);
      time += n.d * 1000 * 0.85;
    });
  }

  audioToggleBtn.addEventListener('click', () => {
    isSoundEnabled = !isSoundEnabled;
    audioToggleBtn.classList.toggle('active', isSoundEnabled);
    soundLabel.textContent = isSoundEnabled ? 'Bật Âm' : 'Tắt Âm';
    showToast(isSoundEnabled ? 'Đã bật hiệu ứng âm thanh' : 'Đã tắt hiệu ứng âm thanh');
  });

  // ==========================================================================
  // 2. TOAST NOTIFICATION HELPER & CLIPBOARD
  // ==========================================================================
  let toastTimer = null;
  function showToast(msg) {
    toastMessage.textContent = msg;
    statusToast.classList.remove('hidden');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      statusToast.classList.add('hidden');
    }, 2800);
  }

  window.copyText = async function (text, label = 'mã') {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Đã sao chép ${label}: ${text}`);
      playTone(600, 0.15, 'sine', 0.05);
    } catch {
      showToast(`Đã chọn: ${text}`);
    }
  };

  // Toggle PIN visibility for a card
  window.togglePinView = function (cardId) {
    pinVisibleMap[cardId] = !pinVisibleMap[cardId];
    playTone(pinVisibleMap[cardId] ? 587.33 : 440, 0.15, 'sine', 0.05);
    renderStorySlide(currentStoryIndex);
  };

  // ==========================================================================
  // 3. SCREEN RECORD PROMPT MODAL
  // ==========================================================================
  function showRecordPrompt() {
    if (!recordAlertModal) return;
    recordAlertModal.classList.remove('hidden');
    playTone(523.25, 0.2, 'sine', 0.1);
    setTimeout(() => playTone(659.25, 0.3, 'sine', 0.1), 160);
  }

  function hideRecordPrompt() {
    if (!recordAlertModal) return;
    recordAlertModal.classList.add('hidden');
    playTone(784, 0.2, 'sine', 0.08);
  }

  btnConfirmRecord?.addEventListener('click', () => {
    hideRecordPrompt();
    showToast('Bắt đầu mở voucher gà rán thôi nào! 🍗✨');
  });

  // ==========================================================================
  // 4. FETCH PUBLIC INFO & AUTO LOGIN CHECK
  // ==========================================================================
  async function fetchPublicInfo() {
    try {
      const res = await fetch('/api/public-info');
      const data = await res.json();

      if (data.loverName) loverNameDisplay.textContent = data.loverName;
      if (data.dateHint) hintContent.textContent = data.dateHint;

      if (data.isLoggedIn) {
        loadGiftInfo();
      }
    } catch (err) {
      console.warn('Không thể tải public-info:', err);
    }
  }

  fetchPublicInfo();

  // Clear Input button
  clearInputBtn.addEventListener('click', () => {
    passwordInput.value = '';
    passwordInput.focus();
    clearInputBtn.style.display = 'none';
  });

  passwordInput.addEventListener('input', () => {
    clearInputBtn.style.display = passwordInput.value.length > 0 ? 'block' : 'none';
    loginErrorMsg.classList.add('hidden');
  });

  // Toggle Hint Dialog
  toggleHintBtn.addEventListener('click', () => {
    hintTextBox.classList.toggle('hidden');
    playTone(440, 0.1, 'sine', 0.03);
  });

  // ==========================================================================
  // 5. LOGIN FORM SUBMISSION
  // ==========================================================================
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = passwordInput.value.trim();
    if (!password) return;

    loginBtn.disabled = true;
    loginSpinner.classList.remove('hidden');
    loginErrorMsg.classList.add('hidden');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Show the lover's recording reminder modal on new login!
        showRecordPrompt();
        loadGiftInfo();
      } else {
        loginErrorMsg.classList.remove('hidden');
        errorText.textContent = data.message || 'Mật mã chưa đúng nè em ơi! 🥺';
        passwordInput.focus();
      }
    } catch (err) {
      loginErrorMsg.classList.remove('hidden');
      errorText.textContent = 'Lỗi kết nối máy chủ, thử lại nha!';
    } finally {
      loginBtn.disabled = false;
      loginSpinner.classList.add('hidden');
    }
  });

  // ==========================================================================
  // 6. LOAD GIFT INFO & LOVE LETTER
  // ==========================================================================
  async function loadGiftInfo() {
    try {
      const res = await fetch('/api/gift-info');
      const data = await res.json();

      if (!res.ok || !data.success) {
        loginScreen.classList.add('active');
        giftScreen.classList.remove('active');
        return;
      }

      loginScreen.classList.remove('active');
      giftScreen.classList.add('active');

      const lover = data.lover || {};
      loverHeaderName.textContent = lover.name || 'Bé Yêu';
      loverHeaderNickname.textContent = lover.nickname || 'Khách Hàng VIP';

      // Fixed Phone
      fixedPhoneText.textContent = lover.maskedPhone || lover.phone || '084***6869';

      // Relationship Counter
      if (lover.relationshipStartDate) {
        relationshipStartDate = new Date(lover.relationshipStartDate);
        startLoveCounter();
      }

      // Populate Fake Jollibee Voucher
      const voucher = lover.fakeVoucher || {};
      if (voucher.comboDesc) voucherComboDesc.textContent = voucher.comboDesc;
      if (voucher.totalValue) voucherTotalValue.textContent = voucher.totalValue;
      if (voucher.trollHeadline) trollHeadline.textContent = voucher.trollHeadline;
      if (voucher.trollMessage) trollMessage.textContent = voucher.trollMessage;

      // Populate Love Letter
      const letter = lover.loveLetter || {};
      if (loveLetterTitle && letter.title) loveLetterTitle.textContent = letter.title;
      if (loveLetterContent && letter.content) loveLetterContent.textContent = letter.content;
      if (loveLetterDate && letter.date) loveLetterDate.textContent = letter.date;
      if (loveLetterSender && letter.sender) loveLetterSender.textContent = letter.sender;

      // Check countdown unlock time (theo giờ trình duyệt)
      if (data.unlock) {
        unlockConfig = data.unlock;
      }
      const targetTime = getTargetUnlockTime(unlockConfig.hour ?? 16, unlockConfig.minute ?? 36);
      if (unlockConfig.enabled === false || new Date() >= targetTime) {
        setVoucherUnlocked(true);
      } else {
        setVoucherUnlocked(false);
        startVoucherCountdown(targetTime);
      }

      // Populate Garena Cards & Init Story Player
      garenaCards = data.garenaCards || [];
      initStoryPlayer();
    } catch (err) {
      console.error('Lỗi tải thông tin voucher:', err);
    }
  }

  // Days Counter
  function startLoveCounter() {
    clearInterval(loveCounterInterval);
    function update() {
      const diff = new Date() - relationshipStartDate;
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        countDays.textContent = days;
      }
    }
    update();
    loveCounterInterval = setInterval(update, 60000);
  }

  // ==========================================================================
  // 6.5 COUNTDOWN UNLOCK CONTROLLER (Theo Giờ Trình Duyệt)
  // ==========================================================================
  function getTargetUnlockTime(hour = 16, minute = 36) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  }

  function setVoucherUnlocked(unlocked) {
    isVoucherUnlocked = unlocked;
    if (unlocked) {
      if (voucherCountdownBox) voucherCountdownBox.classList.add('ready');
      if (countdownTitle) countdownTitle.textContent = '🎉 ĐÃ ĐẾN GIỜ (16:36)! BẤM MỞ NGAY NÀO!';
      if (cdWhisper) cdWhisper.textContent = 'Giờ hoàng đạo đã điểm! Bấm nút bên dưới để nhận bất ngờ nhé công chúa! 🍗✨';
      if (cdHours) cdHours.textContent = '00';
      if (cdMinutes) cdMinutes.textContent = '00';
      if (cdSeconds) cdSeconds.textContent = '00';
      if (btnRedeemVoucher) {
        btnRedeemVoucher.classList.remove('locked');
        btnRedeemVoucher.classList.add('unlocked');
      }
      if (btnRedeemText) btnRedeemText.textContent = 'ĐỔI VOUCHER ĂN GÀ NGAY 🍗✨';
    } else {
      if (voucherCountdownBox) voucherCountdownBox.classList.remove('ready');
      if (countdownTitle) countdownTitle.textContent = 'VOUCHER KÍCH HOẠT VÀO ĐÚNG 4H36 CHIỀU (16:36)';
      if (cdWhisper) cdWhisper.textContent = 'Đúng 4h36 chiều nay voucher mới kích hoạt nha công chúa! Đợi cùng anh nhé 🥰💕';
      if (btnRedeemVoucher) {
        btnRedeemVoucher.classList.add('locked');
        btnRedeemVoucher.classList.remove('unlocked');
      }
      if (btnRedeemText) btnRedeemText.textContent = '🔒 CHƯA ĐẾN 4H36 (ĐỢI CÙNG ANH NHÉ)';
    }
  }

  function startVoucherCountdown(targetTime) {
    clearInterval(countdownInterval);
    function tick() {
      const now = new Date();
      const diff = targetTime.getTime() - now.getTime();
      if (diff <= 0) {
        clearInterval(countdownInterval);
        setVoucherUnlocked(true);
        playTrollRevealFanfare();
        showToast('🎉 Đã đến đúng 4h36 rồi! Bấm mở voucher ngay nha ebee! 🍗✨');
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      if (cdHours) cdHours.textContent = String(h).padStart(2, '0');
      if (cdMinutes) cdMinutes.textContent = String(m).padStart(2, '0');
      if (cdSeconds) cdSeconds.textContent = String(s).padStart(2, '0');
    }
    tick();
    countdownInterval = setInterval(tick, 1000);
  }

  // ==========================================================================
  // 7. THE TROLL REVEAL TRIGGER
  // ==========================================================================
  btnRedeemVoucher.addEventListener('click', () => {
    // Check if 16:36 browser time has arrived
    if (!isVoucherUnlocked) {
      btnRedeemVoucher.classList.add('shake');
      setTimeout(() => btnRedeemVoucher.classList.remove('shake'), 450);
      playTone(349.23, 0.2, 'sawtooth', 0.06);
      showToast('Chưa đến đúng 4h36 nè ebee ơii! Hãy kiên nhẫn đợi cùng anh đến đúng 16:36 nhaaa! ⏳💕');
      return;
    }

    playTrollRevealFanfare();

    // Trigger comedic shake and reveal
    fakeVoucherCard.style.transition = 'all 0.4s ease';
    fakeVoucherCard.style.transform = 'scale(0.96) rotate(-2deg)';
    fakeVoucherCard.style.opacity = '0.4';

    setTimeout(() => {
      fakeVoucherCard.classList.add('hidden');
      trollRevealSection.classList.remove('hidden');
      showToast('Haha cú lừa! GÀ RÁN là GARENA đó em êu! 🍗👉🎮');

      // Reset story to card 0
      currentStoryIndex = 0;
      renderStorySlide(0);

      trollRevealSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
  });

  // ==========================================================================
  // 8. INTERACTIVE STORY PLAYER CONTROLLER
  // ==========================================================================
  function initStoryPlayer() {
    if (!garenaCards.length) return;

    // Build Progress Bar Segments (one segment per card)
    storyProgressBarContainer.innerHTML = '';
    for (let i = 0; i < garenaCards.length; i++) {
      const seg = document.createElement('div');
      seg.className = 'story-bar-segment';
      seg.setAttribute('data-index', i);
      seg.addEventListener('click', () => {
        goToStory(i);
      });
      storyProgressBarContainer.appendChild(seg);
    }

    // Build Dot Nav (one dot per card + 1 summary dot)
    storyDotNav.innerHTML = '';
    for (let i = 0; i <= garenaCards.length; i++) {
      const dot = document.createElement('div');
      dot.className = 'story-dot';
      dot.setAttribute('data-index', i);
      dot.addEventListener('click', () => {
        goToStory(i);
      });
      storyDotNav.appendChild(dot);
    }

    renderStorySlide(currentStoryIndex);
  }

  function renderStorySlide(index) {
    if (!garenaCards.length) return;

    // Clamp index between 0 and garenaCards.length (Summary slide)
    if (index < 0) index = 0;
    if (index > garenaCards.length) index = garenaCards.length;
    currentStoryIndex = index;

    // Update Progress Bar Segments
    const segments = storyProgressBarContainer.querySelectorAll('.story-bar-segment');
    segments.forEach((seg, sIdx) => {
      seg.classList.remove('active', 'completed');
      if (sIdx < index) {
        seg.classList.add('completed');
      } else if (sIdx === index) {
        seg.classList.add('active');
      }
    });

    // Update Dot Nav
    const dots = storyDotNav.querySelectorAll('.story-dot');
    dots.forEach((dot, dIdx) => {
      dot.classList.toggle('active', dIdx === index);
    });

    // CASE A: Single Card Slide (index < garenaCards.length)
    if (index < garenaCards.length) {
      storyCardSlide.classList.remove('hidden');
      storySummarySlide.classList.add('hidden');

      const card = garenaCards[index];
      const isSent = !!card.isSent;
      const isPinRevealed = !!pinVisibleMap[card.id];

      storyStepTag.textContent = `HỘP QUÀ #${index + 1} / ${garenaCards.length}`;
      storyProgressSub.textContent = `Chạm để mở thẻ số #${index + 1} nè! ✨`;
      storySlideCounter.textContent = `${index + 1} / ${garenaCards.length}`;

      storyCardSlide.innerHTML = `
        <div class="story-card-frame" id="card-${card.id}">
          <div class="story-card-badge-row">
            <span class="story-garena-logo-pill">🎮 GARENA PREMIER VIP</span>
            <span class="story-card-serial-badge">MÓN QUÀ #${index + 1}</span>
          </div>

          <div class="story-card-hero-denom">
            <div class="story-card-title-text">${card.title || `Thẻ Garena #${index + 1}`}</div>
            <div class="story-card-amount">${card.denomination}</div>
          </div>

          <!-- Sweet Whisper Quote for this card -->
          <div class="story-whisper-bubble">
            <span class="whisper-icon">💌</span>
            <span class="whisper-text">"${card.storyNote || 'Tặng công chúa nạp game tẹt ga nhé!'}"</span>
          </div>

          <!-- Card Specs: Serial & PIN (Direct view + copy) -->
          <div class="story-card-specs-box">
            <div class="story-spec-row">
              <span class="story-spec-label">SỐ SERIAL:</span>
              <div class="story-spec-value-group">
                <code class="story-code-font">${card.serial}</code>
                <button class="btn-story-copy" onclick="copyText('${card.serial}', 'Số Serial')">Copy</button>
              </div>
            </div>
            
            <div class="story-spec-row">
              <span class="story-spec-label">MÃ THẺ (PIN):</span>
              <div class="story-spec-value-group">
                <code class="story-code-font" style="color: #f59e0b; letter-spacing: 1px;">
                  ${isPinRevealed ? card.cardCode : '•••• •••• •••• ••••'}
                </code>
                <button class="btn-toggle-eye" onclick="togglePinView(${card.id})" title="${isPinRevealed ? 'Ẩn mã nạp' : 'Xem mã nạp'}">
                  ${isPinRevealed ? '🙈 Ẩn' : '👁️ Xem'}
                </button>
                <button class="btn-story-copy" onclick="copyText('${card.cardCode}', 'Mã nạp (PIN)')">Copy</button>
              </div>
            </div>
          </div>

          <!-- Single card SMS OTP button -->
          <button 
            class="btn-story-send-sms ${isSent ? 'sent' : ''}" 
            id="btn-sms-${card.id}" 
            onclick="sendSingleCardSms(${card.id})"
          >
            <span>${
              isSent
                ? '✓ ĐÃ GỬI VỀ SĐT (BẤM ĐỂ GỬI LẠI) 📲'
                : `GỬI MÃ THẺ (${card.denomination}) QUA SMS OTP 📲`
            }</span>
          </button>
        </div>
      `;

      btnStoryPrev.disabled = (index === 0);
      btnStoryNext.disabled = false;
      btnStoryNext.innerHTML = (index === garenaCards.length - 1)
        ? '<span>Xem thư tình & tổng kết 🏆 →</span>'
        : '<span>Mở thẻ tiếp theo 🎁 →</span>';

    } else {
      // CASE B: Summary Finale Slide (index === garenaCards.length)
      storyCardSlide.classList.add('hidden');
      storySummarySlide.classList.remove('hidden');

      // Highlight all segments as completed
      segments.forEach((seg) => {
        seg.classList.remove('active');
        seg.classList.add('completed');
      });

      storyStepTag.textContent = '🏆 TRỌN BỘ QUÀ TẶNG';
      storyProgressSub.textContent = 'Chúc công chúa có những giờ leo rank vui vẻ! 💕';
      storySlideCounter.textContent = 'Hoàn thành';

      // Populate summary rich cards list (Serial + full PIN + copy buttons)
      summaryCardsList.innerHTML = garenaCards
        .map((c, cIdx) => `
          <div class="summary-card-row">
            <div class="summary-card-header">
              <span class="summary-card-name">${c.title || `Thẻ #${cIdx + 1}`}</span>
              <div class="summary-card-denom-group">
                <strong class="summary-card-denom">${c.denomination}</strong>
                <span class="summary-status-pill ${c.isSent ? 'sent' : 'unsent'}">
                  ${c.isSent ? '✓ Đã gửi SMS' : 'Chưa gửi SMS'}
                </span>
              </div>
            </div>

            <div class="summary-codes-box">
              <div class="summary-code-item">
                <span class="summary-code-caption">Serial:</span>
                <div class="summary-code-actions">
                  <code class="summary-code-val">${c.serial}</code>
                  <button class="btn-mini-action" onclick="copyText('${c.serial}', 'Số Serial')">Copy</button>
                </div>
              </div>
              <div class="summary-code-item">
                <span class="summary-code-caption">Mã PIN:</span>
                <div class="summary-code-actions">
                  <code class="summary-code-val pin">${c.cardCode}</code>
                  <button class="btn-mini-action" onclick="copyText('${c.cardCode}', 'Mã PIN')">Copy</button>
                </div>
              </div>
            </div>
          </div>
        `)
        .join('');

      btnStoryPrev.disabled = false;
      btnStoryNext.disabled = true;
      btnStoryNext.innerHTML = '<span>Đã mở hết quà 🎉</span>';
    }
  }

  function nextStory() {
    if (currentStoryIndex < garenaCards.length) {
      currentStoryIndex++;
      playTone(480 + currentStoryIndex * 40, 0.2, 'triangle', 0.08);
      renderStorySlide(currentStoryIndex);
    }
  }

  function prevStory() {
    if (currentStoryIndex > 0) {
      currentStoryIndex--;
      playTone(400, 0.15, 'sine', 0.05);
      renderStorySlide(currentStoryIndex);
    }
  }

  function goToStory(idx) {
    if (idx >= 0 && idx <= garenaCards.length) {
      currentStoryIndex = idx;
      playTone(440, 0.15, 'sine', 0.06);
      renderStorySlide(currentStoryIndex);
    }
  }

  btnStoryNext.addEventListener('click', nextStory);
  btnStoryPrev.addEventListener('click', prevStory);
  btnReplayStory?.addEventListener('click', () => {
    currentStoryIndex = 0;
    playTone(523.25, 0.2, 'sine', 0.08);
    renderStorySlide(0);
  });

  // Copy all 11 PINs in one tap
  btnCopyAllPins?.addEventListener('click', () => {
    const allPinsText = garenaCards
      .map((c, i) => `${i + 1}. [${c.denomination}] Serial: ${c.serial} | PIN: ${c.cardCode}`)
      .join('\n');
    copyText(allPinsText, 'Toàn bộ 11 mã nạp');
  });

  // Touch Gesture Swipes on Mobile
  let touchStartX = 0;
  let touchEndX = 0;

  storyViewport?.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  storyViewport?.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 45) {
      if (diff < 0) {
        // Swipe left -> Next story
        nextStory();
      } else {
        // Swipe right -> Prev story
        prevStory();
      }
    }
  }

  // Keyboard navigation (Left / Right Arrow)
  window.addEventListener('keydown', (e) => {
    if (trollRevealSection && !trollRevealSection.classList.contains('hidden')) {
      if (e.key === 'ArrowRight') {
        nextStory();
      } else if (e.key === 'ArrowLeft') {
        prevStory();
      }
    }
  });

  // ==========================================================================
  // 9. SEND SINGLE CARD SMS OTP
  // ==========================================================================
  window.sendSingleCardSms = async function (cardId) {
    if (isSmsCooldown) return;

    const card = garenaCards.find((c) => c.id === cardId);
    if (!card) return;

    const btn = document.getElementById(`btn-sms-${cardId}`);
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>Đang gửi mã qua SMS OTP...</span>`;
    }

    try {
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        playTone(659.25, 0.35, 'triangle', 0.1);
        showToast(data.message || `Đã gửi mã thẻ ${card.denomination} qua SMS OTP! 📱`);
        card.isSent = true;
        renderStorySlide(currentStoryIndex);
      } else {
        showToast(data.message || 'Chưa thể gửi SMS');
        renderStorySlide(currentStoryIndex);
      }
    } catch (err) {
      showToast('Lỗi kết nối khi gửi SMS. Em thử lại nhé!');
      renderStorySlide(currentStoryIndex);
    } finally {
      startSmsCooldown(10);
    }
  };

  function startSmsCooldown(seconds) {
    isSmsCooldown = true;
    setTimeout(() => {
      isSmsCooldown = false;
    }, seconds * 1000);
  }

  // ==========================================================================
  // 10. LOGOUT
  // ==========================================================================
  logoutBtn.addEventListener('click', async () => {
    if (confirm('Em có muốn khóa lại voucher không? 💕')) {
      try {
        await fetch('/api/logout', { method: 'POST' });
        clearInterval(loveCounterInterval);
        loginScreen.classList.add('active');
        giftScreen.classList.remove('active');
        fakeVoucherCard.classList.remove('hidden');
        trollRevealSection.classList.add('hidden');
        fakeVoucherCard.style.opacity = '1';
        fakeVoucherCard.style.transform = 'none';
        passwordInput.value = '';
        currentStoryIndex = 0;
        showToast('Đã khóa lại voucher!');
      } catch (err) {
        window.location.reload();
      }
    }
  });
});
