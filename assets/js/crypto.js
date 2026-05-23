// assets/js/crypto.js
async function loadMasterCryptoKey() {
    if (sessionStorage.getItem('vts_master_crypto_key')) return;
    try {
        const doc = await db.collection('settings').doc('security').get();
        if (doc.exists) {
            sessionStorage.setItem('vts_master_crypto_key', doc.data().master_key);
            console.log("🔒 Đã thiết lập khóa giải mã E2EE từ Cloud Firestore thành công!");
        } else {
            console.error("❌ LỖI BẢO MẬT: Chưa khởi tạo Khóa bảo mật gốc trên Cloud Firestore!");
        }
    } catch (e) {
        console.warn("Chưa tải được khóa bảo mật (Chờ xác thực tài khoản)...");
    }
}

// 2. HÀM MÃ HÓA NGHIÊM NGẶT
function encryptField(plainText) {
    if (!plainText || plainText.trim() === "") return "";
    
    const key = sessionStorage.getItem('vts_master_crypto_key');
    if (!key) {
        console.error("❌ LỖI: Chưa nạp khóa bảo mật. Không thể thực hiện mã hóa!");
        return plainText; // Giữ lại text gốc để tránh làm mất mát dữ liệu nhập của Admin
    }
    
    return CryptoJS.AES.encrypt(plainText.trim(), key).toString();
}

// 3. HÀM GIẢI MÃ NGHIÊM NGẶT
function decryptField(cipherText) {
    if (!cipherText || cipherText.trim() === "") return "";

    // Tự động hiển thị dữ liệu cũ (chưa mã hóa)
    if (!cipherText.startsWith("U2FsdGVkX1")) {
        return cipherText; 
    }

    const key = sessionStorage.getItem('vts_master_crypto_key');
    if (!key) {
        // Thay vì báo "Lỗi giải mã" gây hiểu lầm, hệ thống báo trạng thái bảo mật thực tế
        return "🔒 Chưa xác thực"; 
    }

    try {
        const bytes = CryptoJS.AES.decrypt(cipherText.trim(), key);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText || "🔒 Lỗi giải mã";
    } catch (e) {
        return "🔒 Lỗi giải mã";
    }
}