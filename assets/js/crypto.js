// assets/js/crypto.js
function getFirebaseUserAsync() {
    return new Promise((resolve) => {
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            unsubscribe(); // Hủy lắng nghe ngay sau khi có kết quả để tránh tốn tài nguyên
            resolve(user);
        });
    });
}

async function loadMasterCryptoKey() {
    if (sessionStorage.getItem('vts_master_crypto_key')) return;
    try {
        // Kiểm tra xem tài khoản đã sẵn sàng chưa
        let currentUser = firebase.auth().currentUser;
        
        if (!currentUser) {
            // 👉 BẮT BUỘC: Nếu chưa sẵn sàng, đợi Firebase chạy ngầm kiểm tra phiên đăng nhập xong!
            currentUser = await getFirebaseUserAsync();
        }

        if (!currentUser) {
            console.warn("Chưa xác thực: Không tìm thấy phiên đăng nhập hợp lệ.");
            return;
        }

        // Lấy mã Token xác thực của Firebase
        const idToken = await currentUser.getIdToken(true);

        // Gọi lệnh lấy khóa từ Cloudflare Worker
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
            console.log("🔒 Đã thiết lập khóa giải mã E2EE từ Cloudflare thành công!");
            
            // Tự động kích hoạt vẽ lại giao diện sau khi nạp khóa thành công để không bị đứng màn hình cũ
            if (typeof renderTabInfo === 'function' && currentStudent) renderTabInfo();
            if (typeof loadStudentToTask === 'function' && activeStudentData) loadStudentToTask(activeStudentData.id);
        } else {
            const errText = await response.text();
            console.error(`❌ LỖI CLOUDFLARE (Mã lỗi: ${response.status}):`, errText);
            alert(`⚠️ LỖI KẾT NỐI BẢO MẬT (Mã lỗi: ${response.status}):\n\nChi tiết: ${errText}`);
        }
    } catch (e) {
        console.error("❌ Lỗi hệ thống khi tải khóa bảo mật:", e);
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