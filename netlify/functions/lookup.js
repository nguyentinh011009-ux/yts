const admin = require('firebase-admin');
const CryptoJS = require('crypto-js');

// Khởi tạo Firebase Admin SDK (Chỉ chạy 1 lần)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

// Hàm bỏ dấu tiếng Việt để tìm kiếm
function removeVietnameseTones(str) {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}

// Hàm giải mã
function decryptField(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') return ciphertext || '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, process.env.CRYPTO_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || ciphertext;
  } catch (e) {
    return ciphertext;
  }
}

exports.handler = async (event) => {
  // Chỉ cho phép phương thức POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const { action } = body;

    // --- NHÁNH 1: TÌM KIẾM THEO TÊN + LỚP + XÁC MINH RECAPTCHA ---
    if (action === 'search') {
      const { name, className, recaptchaToken } = body;

      // 1. Kiểm tra reCAPTCHA thật trên server Google
      const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${recaptchaToken}`;
      const captchaRes = await fetch(verifyUrl, { method: 'POST' });
      const captchaData = await captchaRes.json();
      if (!captchaData.success) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Xác thực reCAPTCHA không hợp lệ!' }) };
      }

      // 2. Đọc dữ liệu học sinh (Admin SDK vượt qua Rules an toàn)
      const snapshot = await db.collection('yt_students').get();
      const matched = [];
      const cleanSearchName = removeVietnameseTones(name);
      const cleanSearchClass = (className || '').toLowerCase().trim();

      snapshot.forEach(doc => {
        const raw = doc.data();
        const decryptedName = decryptField(raw.name);
        const decryptedClass = decryptField(raw.class);

        if (removeVietnameseTones(decryptedName) === cleanSearchName && decryptedClass.toLowerCase() === cleanSearchClass) {
          matched.push({
            id: doc.id,
            name: decryptedName,
            class: decryptedClass
            // KHÔNG gửi ngày sinh/địa chỉ về client lúc này để bảo mật
          });
        }
      });

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, candidates: matched })
      };
    }

    // --- NHÁNH 2: XÁC THỰC BÍ MẬT (NGÀY SINH + XÃ/PHƯỜNG) ---
    if (action === 'verify') {
      const { studentId, dob, ward } = body;

      const doc = await db.collection('yt_students').doc(studentId).get();
      if (!doc.exists) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Không tìm thấy hồ sơ học sinh!' }) };
      }

      const raw = doc.data();
      const studentDob = decryptField(raw.dob || '').trim();
      const studentWard = removeVietnameseTones(raw.ward || '');
      const cleanInputWard = removeVietnameseTones(ward || '');

      // So khớp ngày sinh
      let isDobValid = (studentDob === dob);
      if (!isDobValid && studentDob) {
        const formattedDb = new Date(studentDob).toISOString().split('T')[0];
        if (formattedDb === dob) isDobValid = true;
      }

      // So khớp xã/phường
      const isWardValid = studentWard.length > 0 && 
        (studentWard.includes(cleanInputWard) || cleanInputWard.includes(studentWard));

      if (!isDobValid || !isWardValid) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Ngày sinh hoặc Phường/Xã không khớp!' }) };
      }

      // Trả về mã khi đã xác thực đúng
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: true,
          data: {
            name: decryptField(raw.name),
            class: decryptField(raw.class),
            studentCode: raw.studentCode || 'Chưa cấp',
            medicalId: doc.id
          }
        })
      };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Hành động không hợp lệ!' }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
