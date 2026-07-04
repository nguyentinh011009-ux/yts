let googleUser = null;
let targetStudentDocId = null;
let foundStudentData = null;
let generatedEmailOTP = "";
let phoneConfirmationResult = null; 
let redirectTarget = "student.html";
let recaptchaVerifier = null;
let smsRecaptchaVerifier = null;

const GOOGLE_MAIL_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwNMYm2NrbF-EYJ_eTOmDurysm9n9n1QS-i4x8eMMJ4Exr1V95DIvMJ3PjjiaYS9CFz/exec";

// Lấy tham số chuyển hướng thông minh khi tải trang
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');
    if (redirectParam) {
        redirectTarget = decodeURIComponent(redirectParam);
    }
    
    // Khởi tạo giải mã dữ liệu bảo mật trong hệ thống
    loadMasterCryptoKey().catch(err => {
        console.warn("Không thể tải khóa giải mã dữ liệu bảo mật:", err);
    });
});

// Điều khiển chuyển đổi màn hình các bước đăng nhập
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
        
        // Truy vấn dữ liệu để kiểm tra xem tài khoản email này đã được liên kết hay chưa
        const snap = await db.collection('yt_students').where('linkedEmail', '==', googleUser.email).get();
        
        if (!snap.empty) {
            // Email đã được liên kết trước đó -> Cho phép truy cập trực tiếp trang đích
            window.location.href = redirectTarget;
        } else {
            // Email mới chưa liên kết -> Đưa sang bước 2 xác nhận mã định danh
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
        // Tìm kiếm hồ sơ học sinh theo ID tài liệu (Mã y tế) hoặc thuộc tính studentCode (Mã học sinh)
        let queryById = await db.collection('yt_students').doc(code).get();
        let queryByCode = await db.collection('yt_students').where('studentCode', '==', code).get();

        if (queryById.exists) {
            targetStudentDocId = queryById.id;
            foundStudentData = queryById.data();
        } else if (!queryByCode.empty) {
            targetStudentDocId = queryByCode.docs[0].id;
            foundStudentData = queryByCode.docs[0].data();
        } else {
            return alert("Không tìm thấy thông tin hồ sơ khớp với mã bạn nhập.");
        }

        // Ngăn chặn ghi đè nếu hồ sơ học sinh đã có người khác liên kết
        if (foundStudentData.linkedEmail) {
            return alert(`Hồ sơ này đã được liên kết với email: ${foundStudentData.linkedEmail}. Vui lòng liên hệ Phòng Y Tế để yêu cầu kiểm tra.`);
        }

        // Tạo reCAPTCHA vô hình phục vụ bảo mật cho quy trình gửi email
        initRecaptcha();
        goToStep(3);
        sendEmailOTP();

    } catch (err) {
        alert("Lỗi truy vấn thông tin: " + err.message);
    }
}

// Khởi tạo reCAPTCHA vô hình (Invisible)
function initRecaptcha() {
    if (recaptchaVerifier) return;
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible',
        'callback': (response) => {}
    });
    recaptchaVerifier.render();
}

// --- BƯỚC 3: GỬI VÀ XÁC MINH OTP EMAIL QUA GOOGLE APPS SCRIPT ---
function sendEmailOTP() {
    generatedEmailOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    const emailTarget = googleUser.email;
    const studentName = foundStudentData ? foundStudentData.name : "Học sinh";
    
    // Ghép các tham số trực tiếp vào đường dẫn URL để thực hiện yêu cầu GET
    const requestUrl = `${GOOGLE_MAIL_SCRIPT_URL}?to_email=${encodeURIComponent(emailTarget)}&otp_code=${generatedEmailOTP}&student_name=${encodeURIComponent(studentName)}`;

    fetch(requestUrl, {
        method: 'GET',
        mode: 'no-cors' // Loại bỏ kiểm tra CORS của trình duyệt, đảm bảo gửi tin nhắn thành công
    })
    .then(() => {
        alert("Yêu cầu gửi OTP đã được chuyển tiếp. Vui lòng kiểm tra hộp thư đến (hoặc thư rác) của email: " + emailTarget);
    })
    .catch(err => {
        console.error("Lỗi kết nối API gửi email:", err);
        alert("Lỗi kết nối mạng khi gửi mã OTP.");
    });
}

async function verifyEmailOTP() {
    const inputOtp = document.getElementById('otp-email-input').value.trim();
    if (inputOtp !== generatedEmailOTP) {
        return alert("Mã xác thực OTP Email không chính xác.");
    }

    try {
        // Cập nhật trường dữ liệu liên kết trên Firestore
        await db.collection('yt_students').doc(targetStudentDocId).update({
            linkedEmail: googleUser.email
        });

        alert("Liên kết tài khoản học sinh thành công!");
        window.location.href = redirectTarget;
    } catch (err) {
        alert("Lỗi cập nhật liên kết: " + err.message);
    }
}

// --- ĐIỀU KHIỂN GIAO DIỆN MODAL HỖ TRỢ KHÔI PHỤC ---
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

// Định dạng số điện thoại Việt Nam sang chuẩn quốc tế E.164 (+84)
function formatToE164(phoneNumber) {
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '+84' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('+')) {
        cleanPhone = '+' + cleanPhone;
    }
    return cleanPhone;
}

// Mã hóa hiển thị số điện thoại (Ẩn các số giữa)
function maskPhoneNumber(phone) {
    if (!phone || phone.length < 9) return "Không có thông tin";
    return phone.substring(0, 3) + "***" + phone.substring(phone.length - 3);
}

// --- TRA CỨU HỌC SINH & LIÊN LẠC ĐỂ CHUẨN BỊ GỬI SMS ---
async function lookupStudentProfile() {
    const nameInput = document.getElementById('lookup-name').value.trim().toUpperCase();
    const dobInput = document.getElementById('lookup-dob').value;
    const classInput = document.getElementById('lookup-class').value.trim().toUpperCase();

    if (!nameInput || !dobInput || !classInput) {
        return alert("Vui lòng điền đầy đủ 3 trường thông tin để tìm kiếm.");
    }

    // Chuyển đổi định dạng ngày từ YYYY-MM-DD sang DD/MM/YYYY để đối chiếu chính xác
    const formattedDate = dobInput.split('-').reverse().join('/'); 

    try {
        const snap = await db.collection('yt_students')
            .where('name', '==', nameInput)
            .where('class', '==', classInput)
            .get();

        let matchStudent = null;
        snap.forEach(doc => {
            const data = doc.data();
            if (data.dob === formattedDate || data.dob === dobInput) {
                matchStudent = { id: doc.id, ...data };
            }
        });

        if (!matchStudent) {
            return alert("Không tìm thấy thông tin học sinh khớp với bộ lọc cung cấp.");
        }

        foundStudentData = matchStudent;
        targetStudentDocId = matchStudent.id;

        // Giải mã các trường số điện thoại liên lạc từ cơ sở dữ liệu
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
            return alert("Không tìm thấy thông tin số điện thoại liên kết trong hệ thống để thực hiện gửi SMS.");
        }

        // Chuyển sang màn hình xác minh bước 2 trong tab tra cứu SMS
        document.getElementById('sms-lookup-step-1').style.display = 'none';
        document.getElementById('sms-lookup-step-2').style.display = 'block';

        // Khởi tạo reCAPTCHA xác minh cho SMS
        if (!smsRecaptchaVerifier) {
            smsRecaptchaVerifier = new firebase.auth.RecaptchaVerifier('sms-recaptcha', {
                'size': 'normal',
                'callback': (response) => {}
            });
            smsRecaptchaVerifier.render();
        }

    } catch (err) {
        console.error(err);
        alert("Lỗi xử lý tra cứu: " + err.message);
    }
}

// --- GỬI SMS OTP MIỄN PHÍ QUA FIREBASE ---
async function sendSMSOTP() {
    const selectedRadio = document.querySelector('input[name="sms-phone-target"]:checked');
    if (!selectedRadio) return alert("Vui lòng chọn số điện thoại để tiếp nhận mã xác thực.");

    const rawPhone = selectedRadio.dataset.phone; 
    const formattedPhone = formatToE164(rawPhone); 

    const btn = document.querySelector('#sms-lookup-step-2 button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi SMS...';
    btn.disabled = true;

    try {
        const appVerifier = smsRecaptchaVerifier;

        // Gọi dịch vụ gửi tin nhắn SMS OTP của Google thông qua Firebase Authentication
        const confirmationResult = await firebase.auth().signInWithPhoneNumber(formattedPhone, appVerifier);
        
        phoneConfirmationResult = confirmationResult;

        alert("Hệ thống Google đã gửi mã xác thực SMS OTP thành công đến số điện thoại của bạn.");
        
        document.getElementById('sms-lookup-step-2').style.display = 'none';
        document.getElementById('sms-lookup-step-3').style.display = 'block';

    } catch (err) {
        console.error("Lỗi gửi tin nhắn xác thực SMS:", err);
        alert("Không thể gửi tin nhắn xác minh. Lỗi: " + err.message);
        
        if (smsRecaptchaVerifier) {
            smsRecaptchaVerifier.render().then(widgetId => {
                grecaptcha.reset(widgetId);
            });
        }
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// --- XÁC MINH SMS OTP QUA GOOGLE ---
async function verifySMSOTP() {
    const otpInput = document.getElementById('sms-otp-input').value.trim();
    if (!otpInput || otpInput.length < 6) {
        return alert("Vui lòng nhập mã xác thực OTP gồm 6 chữ số.");
    }

    if (!phoneConfirmationResult) {
        return alert("Phiên làm việc đã hết hạn. Vui lòng gửi lại yêu cầu mã OTP khác.");
    }

    const btn = document.querySelector('#sms-lookup-step-3 button');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xác thực...';

    try {
        // Thực hiện so khớp mã xác nhận trên máy chủ Google
        await phoneConfirmationResult.confirm(otpInput);

        // Xác thực hoàn tất -> Hiển thị kết quả tra cứu mã học sinh và mã y tế trực quan
        document.getElementById('res-name').innerText = foundStudentData.name;
        document.getElementById('res-class').innerText = foundStudentData.class;
        document.getElementById('res-stcode').innerText = foundStudentData.studentCode || "Chưa cập nhật";
        document.getElementById('res-ytcode').innerText = targetStudentDocId;

        document.getElementById('sms-lookup-step-3').style.display = 'none';
        document.getElementById('sms-lookup-step-4').style.display = 'block';

    } catch (err) {
        console.error("Lỗi xác minh mã OTP:", err);
        alert("Mã OTP bạn nhập không chính xác hoặc đã hết thời gian hiệu lực.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Xác nhận mã OTP';
    }
}

// --- TỰ ĐỘNG LIÊN KẾT TÀI KHOẢN VÀ ĐĂNG NHẬP SAU KHI TRA CỨU THÀNH CÔNG ---
async function autoLinkAndLogin() {
    if (!googleUser) {
        alert("Để tự động liên kết, vui lòng đăng nhập tài khoản bằng Google tại bước 1 trước.");
        closeRecoveryModal();
        goToStep(1);
        return;
    }

    try {
        await db.collection('yt_students').doc(targetStudentDocId).update({
            linkedEmail: googleUser.email
        });
        alert("Hệ thống đã hoàn tất liên kết hồ sơ của bạn với email của bạn.");
        window.location.href = redirectTarget;
    } catch (err) {
        alert("Lỗi khi đồng bộ liên kết dữ liệu: " + err.message);
    }
}
