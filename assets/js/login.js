let googleUser = null;
let targetStudentDocId = null;
let foundStudentData = null;
let generatedEmailOTP = "";
let generatedSMSOTP = "";
let redirectTarget = "student.html";
let recaptchaVerifier = null;
let smsRecaptchaVerifier = null;

// Lấy tham số chuyển hướng thông minh khi tải trang
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');
    if (redirectParam) {
        redirectTarget = decodeURIComponent(redirectParam);
    }
    
    // Tải khóa giải mã dữ liệu nhạy cảm
    loadMasterCryptoKey().catch(err => console.warn("Lỗi tải khóa:", err));
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
        
        // Kiểm tra xem email đã được liên kết với học sinh nào chưa
        const snap = await db.collection('yt_students').where('linkedEmail', '==', googleUser.email).get();
        
        if (!snap.empty) {
            // Đã liên kết trước đó -> Đi thẳng đến trang đích
            window.location.href = redirectTarget;
        } else {
            // Chưa liên kết -> Đi tiếp sang Bước 2 nhập mã
            document.getElementById('display-email').innerText = googleUser.email;
            goToStep(2);
        }
    } catch (err) {
        alert("Đăng nhập thất bại: " + err.message);
        btn.disabled = false;
        btn.innerHTML = '<img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google"> Đăng nhập bằng Google';
    }
}

// --- BƯỚC 2: KIỂM TRA MÃ HỌC SINH / MÃ Y TẾ ---
async function verifyStudentCode() {
    const code = document.getElementById('student-code-input').value.trim();
    if (!code) return alert("Vui lòng nhập Mã học sinh hoặc Mã y tế!");

    try {
        // Tìm kiếm theo ID (Mã Y Tế) hoặc theo studentCode (Mã học sinh)
        let queryById = await db.collection('yt_students').doc(code).get();
        let queryByCode = await db.collection('yt_students').where('studentCode', '==', code).get();

        if (queryById.exists) {
            targetStudentDocId = queryById.id;
            foundStudentData = queryById.data();
        } else if (!queryByCode.empty) {
            targetStudentDocId = queryByCode.docs[0].id;
            foundStudentData = queryByCode.docs[0].data();
        } else {
            return alert("Không tìm thấy thông tin học sinh khớp với mã đã cung cấp.");
        }

        if (foundStudentData.linkedEmail) {
            return alert(`Hồ sơ này đã được liên kết với email: ${foundStudentData.linkedEmail}. Vui lòng liên hệ Phòng Y Tế để yêu cầu hủy liên kết cũ.`);
        }

        // Tạo reCAPTCHA cho việc gửi mã OTP Email
        initRecaptcha();
        goToStep(3);
        sendEmailOTP();

    } catch (err) {
        alert("Có lỗi xảy ra: " + err.message);
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

// --- BƯỚC 3: GỬI OTP EMAIL & XÁC MINH ---
function sendEmailOTP() {
    // Tạo mã OTP 6 chữ số
    generatedEmailOTP = Math.floor(100000 + Math.random() * 900000).toString();

    // Tích hợp dịch vụ gửi Email (Sử dụng API EmailJS hoặc Cloud Function của bạn)
    // Dưới đây là ví dụ gửi thông qua EmailJS REST API (Miễn phí)
    const emailParams = {
        service_id: 'default_service',
        template_id: 'otp_template',
        user_id: 'YOUR_EMAILJS_PUBLIC_KEY',
        template_params: {
            to_email: googleUser.email,
            to_name: googleUser.displayName || "Học sinh",
            otp_code: generatedEmailOTP
        }
    };

    // Thực hiện gọi API gửi email
    fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailParams)
    })
    .then(res => {
        alert("Mã OTP đã được gửi đến email đăng nhập của bạn.");
    })
    .catch(err => {
        console.error("Lỗi gửi email:", err);
        // Trong trường hợp thử nghiệm chưa cấu hình EmailJS, log ra console để debug nhanh
        console.log("[DEBUG] OTP Email gửi đến " + googleUser.email + " là: " + generatedEmailOTP);
    });
}

async function verifyEmailOTP() {
    const inputOtp = document.getElementById('otp-email-input').value.trim();
    if (inputOtp !== generatedEmailOTP) {
        return alert("Mã xác thực OTP không chính xác. Vui lòng kiểm tra lại.");
    }

    try {
        // Cập nhật trường linkedEmail vào hồ sơ học sinh
        await db.collection('yt_students').doc(targetStudentDocId).update({
            linkedEmail: googleUser.email
        });

        alert("Liên kết tài khoản thành công!");
        window.location.href = redirectTarget;
    } catch (err) {
        alert("Lỗi hoàn tất liên kết: " + err.message);
    }
}

// --- HỆ THỐNG KHÔI PHỤC MÃ QUA SMS OTP ---
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

// Tra cứu dữ liệu cơ bản từ Họ tên, Ngày sinh, Lớp
async function lookupStudentProfile() {
    const nameInput = document.getElementById('lookup-name').value.trim().toUpperCase();
    const dobInput = document.getElementById('lookup-dob').value;
    const classInput = document.getElementById('lookup-class').value.trim().toUpperCase();

    if (!nameInput || !dobInput || !classInput) {
        return alert("Vui lòng điền đầy đủ 3 trường thông tin để tìm kiếm.");
    }

    // Định dạng lại ngày sinh từ YYYY-MM-DD sang DD/MM/YYYY hoặc kiểm tra chéo
    const formattedDate = dobInput.split('-').reverse().join('/'); // DD/MM/YYYY

    try {
        const snap = await db.collection('yt_students')
            .where('name', '==', nameInput)
            .where('class', '==', classInput)
            .get();

        let matchStudent = null;
        snap.forEach(doc => {
            const data = doc.data();
            // Khớp thêm ngày sinh
            if (data.dob === formattedDate || data.dob === dobInput) {
                matchStudent = { id: doc.id, ...data };
            }
        });

        if (!matchStudent) {
            return alert("Không tìm thấy học sinh phù hợp. Hãy đảm bảo họ tên viết hoa có dấu và ngày sinh chính xác.");
        }

        foundStudentData = matchStudent;
        targetStudentDocId = matchStudent.id;

        // Giải mã số điện thoại
        const studentPhoneDecrypted = decryptField(foundStudentData.phone) || "";
        const parentPhoneDecrypted = decryptField(foundStudentData.parentPhone) || "";

        let phoneFound = false;

        if (studentPhoneDecrypted && studentPhoneDecrypted.length >= 9) {
            document.getElementById('option-student-phone-container').style.display = 'flex';
            document.getElementById('lbl-student-phone').innerText = maskPhoneNumber(studentPhoneDecrypted);
            document.getElementById('opt-student').dataset.phone = studentPhoneDecrypted;
            phoneFound = true;
        }

        if (parentPhoneDecrypted && parentPhoneDecrypted.length >= 9) {
            document.getElementById('option-parent-phone-container').style.display = 'flex';
            document.getElementById('lbl-parent-phone').innerText = maskPhoneNumber(parentPhoneDecrypted);
            document.getElementById('opt-parent').dataset.phone = parentPhoneDecrypted;
            phoneFound = true;
        }

        if (!phoneFound) {
            return alert("Hồ sơ của bạn không có số điện thoại đăng ký hợp lệ. Vui lòng liên hệ trực tiếp phòng y tế.");
        }

        // Chuyển sang bước 2 trong tab SMS
        document.getElementById('sms-lookup-step-1').style.display = 'none';
        document.getElementById('sms-lookup-step-2').style.display = 'block';

        // Tạo Recaptcha cho SMS
        if (!smsRecaptchaVerifier) {
            smsRecaptchaVerifier = new firebase.auth.RecaptchaVerifier('sms-recaptcha', {
                'size': 'normal',
                'callback': (response) => {}
            });
            smsRecaptchaVerifier.render();
        }

    } catch (err) {
        alert("Lỗi tra cứu: " + err.message);
    }
}

function maskPhoneNumber(phone) {
    return phone.substring(0, 3) + "***" + phone.substring(phone.length - 3);
}

// Gửi OTP SMS thông qua Cổng kết nối tích hợp
async function sendSMSOTP() {
    const selectedRadio = document.querySelector('input[name="sms-phone-target"]:checked');
    if (!selectedRadio) return alert("Vui lòng chọn số điện thoại để nhận mã OTP.");

    const rawPhone = selectedRadio.dataset.phone;
    generatedSMSOTP = Math.floor(100000 + Math.random() * 900000).toString();

    // Hướng dẫn cấu hình API gửi SMS chi tiết ở Phần 4. 
    // Giả sử gửi yêu cầu tới API đối tác SMS hoặc Firebase Function.
    try {
        console.log(`[DEBUG SMS OTP] Gửi tới ${rawPhone}: ${generatedSMSOTP}`);
        alert("Đã gửi yêu cầu tạo tin nhắn chứa mã OTP. Kiểm tra điện thoại trong giây lát.");
        
        document.getElementById('sms-lookup-step-2').style.display = 'none';
        document.getElementById('sms-lookup-step-3').style.display = 'block';
    } catch (err) {
        alert("Lỗi kết nối nhà mạng SMS: " + err.message);
    }
}

function verifySMSOTP() {
    const otpInput = document.getElementById('sms-otp-input').value.trim();
    if (otpInput !== generatedSMSOTP) {
        return alert("Mã xác thực OTP SMS không đúng.");
    }

    // Hiển thị kết quả tra cứu
    document.getElementById('res-name').innerText = foundStudentData.name;
    document.getElementById('res-class').innerText = foundStudentData.class;
    document.getElementById('res-stcode').innerText = foundStudentData.studentCode || "Chưa cập nhật";
    document.getElementById('res-ytcode').innerText = targetStudentDocId;

    document.getElementById('sms-lookup-step-3').style.display = 'none';
    document.getElementById('sms-lookup-step-4').style.display = 'block';
}

// Sau khi tra cứu bằng SMS OTP, cho phép bấm liên kết thẳng mà không cần nhập lại mã
async function autoLinkAndLogin() {
    if (!googleUser) {
        alert("Vui lòng nhấn nút đăng nhập bằng Google trước.");
        closeRecoveryModal();
        goToStep(1);
        return;
    }

    try {
        await db.collection('yt_students').doc(targetStudentDocId).update({
            linkedEmail: googleUser.email
        });
        alert("Đã tự động hoàn tất liên kết tài khoản học sinh!");
        window.location.href = redirectTarget;
    } catch (err) {
        alert("Lỗi lưu liên kết: " + err.message);
    }
}
