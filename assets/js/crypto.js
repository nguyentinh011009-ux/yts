// assets/js/crypto.js - HỆ THỐNG MÃ HÓA & TỰ ĐỘNG GIẢI MÃ TOÀN DIỆN (FIXED)

function getMasterKey() {
    return localStorage.getItem('vts_master_crypto_key') || sessionStorage.getItem('vts_master_crypto_key') || '';
}

function setMasterKey(key) {
    if (key) {
        localStorage.setItem('vts_master_crypto_key', key);
        sessionStorage.setItem('vts_master_crypto_key', key);
    }
}

function clearMasterKey() {
    localStorage.removeItem('vts_master_crypto_key');
    sessionStorage.removeItem('vts_master_crypto_key');
    sessionStorage.removeItem('vts_students_cache'); // Xóa cache cũ bị dính mã hóa
}

// 1. HÀM TẢI KHÓA MASTER TỪ CLOUDFLARE WORKER
async function loadMasterCryptoKey() {
    const existingKey = getMasterKey();
    if (existingKey) return existingKey;

    try {
        let currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            currentUser = await new Promise(resolve => {
                const unsub = firebase.auth().onAuthStateChanged(user => { unsub(); resolve(user); });
            });
        }
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
            setMasterKey(data.key);
            console.log("🔒 [Security] Đã nạp khóa E2EE thành công!");
            return data.key;
        }
    } catch (e) {
        console.error("❌ Lỗi nạp khóa bảo mật:", e);
    }
    return null;
}

// Lắng nghe đăng nhập để tự động nạp hoặc xóa khóa
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            await loadMasterCryptoKey();
        } else {
            clearMasterKey();
        }
    });
}

// 2. HÀM MÃ HÓA
function encryptField(plainText) {
    if (!plainText || typeof plainText !== 'string' || plainText.trim() === "") return plainText || "";
    const key = getMasterKey();
    if (!key) return plainText;
    try {
        return CryptoJS.AES.encrypt(plainText.trim(), key).toString();
    } catch (e) {
        return plainText;
    }
}

// 3. HÀM GIẢI MÃ
function decryptField(cipherText) {
    if (!cipherText || typeof cipherText !== 'string' || cipherText.trim() === "") return cipherText || "";
    if (!cipherText.startsWith("U2FsdGVkX1")) {
        return cipherText; // Dữ liệu cũ chưa mã hóa
    }

    const key = getMasterKey();
    if (!key) return cipherText;

    try {
        const bytes = CryptoJS.AES.decrypt(cipherText.trim(), key);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText || cipherText;
    } catch (e) {
        return cipherText;
    }
}

// 4. BỘ ĐỆ QUY TỰ ĐỘNG GIẢI MÃ TẤT CẢ CÁC TRƯỜNG
function autoDecryptDeep(data) {
    if (!data) return data;
    
    if (typeof data === 'string') {
        if (data.startsWith("U2FsdGVkX1")) {
            return decryptField(data);
        }
        return data;
    }

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

// 5. CAN THIỆP VÀO CẢ 2 LOẠI SNAPSHOT CỦA FIREBASE SDK V8
if (typeof firebase !== 'undefined' && firebase.firestore) {
    // A. Chặn DocumentSnapshot (Dành cho doc.get())
    if (firebase.firestore.DocumentSnapshot) {
        const origDocData = firebase.firestore.DocumentSnapshot.prototype.data;
        firebase.firestore.DocumentSnapshot.prototype.data = function(...args) {
            const raw = origDocData.apply(this, args);
            return autoDecryptDeep(raw);
        };
    }

    // B. Chặn QueryDocumentSnapshot (Dành cho collection.get(), where, onSnapshot)
    if (firebase.firestore.QueryDocumentSnapshot) {
        const origQueryDocData = firebase.firestore.QueryDocumentSnapshot.prototype.data;
        firebase.firestore.QueryDocumentSnapshot.prototype.data = function(...args) {
            const raw = origQueryDocData.apply(this, args);
            return autoDecryptDeep(raw);
        };
    }
}
