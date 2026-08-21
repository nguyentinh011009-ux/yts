// assets/js/crypto.js - HỆ THỐNG MÃ HÓA & GIẢI MÃ TỰ ĐỘNG TOÀN CỤC (ALL-IN-ONE)

// 1. BIẾN PROMISE TOÀN CỤC KIỂM SOÁT TIẾN TRÌNH NẠP KHÓA
window.masterCryptoKeyReady = null;

// Hàm kiểm tra và lấy User Firebase
function getFirebaseUserAsync() {
    return new Promise((resolve) => {
        if (firebase.auth().currentUser) {
            return resolve(firebase.auth().currentUser);
        }
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

// 2. HÀM TẢI KHÓA MASTER TỪ CLOUDFLARE WORKER
async function loadMasterCryptoKey() {
    // Nếu trong session đã có khóa sẵn -> Dùng ngay lập tức (0ms)
    if (sessionStorage.getItem('vts_master_crypto_key')) {
        return sessionStorage.getItem('vts_master_crypto_key');
    }

    try {
        let currentUser = await getFirebaseUserAsync();
        if (!currentUser) return null;

        const idToken = await currentUser.getIdToken(true);
        const response = await fetch("https://vts-health-ai.yte-thptvothisaubrvt.workers.dev/get-key", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${idToken}`,
                "Content-Type": "application/json"
            }
        });

        if (response.ok) {
            const data = await response.json();
            sessionStorage.setItem('vts_master_crypto_key', data.key);
            console.log("🔒 [Security] Đã thiết lập khóa giải mã E2EE toàn cục thành công!");

            // Bắn sự kiện ra toàn bộ trang web để các trang tự làm mới giao diện nếu cần
            window.dispatchEvent(new CustomEvent('vts_crypto_ready', { detail: { key: data.key } }));
            return data.key;
        } else {
            console.warn("⚠️ [Security] Cloudflare từ chối cấp khóa hoặc phiên chưa hợp lệ.");
        }
    } catch (e) {
        console.error("❌ Lỗi nạp khóa bảo mật:", e);
    }
    return null;
}

// TỰ ĐỘNG LẮNG NGHE ĐĂNG NHẬP VÀ NẠP KHÓA NGAY LẬP TỨC CHO MỌI FILE
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            window.masterCryptoKeyReady = loadMasterCryptoKey();
        } else {
            sessionStorage.removeItem('vts_master_crypto_key');
        }
    });
}

// 3. HÀM MÃ HÓA CHUẨN
function encryptField(plainText) {
    if (!plainText || typeof plainText !== 'string' || plainText.trim() === "") return plainText || "";
    const key = sessionStorage.getItem('vts_master_crypto_key');
    if (!key) return plainText;
    try {
        return CryptoJS.AES.encrypt(plainText.trim(), key).toString();
    } catch (e) {
        return plainText;
    }
}

// 4. HÀM GIẢI MÃ CHUẨN (CHỐNG LỖI VÀ CHỐNG SẬP NGÀY THÁNG)
function decryptField(cipherText) {
    if (!cipherText || typeof cipherText !== 'string' || cipherText.trim() === "") return cipherText || "";
    
    // Nếu không phải chuỗi mã hóa AES của CryptoJS -> Trả về text gốc luôn
    if (!cipherText.startsWith("U2FsdGVkX1")) {
        return cipherText;
    }

    const key = sessionStorage.getItem('vts_master_crypto_key');
    if (!key) return cipherText; // Trả về chuỗi gốc để không làm đơ code hiển thị

    try {
        const bytes = CryptoJS.AES.decrypt(cipherText.trim(), key);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText || cipherText;
    } catch (e) {
        return cipherText;
    }
}

// 5. BỘ QUÉT ĐỆ QUY TỰ ĐỘNG GIẢI MÃ MỌI ĐỐI TƯỢNG VÀ MẢNG
function autoDecryptDeep(data) {
    if (!data) return data;
    
    if (typeof data === 'string') {
        if (data.startsWith("U2FsdGVkX1")) {
            return decryptField(data);
        }
        return data;
    }

    // Bỏ qua Timestamp của Firebase và Date của JS
    if (data instanceof Date || (data && typeof data.toDate === 'function')) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => autoDecryptDeep(item));
    }

    if (typeof data === 'object') {
        const decryptedObj = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                decryptedObj[key] = autoDecryptDeep(data[key]);
            }
        }
        return decryptedObj;
    }

    return data;
}

// 6. CAN THIỆP TRỰC TIẾP VÀO GỐC FIREBASE SDK
// Bất cứ file nào gọi doc.data() sẽ tự động nhận dữ liệu đã giải mã sẵn 100%
if (typeof firebase !== 'undefined' && firebase.firestore) {
    const originalDocData = firebase.firestore.DocumentSnapshot.prototype.data;
    firebase.firestore.DocumentSnapshot.prototype.data = function(...args) {
        const rawData = originalDocData.apply(this, args);
        return autoDecryptDeep(rawData);
    };
}
