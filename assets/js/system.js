/* SYSTEM CORE LOGIC - VTS HEALTH SYSTEM CONFIGURATION
   Author: Nguyễn Tính
*/

let currentAdmin = null;
let savedDirectoryHandle = null; // Biến lưu tạm quyền truy cập thư mục lưu trong phiên làm việc
let cachedAuditLogs = [];
// 1. KIỂM TRA BẢO MẬT & PHÂN QUYỀN TRUY CẬP
firebase.auth().onAuthStateChanged((user) => {
    const loadingScreen = document.getElementById('sys-auth-loading');
    const mainContainer = document.getElementById('sys-main-container');

    if (user && ALLOWED_ADMIN_EMAILS.includes(user.email)) {
        currentAdmin = user;
	loadLastBackupTime();
        // 👉 THÊM ĐOẠN KIỂM TRA PHIÊN LÀM VIỆC NÀY:
        // sessionStorage sẽ tự động xóa sạch khi bạn tắt tab trình duyệt
        const hasLoggedSession = sessionStorage.getItem('vts_session_logged');
        if (!hasLoggedSession) {
            writeAuditLog("LOGIN", "yt_auth", user.uid, `Tài khoản ${user.email} bắt đầu phiên làm việc quản trị.`);
            sessionStorage.setItem('vts_session_logged', 'true'); // Đánh dấu đã ghi nhận phiên này
        }

        if (loadingScreen) loadingScreen.style.display = 'none';
        if (mainContainer) mainContainer.style.display = 'block';
        
        initBackupSettings();
        loadAuditLogs();
        checkAndExecuteAutoBackup();
    } else {
        if (window.location.pathname.includes("system.html")) {
            alert("⛔ BẢO MẬT: Bạn không có quyền cấu hình hệ thống!");
            window.location.href = "admin.html";
        }
    }
});
// 2. CHUYỂN ĐỔI TAB GIAO DIỆN PHỤ
function switchSysTab(paneId, btn) {
    document.querySelectorAll('.sys-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sys-tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(paneId).classList.add('active');
    btn.classList.add('active');
}

// 3. XỬ LÝ KHÔNG GIAN LƯU TRỮ TRÊN MÁY TÍNH (FILE SYSTEM ACCESS API)
async function requestFolderPermission() {
    try {
        if (!window.showDirectoryPicker) {
            return alert("⚠️ Trình duyệt của bạn chưa hỗ trợ File System Access API. Hãy cập nhật Chrome hoặc Edge mới nhất để sử dụng tính năng chọn thư mục!");
        }

        savedDirectoryHandle = await window.showDirectoryPicker({
            mode: "readwrite"
        });

        // Cập nhật giao diện thông báo trạng thái
        const badge = document.getElementById('folder-status-badge');
        badge.className = "status-badge status-ok";
        badge.innerHTML = `<i class="fas fa-check-circle"></i> Đã chọn thư mục: ${savedDirectoryHandle.name}`;
        
        // Ghi lại trạng thái thư mục đã sẵn sàng
        localStorage.setItem('vts_backup_folder_configured', 'true');
    } catch (err) {
        console.warn("User cancelled folder picking: ", err);
    }
}

function initBackupSettings() {
    // Khôi phục cài đặt nút gạt tự động sao lưu
    const autoBackupOn = localStorage.getItem('vts_auto_backup_enabled') === 'true';
    document.getElementById('chk-auto-backup').checked = autoBackupOn;
}

function toggleAutoBackupSetting() {
    const isChecked = document.getElementById('chk-auto-backup').checked;
    localStorage.setItem('vts_auto_backup_enabled', isChecked ? 'true' : 'false');
    
    // Ghi audit log thay đổi cài đặt
    writeAuditLog("CONFIG", "yt_settings", "auto_backup", `Thay đổi cài đặt Tự động sao lưu hằng ngày thành: ${isChecked ? 'BẬT' : 'TẮT'}`);
}

// 4. LUỒNG XỬ LÝ SAO LƯU CHI TIẾT (BACKUP ENGINE)
// Danh sách tất cả 13 bảng dữ liệu hiện tại hiển thị trong hình của bạn
const ALL_SYSTEM_COLLECTIONS = [
    'announcements',
    'posts',
    'settings',
    'temp_signatures',
    'yt_notifications',
    'yt_pharmacy_items',
    'yt_pharmacy_transactions',
    'yt_stats',
    'yt_students',
    'yt_test_results',
    'yt_tests',
    'yt_tickets',
    'yt_visits',
    'yt_audit_logs' // Bao gồm cả bảng nhật ký bảo mật
];

async function executeManualBackup() {
    const btn = document.getElementById('btn-manual-backup');
    const originalText = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang chuẩn bị gói sao lưu...';
    btn.disabled = true;

    // Cấu trúc gói sao lưu duy nhất
    let fullBackupObject = {
        backup_time: new Date().toISOString(),
        created_by: currentAdmin.email,
        collections: {}
    };

    try {
        for (let colName of ALL_SYSTEM_COLLECTIONS) {
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu bảng: ${colName}...`;
            const snap = await db.collection(colName).get();
            
            let records = [];
            snap.forEach(doc => {
                records.push({ id: doc.id, ...doc.data() });
            });
            
            // Nhét dữ liệu của bảng vào đúng key tương ứng trong tệp JSON
            fullBackupObject.collections[colName] = records;
        }

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang ghi tệp tin sao lưu...';
        await saveUnifiedBackupFile(fullBackupObject);

         alert("✅ Hoàn tất quá trình sao lưu dữ liệu toàn hệ thống!");
        
        // 👉 Ghi nhận mốc thời gian sao lưu mới nhất lên tài liệu chung settings/general
        await db.collection('settings').doc('general').set({
            last_backup_time: firebase.firestore.FieldValue.serverTimestamp(),
            last_backup_by: currentAdmin.email
        }, { merge: true });

        // Làm mới lại nhãn hiển thị trên màn hình
        loadLastBackupTime();

        writeAuditLog("BACKUP", "yt_database", "full_backup", "Thực hiện sao lưu toàn bộ cơ sở dữ liệu thành một tệp tin duy nhất.");
    } catch (err) {
        alert("❌ Lỗi sao lưu hệ thống: " + err.message);
        console.error(err);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function saveUnifiedBackupFile(backupObj) {
    const jsonString = JSON.stringify(backupObj, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fullFileName = `vts_health_full_backup_${dateStr}.json`;

    if (savedDirectoryHandle) {
        try {
            const fileHandle = await savedDirectoryHandle.getFileHandle(fullFileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(jsonString);
            await writable.close();
            return;
        } catch (e) {
            console.warn("Lỗi ghi tệp trực tiếp, chuyển sang tải thông thường: ", e);
        }
    }

    const blob = new Blob([jsonString], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fullFileName;
    link.click();
}
// 5. TỰ ĐỘNG SAO LƯU KHI PHÁT HIỆN QUA NGÀY MỚI
async function checkAndExecuteAutoBackup() {
    const autoBackupOn = localStorage.getItem('vts_auto_backup_enabled') === 'true';
    if (!autoBackupOn) return;

    const todayStr = new Date().toISOString().slice(0, 10); // Định dạng: YYYY-MM-DD
    
    // 1. KIỂM TRA LỚP 1 (Bộ nhớ máy): Nếu hôm nay máy này đã tự động chạy rồi thì thoát luôn
    const lastLocalBackupDate = localStorage.getItem('vts_last_auto_backup_date');
    if (todayStr === lastLocalBackupDate) {
        console.log("Hệ thống đã tự động sao lưu trên thiết bị này hôm nay. Bỏ qua.");
        return;
    }

    try {
        // 2. KIỂM TRA LỚP 2 (Đám mây Cloud): Đề phòng trường hợp Admin đổi thiết bị khác sang làm việc
        const doc = await db.collection('settings').doc('general').get();
        if (doc.exists && doc.data().last_auto_backup_date === todayStr) {
            // Đồng bộ bộ nhớ máy và thoát để tránh ghi lặp tệp
            localStorage.setItem('vts_last_auto_backup_date', todayStr);
            console.log("Firestore xác nhận hệ thống đã được sao lưu ngày hôm nay. Bỏ qua.");
            return;
        }

        console.log("Kích hoạt tiến trình tự động sao lưu ngày mới...");
        
        // Tiến hành đóng gói toàn bộ 13 Collection hệ thống của bạn
        let fullBackupObject = {
            backup_time: new Date().toISOString(),
            created_by: "SYSTEM_AUTO_BACKUP",
            collections: {}
        };

        for (let colName of ALL_SYSTEM_COLLECTIONS) {
            const snap = await db.collection(colName).get();
            let records = [];
            snap.forEach(doc => {
                records.push({ id: doc.id, ...doc.data() });
            });
            fullBackupObject.collections[colName] = records;
        }

        // Lưu file backup ra máy tính
        await saveUnifiedBackupFile(fullBackupObject);

        // 👉 CẬP NHẬT TRẠNG THÁI: Ghi nhận ngày tự động sao lưu thành công lên mây và máy khách
        await db.collection('settings').doc('general').set({
            last_backup_time: firebase.firestore.FieldValue.serverTimestamp(),
            last_backup_by: "SYSTEM_AUTO_BACKUP",
            last_auto_backup_date: todayStr
        }, { merge: true });

        localStorage.setItem('vts_last_auto_backup_date', todayStr);
        
        // Ghi nhận nhật ký bảo mật
        writeAuditLog("AUTO_BACKUP", "yt_database", "full_backup", `Hệ thống thực hiện thành công tiến trình tự động sao lưu dữ liệu ngày mới (${todayStr}).`);
        
        // Cập nhật lại nhãn hiển thị
        loadLastBackupTime();

    } catch (e) {
        console.error("Lỗi tự động sao lưu ngày mới: ", e);
    }
}
// 6. LUỒNG KHÔI PHỤC DỮ LIỆU CHUYÊN SÂU (RESTORE ENGINE - WRITE BATCH)
function processRestore(collectionName) {
    let fileInputId = collectionName === 'yt_students' ? 'file-restore-students' : 'file-restore-visits';
    const fileInput = document.getElementById(fileInputId);
    
    if (fileInput.files.length === 0) {
        return alert("Vui lòng chọn tệp tin JSON dự phòng cần khôi phục!");
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function(e) {
        try {
            const backupData = JSON.parse(e.target.result);
            
            if (!backupData.records || !Array.isArray(backupData.records)) {
                throw new Error("Định dạng tệp tin sao lưu không hợp lệ!");
            }

            const records = backupData.records;
            if (!confirm(`⚠️ CẢNH BÁO KHÔI PHỤC:\n\nBạn đang khôi phục ${records.length} bản ghi vào bảng [${collectionName}].\nDữ liệu cũ có thể sẽ bị ghi đè. Bạn có chắc chắn muốn tiến hành?`)) {
                return;
            }

            // Sử dụng Write Batch để khôi phục nhanh (Hạn chế 500 bản ghi/lần của Firebase)
            let batch = db.batch();
            let opCount = 0;

            for (let docData of records) {
                const docId = docData.id;
                // Sao chép sâu tránh lỗi liên kết
                let payload = { ...docData };
                delete payload.id; // Không lưu trường ID rác vào thân tài liệu

                const ref = db.collection(collectionName).doc(docId);
                batch.set(ref, payload);

                opCount++;
                if (opCount === 400) { // Đạt ngưỡng an toàn 400 docs -> Gửi batch lên cloud
                    await batch.commit();
                    batch = db.batch();
                    opCount = 0;
                }
            }

            if (opCount > 0) {
                await batch.commit();
            }

            alert(`✅ Khôi phục thành công dữ liệu cho bảng [${collectionName}]!`);
            writeAuditLog("RESTORE", collectionName, "bulk_restore", `Khôi phục thành công dữ liệu từ tệp sao lưu chứa ${records.length} bản ghi.`);
            fileInput.value = ""; // Clear file

        } catch (error) {
            alert("❌ Lỗi giải mã và nạp tệp khôi phục: " + error.message);
            console.error(error);
        }
    };

    reader.readAsText(file);
}

// 7. LẮNG NGHE & TẢI AUDIT LOGS (NHẬT KÝ BẢO MẬT)
function loadAuditLogs() {
    const tbody = document.getElementById('audit-logs-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>';

    db.collection('yt_audit_logs').orderBy('timestamp', 'desc').limit(100).onSnapshot(snap => {
        tbody.innerHTML = '';
        cachedAuditLogs = []; // Reset mảng đệm mỗi khi có thay đổi

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-gray);">Hệ thống chưa ghi nhận hoạt động nào.</td></tr>';
            return;
        }

        let index = 0;
        snap.forEach(doc => {
            const d = doc.data();
            cachedAuditLogs.push({ id: doc.id, ...d }); // Lưu dữ liệu vào RAM

            const time = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString('vi-VN', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'}) : 'Vừa xong';
            
            let actionBadgeClass = "badge-active";
            if (d.action === 'DELETE' || d.action === 'RESTORE' || d.action === 'BYPASS_KEY') actionBadgeClass = "badge-inactive";
            
            // 👉 THÊM onclick="openAuditLogDetail(${index})" và cursor:pointer cho dòng bảng
            tbody.innerHTML += `
                <tr onclick="openAuditLogDetail(${index})" style="cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'" title="Nhấn để xem chi tiết thiết bị">
                    <td style="font-weight:bold; color:var(--text-gray); font-size:0.85rem;">${time}</td>
                    <td><strong>${d.userName}</strong><br><small style="color:var(--text-gray);">${d.userId}</small></td>
                    <td><span class="badge ${actionBadgeClass}" style="font-size:0.75rem;">${d.action}</span></td>
                    <td style="font-size: 0.9rem; font-weight: 500; color: #334155;">${d.description}</td>
                </tr>
            `;
            index++;
        });
    }, error => {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Lỗi tải dữ liệu nhật ký: ${error.message}</td></tr>`;
    });
}
// 8. HÀM GHI NHẬT KÝ SỬ DỤNG CHUNG (HELPER)
async function writeAuditLog(action, targetCollection, targetId, description) {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        console.log("🛠️ Dev Mode: localhost detected. Skip writing audit log.");
        return; 
    }

    // 👉 THAY THẾ ĐOẠN KIỂM TRA CŨ BẰNG CƠ CHẾ DỰ PHÒNG THÔNG MINH NÀY:
    const activeUser = currentAdmin || firebase.auth().currentUser;
    if (!activeUser) {
        console.warn("Skip writing audit log: No authenticated user found.");
        return; // Chỉ thoát nếu thực sự không có tài khoản nào đang đăng nhập
    }

    try {
        await db.collection('yt_audit_logs').add({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userId: activeUser.email,
            userName: activeUser.displayName || "Quản trị viên", // Sẽ lấy tên từ tài khoản Google
            action: action,
            target: targetCollection,
            targetId: targetId,
            description: description,
            clientInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                deviceName: getDeviceDisplayName()
            }
        });
    } catch (e) {
        console.error("Ghi nhật ký bảo mật thất bại:", e);
    }
}
async function processUniversalRestore() {
    const fileInput = document.getElementById('file-restore-universal');
    const btn = document.getElementById('btn-universal-restore');
    
    if (fileInput.files.length === 0) {
        return alert("Vui lòng chọn tệp tin JSON sao lưu toàn hệ thống trước khi khôi phục!");
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function(e) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang giải mã tệp tin...';
        btn.disabled = true;

        try {
            const backupObj = JSON.parse(e.target.result);
            
            if (!backupObj.collections || typeof backupObj.collections !== 'object') {
                throw new Error("Cấu trúc tệp tin khôi phục không hợp lệ hoặc thiếu dữ liệu phân mục!");
            }

            if (!confirm(`⚠️ CẢNH BÁO BẢO MẬT:\n\nHệ thống chuẩn bị ghi đè dữ liệu.\nNhững bản ghi đã tồn tại trên Cloud Firestore sẽ được giữ nguyên (Bỏ qua khôi phục để tránh trùng lặp).\n\nBạn chắc chắn muốn tiếp tục?`)) {
                btn.innerHTML = originalText; btn.disabled = false;
                return;
            }

            const collectionsToRestore = backupObj.collections;
            let totalRestored = 0;
            let totalSkipped = 0;

            // Chạy qua từng bảng trong tệp JSON
            for (let [colName, records] of Object.entries(collectionsToRestore)) {
                if (!records || !Array.isArray(records) || records.length === 0) continue;

                btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang xử lý bảng: ${colName}...`;

                let batch = db.batch();
                let opCount = 0;

                for (let docData of records) {
                    const docId = docData.id;
                    let payload = { ...docData };
                    delete payload.id; // Xóa ID ra khỏi thân dữ liệu

                    // 👉 KIỂM TRA ĐỐI CHIẾU: Nếu tài liệu đã tồn tại trên Firestore -> Bỏ qua
                    const docRef = db.collection(colName).doc(docId);
                    const docSnap = await docRef.get();

                    if (docSnap.exists) {
                        totalSkipped++;
                        continue; // Nhảy sang bản ghi tiếp theo
                    }

                    batch.set(docRef, payload);
                    totalRestored++;
                    opCount++;

                    if (opCount === 400) {
                        await batch.commit();
                        batch = db.batch();
                        opCount = 0;
                    }
                }

                if (opCount > 0) {
                    await batch.commit();
                }
            }

            alert(`✅ KHÔI PHỤC THÔNG MINH HOÀN TẤT!\n\n- Bản ghi khôi phục mới: ${totalRestored}\n- Bản ghi đã tồn tại (Bỏ qua trùng lặp): ${totalSkipped}`);
            writeAuditLog("RESTORE", "yt_database", "universal_restore", `Khôi phục thông minh toàn bộ CSDL. Nạp mới: ${totalRestored}, Bỏ qua: ${totalSkipped}`);
            fileInput.value = ""; // Reset file

        } catch (error) {
            alert("❌ Khôi phục thất bại: " + error.message);
            console.error(error);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };

    reader.readAsText(file);
}
// --- BỘ ĐIỀU KHIỂN KHÓA GIẢI MÃ KHẨN CẤP (EMERGENCY BYPASS) ---

function applyManualCryptoKey() {
    const inputVal = document.getElementById('manual-key-input').value.trim();
    if (!inputVal) {
        return alert("Vui lòng nhập chuỗi khóa bí mật khẩn cấp!");
    }

    // Ghi đè trực tiếp khóa thủ công của Admin nhập vào sessionStorage của trình duyệt
    sessionStorage.setItem('vts_master_crypto_key', inputVal);
    
    alert("🔒 Đã kích hoạt và áp dụng khóa giải mã khẩn cấp thành công!");
    document.getElementById('manual-key-input').value = ""; // Xóa rỗng ô nhập liệu
    
    // Tự động làm mới bảng nhật ký để kiểm chứng kết quả giải mã tức thì
    loadAuditLogs();
    
    // Ghi nhận nhật ký bảo mật hành động nhập khóa khẩn cấp
    writeAuditLog("BYPASS_KEY", "yt_database", "manual_override", "Quản trị viên sử dụng khóa dự phòng mở khóa khẩn cấp dữ liệu.");
}
// --- BỘ ĐIỀU KHIỂN XEM CHI TIẾT NHẬT KÝ BẢO MẬT ---

function openAuditLogDetail(index) {
    const log = cachedAuditLogs[index];
    if (!log) return;

    const time = log.timestamp ? log.timestamp.toDate().toLocaleString('vi-VN') : 'N/A';
    
    // Gán dữ liệu cơ bản lên Popup
    document.getElementById('log-det-action').innerText = log.action;
    document.getElementById('log-det-time').innerText = time;
    document.getElementById('log-det-user').innerHTML = `<strong>${log.userName}</strong> <br>Email: ${log.userId}`;
    document.getElementById('log-det-target').innerText = log.target;
    document.getElementById('log-det-target-id').innerText = log.targetId || '--';
    document.getElementById('log-det-desc').innerText = log.description;
    
    // Đọc trường lồng clientInfo bảo vệ chống lỗi nếu bản ghi cũ thiếu dữ liệu
    const client = log.clientInfo || {};
    document.getElementById('log-det-device').innerText = client.deviceName || "Không rõ";
    document.getElementById('log-det-platform').innerText = client.platform || '--';
    document.getElementById('log-det-ua').innerText = client.userAgent || '--';

    // Đổi cấu hình hiển thị của badge tác vụ tương ứng
    const badge = document.getElementById('log-det-action');
    if (log.action === 'DELETE' || log.action === 'RESTORE' || log.action === 'BYPASS_KEY') {
        badge.className = "badge badge-inactive";
    } else {
        badge.className = "badge badge-active";
    }

    // Mở hiển thị Popup
    document.getElementById('audit-detail-modal').style.display = 'flex';
}
// Hàm tải mốc thời gian sao lưu gần nhất từ Cloud Firestore hiển thị lên màn hình
async function loadLastBackupTime() {
    try {
        const doc = await db.collection('settings').doc('general').get();
        const lbl = document.getElementById('lbl-last-backup-time');
        if (!lbl) return;

        if (doc.exists && doc.data().last_backup_time) {
            const time = doc.data().last_backup_time.toDate();
            lbl.innerText = time.toLocaleString('vi-VN');
        } else {
            lbl.innerText = "Chưa có bản sao lưu nào";
        }
    } catch (e) {
        console.error("Lỗi lấy thời gian sao lưu gần nhất:", e);
    }
}
// --- BỘ GIẢI MÃ TÊN THIẾT BỊ TỰ ĐỘNG (USER-AGENT PARSER) ---
function getDeviceDisplayName() {
    const ua = navigator.userAgent;
    let os = "Hệ điều hành không rõ";
    let browser = "Trình duyệt không rõ";

    // 1. Nhận diện hệ điều hành (OS)
    if (/Windows/i.test(ua)) os = "Máy tính Windows";
    else if (/Macintosh|Mac OS X/i.test(ua)) os = "Máy tính Macbook/Mac";
    else if (/iPhone/i.test(ua)) os = "Điện thoại iPhone";
    else if (/iPad/i.test(ua)) os = "Máy tính bảng iPad";
    else if (/Android/i.test(ua)) os = "Điện thoại Android";
    else if (/Linux/i.test(ua)) os = "Hệ điều hành Linux";

    // 2. Nhận diện trình duyệt (Browser)
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome";
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
    else if (/Edg/i.test(ua)) browser = "Microsoft Edge";
    else if (/Firefox/i.test(ua)) browser = "Firefox";
    else if (/Zalo/i.test(ua)) browser = "Zalo WebView";
    else if (/FBAN|FBAV/i.test(ua)) browser = "Facebook App";

    return `${os} (${browser})`;
}