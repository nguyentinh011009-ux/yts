let googleUser = null;
let targetStudentDocId = null;
let foundStudentData = null;
let generatedEmailOTP = "";
let phoneConfirmationResult = null; 
let redirectTarget = "student.html";
let recaptchaVerifier = null;
let smsRecaptchaVerifier = null;


// Cấu hình quản lý Trạng thái Rate Limit OTP cá nhân trên trình duyệt
const STORAGE_KEY = "vts_otp_limit_state";

function getOTPLimitState() {
    const defaultState = { count: 0, lockoutUntil: 0 };
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.warn("Lỗi đọc trạng thái OTP từ trình duyệt:", e);
    }
    return defaultState;
}

function saveOTPLimitState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn("Lỗi lưu trạng thái OTP:", e);
    }
}

// Kiểm tra giới hạn gửi lại mã của cá nhân
function checkOTPLimit() {
    const state = getOTPLimitState();
    const now = Date.now();
    
    if (state.lockoutUntil && now < state.lockoutUntil) {
        const remainingHours = Math.ceil((state.lockoutUntil - now) / (1000 * 60 * 60));
        alert(`Bạn đã gửi yêu cầu quá 3 lần. Nhằm bảo mật hệ thống, vui lòng thử lại sau ${remainingHours} giờ.`);
        return false;
    }
    return true;
}

// Ghi nhận lần gửi OTP cá nhân thành công và áp dụng khóa nếu vượt mức
function recordOTPSent() {
    const state = getOTPLimitState();
    state.count += 1;
    if (state.count >= 3) {
        state.lockoutUntil = Date.now() + (24 * 60 * 60 * 1000); // Khóa 24 giờ tiếp theo
        state.count = 0;
    }
    saveOTPLimitState(state);
}

// Khởi tạo bộ đếm lùi thời gian cho các nút gửi lại mã
function startCooldownTimer(buttonId) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    let secondsLeft = 120; // 2 phút chờ
    btn.disabled = true;
    btn.innerText = `Gửi lại mã OTP (${secondsLeft}s)`;
    
    const interval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
            clearInterval(interval);
            btn.disabled = false;
            btn.innerText = "Gửi lại mã OTP";
        } else {
            btn.innerText = `Gửi lại mã OTP (${secondsLeft}s)`;
        }
    }, 1000);
}

// Hàm kiểm tra và cộng dồn hạn ngạch SMS toàn hệ thống (Giới hạn 10 tin/ngày)
async function checkAndIncrementSMSQuota() {
    const todayStr = new Date().toLocaleDateString('sv-SE'); // Định dạng chuẩn YYYY-MM-DD
    const docRef = db.collection('yt_settings').doc('sms_quota');
    
    try {
        const doc = await docRef.get();
        let count = 0;
        
        if (doc.exists) {
            const data = doc.data();
            if (data.date === todayStr) {
                count = data.count || 0;
            }
        }
        
        if (count >= 10) {
            alert("⚠️ THÔNG BÁO QUAN TRỌNG:\nHệ thống gửi tin xác thực SMS tự động hôm nay đã đạt giới hạn tối đa (10 tin/ngày).\n\nVui lòng xem hướng dẫn lấy mã qua ứng dụng VnEdu Connect có sẵn ngay trên trang web này hoặc quay lại thực hiện vào ngày mai!");
            // Tự động chuyển tab sang hướng dẫn VnEdu có sẵn trên hệ thống
            switchRecoveryTab('vnedu');
            return false;
        }
        
        // Ghi nhận và cộng dồn lượt gửi trong ngày lên Firestore
        await docRef.set({
            date: todayStr,
            count: count + 1
        }, { merge: true });
        
        return true;
    } catch (err) {
        console.warn("Lỗi kiểm tra hạn ngạch hệ thống: ", err);
        // Nếu có lỗi phân quyền bảo mật, cho phép đi tiếp để không khóa cứng đăng nhập
        return true; 
    }
}

// Hàm bổ trợ phân tích ngày tháng an toàn tránh lỗi lệch định dạng chuỗi
function safeParseDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    
    let parts = String(dateStr).split(/[\/\-]/);
    if (parts.length === 3) {
        if (parts[0].length === 4) {
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else if (parts[2].length === 4) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
    }
    let parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function compareDates(dateStr1, dateStr2) {
    const d1 = safeParseDate(dateStr1);
    const d2 = safeParseDate(dateStr2);
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');
    if (redirectParam) {
        redirectTarget = decodeURIComponent(redirectParam);
    }
    
    loadMasterCryptoKey().catch(err => {
        console.warn("Không thể tải khóa giải mã bảo mật:", err);
    });
});

function goToStep(stepNum) {
    document.querySelectorAll('.login-step').forEach(step => step.classList.remove('active'));
    document.getElementById(`step-${stepNum}`).classList.add('active');
}

// --- BƯỚC 1: ĐĂNG NHẬP GOOGLE ---
async function handleGoogleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const btn = document.getElementById('btn-google');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xác thực...';

    try {
        const result = await firebase.auth().signInWithPopup(provider);
        googleUser = result.user;
        
        const snap = await db.collection('yt_students').where('linkedEmail', '==', googleUser.email).get();
        
        if (!snap.empty) {
            window.location.href = redirectTarget;
        } else {
            document.getElementById('display-email').innerText = googleUser.email;
            goToStep(2);
        }
    } catch (err) {
        console.error("Lỗi đăng nhập Google:", err);
        alert("Đăng nhập thất bại: " + err.message);
        btn.disabled = false;
        btn.innerHTML = '<img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google"> Đăng nhập bằng Google';
    }
}

// --- BƯỚC 2: KIỂM TRA MÃ ĐỊNH DANH HỌC SINH ---
async function verifyStudentCode() {
    const code = document.getElementById('student-code-input').value.trim();
    if (!code) return alert("Vui lòng nhập Mã học sinh hoặc Mã y tế!");

    try {
        let queryById = await db.collection('yt_students').doc(code).get();
        let queryByCode = await db.collection('yt_students').where('studentCode', '==', code).get();

        if (queryById.exists) {
            targetStudentDocId = queryById.id;
            foundStudentData = queryById.data();
        } else if (!queryByCode.empty) {
            targetStudentDocId = queryByCode.docs[0].id;
            foundStudentData = queryByCode.docs[0].data();
        } else {
            return alert("Không tìm thấy hồ sơ khớp với mã bạn nhập.");
        }

        if (foundStudentData.linkedEmail) {
            return alert(`Hồ sơ đã được liên kết với: ${foundStudentData.linkedEmail}. Vui lòng liên hệ Phòng Y Tế để được hỗ trợ.`);
        }

        if (!checkOTPLimit()) return;

        initRecaptcha();
        goToStep(3);
        sendEmailOTP();

    } catch (err) {
        alert("Lỗi kiểm tra thông tin: " + err.message);
    }
}

function initRecaptcha() {
    if (recaptchaVerifier) return;
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible',
        'callback': (response) => {}
    });
    recaptchaVerifier.render();
}

// --- BƯỚC 3: GỬI VÀ XÁC MINH OTP EMAIL ---
async function sendEmailOTP() {
    generatedEmailOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    const emailTarget = googleUser.email;
    const studentName = foundStudentData ? foundStudentData.name : "Học sinh";

    // 1. TỰ SOẠN TIÊU ĐỀ VÀ NỘI DUNG EMAIL TẠI ĐÂY
    const mailSubject = `[Trường Trung học Phổ thông Võ Thị Sáu - Bà Rịa - Vũng Tàu] - Mã xác minh OTP liên kết hồ sơ y tế`;
    const mailHtmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px;">
        <h2 style="color: #0284c7; text-align: center;">MÃ XÁC MINH OTP</h2>
        <p>Xin chào <strong>${studentName}</strong>,</p>
        <p>Bạn đang thực hiện liên kết tài khoản Email với hồ sơ y tế học sinh tại hệ thống Y tế số Trường Trung học Phổ thông Võ Thị Sáu- Bà Rịa- Vũng Tàu.</p>
        <div style="background: #f0f9ff; border: 1.5px dashed #0ea5e9; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #0369a1;">${generatedEmailOTP}</span>
        </div>
        <p style="font-size: 0.85rem; color: #64748b;">Mã này có hiệu lực trong vòng 5 phút. Vui lòng tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 0.75rem; color: #94a3b8; text-align: center;">Đây là email tự động từ hệ thống quản lý y tế số.</p>
        <p style="font-size: 0.75rem; color: #40312F; text-align: center;">Bộ phận Chăm sóc khách hàng: yte.thptvothisaubrvt@gmail.com</p>
      </div>
    `;

    const resendBtn = document.getElementById('btn-resend-email');
    if (resendBtn) resendBtn.disabled = true;

    try {
        // 2. ĐẨY LỆNH SANG FILE EMAIL SERVICE ĐỂ PHÂN CHIA VÀ GỬI
        await EmailService.sendEmail({
            to: emailTarget,
            subject: mailSubject,
            htmlBody: mailHtmlBody
        });

        alert(`Google đã gửi mã xác minh OTP về hòm thư: ${emailTarget}`);
        startCooldownTimer('btn-resend-email');

    } catch (err) {
        console.error("Lỗi gửi mail:", err);
        alert("⚠️ " + err.message);
        if (resendBtn) resendBtn.disabled = false;
    }
}

function triggerEmailResend() {
    if (!checkOTPLimit()) return;
    recordOTPSent();
    sendEmailOTP();
}

async function verifyEmailOTP() {
    const inputOtp = document.getElementById('otp-email-input').value.trim();
    if (inputOtp !== generatedEmailOTP) {
        return alert("Mã xác thực OTP không khớp.");
    }

    try {
        await db.collection('yt_students').doc(targetStudentDocId).update({
            linkedEmail: googleUser.email
        });

        alert("Liên kết hồ sơ học sinh thành công!");
        window.location.href = redirectTarget;
    } catch (err) {
        alert("Lỗi lưu liên kết: " + err.message);
    }
}

// --- ĐIỀU KHIỂN MODAL HỖ TRỢ ---
function openRecoveryModal() {
    document.getElementById('recovery-modal').style.display = 'flex';
}

function closeRecoveryModal() {
    document.getElementById('recovery-modal').style.display = 'none';
}

function switchRecoveryTab(tabName) {
    document.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    event.currentTarget.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

function formatToE164(phoneNumber) {
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '+84' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('+')) {
        cleanPhone = '+' + cleanPhone;
    }
    return cleanPhone;
}

function maskPhoneNumber(phone) {
    if (!phone || phone.length < 9) return "Không khả dụng";
    return phone.substring(0, 3) + "***" + phone.substring(phone.length - 3);
}

// --- TRA CỨU HỒ SƠ HỌC SINH (LỌC TRÊN CLIENT KHÔNG BÌ LỖI INDEX HỖN HỢP) ---
async function lookupStudentProfile() {
    const nameInputRaw = document.getElementById('lookup-name').value;
    const dobInput = document.getElementById('lookup-dob').value;
    const classInputRaw = document.getElementById('lookup-class').value;

    if (!nameInputRaw || !dobInput || !classInputRaw) {
        return alert("Vui lòng điền đủ 3 trường thông tin để tìm kiếm.");
    }

    // Chuẩn hóa chuỗi nhập liệu (Xóa khoảng trắng kép, chuyển hoa)
    const nameInput = nameInputRaw.trim().toUpperCase().replace(/\s+/g, ' ');
    const classInput = classInputRaw.trim().toUpperCase();

    const searchBtn = document.querySelector('#sms-lookup-step-1 button');
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tìm kiếm...';

    try {
        // Chỉ truy vấn theo lớp (Tránh yêu cầu thiết lập Index hỗn hợp từ Firebase)
        const snap = await db.collection('yt_students').where('class', '==', classInput).get();

        if (snap.empty) {
            searchBtn.disabled = false;
            searchBtn.innerHTML = 'Tìm kiếm thông tin';
            return alert("Không tìm thấy học sinh nào thuộc lớp: " + classInput);
        }

        let matchStudent = null;
        
        // Quét đối sánh song song họ tên và ngày sinh chính xác trên trình duyệt
        snap.forEach(doc => {
            const data = doc.data();
            const dbName = (data.name || "").trim().toUpperCase().replace(/\s+/g, ' ');
            
            if (dbName === nameInput) {
                if (compareDates(data.dob, dobInput)) {
                    matchStudent = { id: doc.id, ...data };
                }
            }
        });

        if (!matchStudent) {
            searchBtn.disabled = false;
            searchBtn.innerHTML = 'Tìm kiếm thông tin';
            return alert("Không tìm thấy thông tin học sinh khớp với dữ liệu bạn nhập. Hãy kiểm tra kỹ họ tên hoặc ngày sinh.");
        }

        foundStudentData = matchStudent;
        targetStudentDocId = matchStudent.id;

        // Giải mã thông tin liên lạc bảo mật
        const studentPhoneDecrypted = decryptField(foundStudentData.phone) || "";
        const parentPhoneDecrypted = decryptField(foundStudentData.parentPhone) || "";

        let phoneFound = false;

        if (studentPhoneDecrypted && studentPhoneDecrypted.length >= 9) {
            document.getElementById('option-student-phone-container').style.display = 'flex';
            document.getElementById('lbl-student-phone').innerText = maskPhoneNumber(studentPhoneDecrypted);
            document.getElementById('opt-student').dataset.phone = studentPhoneDecrypted;
            phoneFound = true;
        } else {
            document.getElementById('option-student-phone-container').style.display = 'none';
        }

        if (parentPhoneDecrypted && parentPhoneDecrypted.length >= 9) {
            document.getElementById('option-parent-phone-container').style.display = 'flex';
            document.getElementById('lbl-parent-phone').innerText = maskPhoneNumber(parentPhoneDecrypted);
            document.getElementById('opt-parent').dataset.phone = parentPhoneDecrypted;
            phoneFound = true;
        } else {
            document.getElementById('option-parent-phone-container').style.display = 'none';
        }

        if (!phoneFound) {
            searchBtn.disabled = false;
            searchBtn.innerHTML = 'Tìm kiếm thông tin';
            return alert("Thông tin số điện thoại của bạn chưa được thiết lập trên hệ thống.");
        }

        document.getElementById('sms-lookup-step-1').style.display = 'none';
        document.getElementById('sms-lookup-step-2').style.display = 'block';

        if (!smsRecaptchaVerifier) {
            smsRecaptchaVerifier = new firebase.auth.RecaptchaVerifier('sms-recaptcha', {
                'size': 'normal',
                'callback': (response) => {}
            });
            smsRecaptchaVerifier.render();
        }

    } catch (err) {
        console.error(err);
        alert("Lỗi hệ thống khi tra cứu dữ liệu: " + err.message);
    } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = 'Tìm kiếm thông tin';
    }
}

// --- GỬI SMS OTP MIỄN PHÍ QUA GOOGLE ---
async function sendSMSOTP() {
    const selectedRadio = document.querySelector('input[name="sms-phone-target"]:checked');
    if (!selectedRadio) return alert("Vui lòng lựa chọn số điện thoại.");

    if (!checkOTPLimit()) return;

    const rawPhone = selectedRadio.dataset.phone; 
    const formattedPhone = formatToE164(rawPhone); 

    const btn = document.querySelector('#sms-lookup-step-2 button');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi tin nhắn...';
    btn.disabled = true;

    try {
        // Kiểm duyệt hạn ngạch SMS trên hệ thống trước khi gửi
        const isQuotaAvailable = await checkAndIncrementSMSQuota();
        if (!isQuotaAvailable) {
            btn.innerHTML = 'Gửi mã OTP qua SMS';
            btn.disabled = false;
            return;
        }

        const appVerifier = smsRecaptchaVerifier;
        const confirmationResult = await firebase.auth().signInWithPhoneNumber(formattedPhone, appVerifier);
        
        phoneConfirmationResult = confirmationResult;

        alert("Google đã gửi tin nhắn chứa mã xác nhận miễn phí về điện thoại di động của bạn.");
        
        document.getElementById('sms-lookup-step-2').style.display = 'none';
        document.getElementById('sms-lookup-step-3').style.display = 'block';
        startCooldownTimer('btn-resend-sms');

    } catch (err) {
        console.error("Lỗi gửi tin nhắn xác thực SMS:", err);
        alert("Lỗi gửi tin nhắn: Hệ thống đang bảo trì" + err.message);
        
        if (smsRecaptchaVerifier) {
            smsRecaptchaVerifier.render().then(widgetId => {
                grecaptcha.reset(widgetId);
            });
        }
    } finally {
        btn.innerHTML = 'Gửi mã OTP qua SMS';
        btn.disabled = false;
    }
}

// --- GỬI LẠI SMS OTP (BỊ KHÓA, CHUYỂN HƯỚNG SANG HƯỚNG DẪN VNEDU TRÊN WEB) ---
function triggerSMSResend() {
    alert("⚠️ THÔNG BÁO BẢO MẬT:\nTính năng gửi lại mã OTP qua SMS hiện không khả dụng để tối ưu hạn ngạch viễn thông.\n\nHệ thống sẽ hiển thị phần hướng dẫn lấy mã qua ứng dụng VnEdu Connect có sẵn ngay trên trang web này để bạn thực hiện!");
    
    // Thực hiện chuyển đổi tab sang phần hướng dẫn VnEdu tích hợp sẵn trên trang web
    switchRecoveryTab('vnedu');
}

// --- XÁC MINH SMS OTP QUA GOOGLE ---
async function verifySMSOTP() {
    const otpInput = document.getElementById('sms-otp-input').value.trim();
    if (!otpInput || otpInput.length < 6) {
        return alert("Vui lòng điền đúng mã OTP 6 con số.");
    }

    if (!phoneConfirmationResult) {
        return alert("Phiên làm việc hết hiệu lực. Xin hãy thử lại.");
    }

    const btn = document.querySelector('#sms-lookup-step-3 button');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xác minh...';

    try {
        await phoneConfirmationResult.confirm(otpInput);

        document.getElementById('res-name').innerText = foundStudentData.name;
        document.getElementById('res-class').innerText = foundStudentData.class;
        document.getElementById('res-stcode').innerText = foundStudentData.studentCode || "Chưa cập nhật";
        document.getElementById('res-ytcode').innerText = targetStudentDocId;

        document.getElementById('sms-lookup-step-3').style.display = 'none';
        document.getElementById('sms-lookup-step-4').style.display = 'block';

    } catch (err) {
        console.error("Lỗi xác minh mã OTP:", err);
        alert("Mã OTP không chính xác.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Xác nhận mã OTP';
    }
}

// --- TỰ ĐỘNG LIÊN KẾT TÀI KHOẢN VÀ ĐĂNG NHẬP SAU KHI TRA CỨU THÀNH CÔNG ---
async function autoLinkAndLogin() {
    if (!googleUser) {
        alert("Hãy thực hiện Đăng nhập Google tại Bước 1 để hoàn thành liên kết tự động.");
        closeRecoveryModal();
        goToStep(1);
        return;
    }

    try {
        await db.collection('yt_students').doc(targetStudentDocId).update({
            linkedEmail: googleUser.email
        });
        alert("Hệ thống đã đồng bộ liên kết thành công!");
        window.location.href = redirectTarget;
    } catch (err) {
        alert("Lỗi cập nhật dữ liệu: " + err.message);
    }
}
