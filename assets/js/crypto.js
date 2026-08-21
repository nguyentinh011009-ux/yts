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
    sessionStorage.removeItem('vts_students_cache');
}

let masterKeyPromise = null;

async function loadMasterCryptoKey() {
    const existingKey = getMasterKey();
    if (existingKey) return existingKey;

    try {
        if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
            return null;
        }

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
            
            // Tự động quét và vá lại giao diện ngay khi có khóa
            setTimeout(scanAndFixDOM, 100);
            return data.key;
        }
    } catch (e) {
        console.error("❌ Lỗi nạp khóa bảo mật:", e);
    }
    return null;
}

function ensureCryptoKeyReady() {
    if (getMasterKey()) return Promise.resolve(getMasterKey());
    if (!masterKeyPromise) {
        masterKeyPromise = loadMasterCryptoKey();
    }
    return masterKeyPromise;
}

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

function decryptField(cipherText) {
    if (!cipherText || typeof cipherText !== 'string' || cipherText.trim() === "") return cipherText || "";
    if (!cipherText.startsWith("U2FsdGVkX1")) {
        return cipherText;
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

function scanAndFixDOM() {
    if (!getMasterKey() || typeof document === 'undefined') return;

    try {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeValue && node.nodeValue.includes("U2FsdGVkX1")) {
                node.nodeValue = node.nodeValue.replace(/U2FsdGVkX1[A-Za-z0-9+/=]+/g, match => decryptField(match));
            }
        }

        document.querySelectorAll('input, textarea').forEach(el => {
            if (el.value && el.value.startsWith("U2FsdGVkX1")) {
                el.value = decryptField(el.value);
            }
        });
    } catch(e) {}
}

try {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        
        if (firebase.firestore.DocumentReference) {
            const origDocGet = firebase.firestore.DocumentReference.prototype.get;
            firebase.firestore.DocumentReference.prototype.get = async function(...args) {
                await ensureCryptoKeyReady();
                return origDocGet.apply(this, args);
            };
        }

        if (firebase.firestore.Query) {
            const origQueryGet = firebase.firestore.Query.prototype.get;
            firebase.firestore.Query.prototype.get = async function(...args) {
                await ensureCryptoKeyReady();
                return origQueryGet.apply(this, args);
            };
        }

        if (firebase.firestore.DocumentSnapshot) {
            const origDocData = firebase.firestore.DocumentSnapshot.prototype.data;
            firebase.firestore.DocumentSnapshot.prototype.data = function(...args) {
                const raw = origDocData.apply(this, args);
                return autoDecryptDeep(raw);
            };
        }

        if (firebase.firestore.QueryDocumentSnapshot) {
            const origQueryDocData = firebase.firestore.QueryDocumentSnapshot.prototype.data;
            firebase.firestore.QueryDocumentSnapshot.prototype.data = function(...args) {
                const raw = origQueryDocData.apply(this, args);
                return autoDecryptDeep(raw);
            };
        }
    }
} catch (e) {
    console.error("Lỗi can thiệp Firestore prototype:", e);
}

window.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.apps && firebase.apps.length > 0) {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                await ensureCryptoKeyReady();
            } else {
                clearMasterKey();
            }
        });
    }
});
