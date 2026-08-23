/* =========================================================================
   HỆ THỐNG DEMO TOÀN DIỆN & TỰ ĐỘNG 100% CHO BAN GIÁM KHẢO (ALL-IN-ONE)
   Không cần chỉnh sửa bất kỳ file nào khác trong hệ thống!
   ========================================================================= */

const DEMO_ACCOUNT_EMAIL = "bgk.demo@yteso.vn";
const DEMO_ACCOUNT_PASS = "Demo@BGK2025";

// 1. TỰ ĐỘNG NẠP EMAIL VÀO DANH SÁCH SUPER ADMIN CỦA TOÀN HỆ THỐNG
(function autoWhitelistAdmin() {
    function injectEmail() {
        if (typeof ALLOWED_ADMIN_EMAILS !== 'undefined' && Array.isArray(ALLOWED_ADMIN_EMAILS)) {
            if (!ALLOWED_ADMIN_EMAILS.includes(DEMO_ACCOUNT_EMAIL)) {
                ALLOWED_ADMIN_EMAILS.push(DEMO_ACCOUNT_EMAIL);
            }
        }
    }
    injectEmail();
    window.addEventListener('DOMContentLoaded', injectEmail);
})();

// DANH SÁCH TOÀN BỘ 20 COLLECTION CẦN CÁCH LY
const DEMO_ISOLATED_COLLECTIONS = [
    'ai_memory_notes', 'announcements', 'posts', 'temp_signatures',
    'yt_audit_logs', 'yt_collaborators', 'yt_exam_campaigns', 'yt_exam_results',
    'yt_media_assets', 'yt_notifications', 'yt_pharmacy_items', 'yt_pharmacy_transactions',
    'yt_stats', 'yt_students', 'yt_test_results', 'yt_tests',
    'yt_tickets', 'yt_visits', 'yt_beds', 'yt_attendance'
];

// BỘ DỮ LIỆU MẪU CHUẨN HOÀN CHỈNH
const INITIAL_DEMO_DATA = {
    yt_students: [
        { id: "YT-10001", name: "Nguyễn Hoàng Long", class: "10A1", studentCode: "HS1001", linkedEmail: "bgk.demo@yteso.vn", dob: "2008-03-15", gender: "Nam", height: "170", weight: "62", phone: "0901234567", parentPhone: "0912345678", street: "123 Cách Mạng Tháng Tám", ward: "Xã Đất Đỏ", city: "Thành phố Hồ Chí Minh", medicalNote: "Tiền sử hen phế quản nhẹ" },
        { id: "YT-10002", name: "Trần Thị Mai Anh", class: "11A4", studentCode: "HS1002", dob: "2007-08-20", gender: "Nữ", height: "160", weight: "48", phone: "0902345678", parentPhone: "0913456789", street: "45 Lê Lợi", ward: "Xã Long Điền", city: "Thành phố Hồ Chí Minh", medicalNote: "Dị ứng Paracetamol" },
        { id: "YT-10003", name: "Lê Quốc Bảo", class: "12A2", studentCode: "HS1003", dob: "2006-11-05", gender: "Nam", height: "175", weight: "68", phone: "0903456789", parentPhone: "0914567890", street: "78 Hùng Vương", ward: "Xã Phước Hải", city: "Thành phố Hồ Chí Minh", medicalNote: "" }
    ],
    yt_beds: [
        { id: "bed_1", name: "Nguyễn Hoàng Long", class: "10A1", visitId: "VISIT_DEMO_01", startTime: new Date() }
    ],
    yt_visits: [
        { id: "VISIT_DEMO_01", studentId: "YT-10001", name: "Nguyễn Hoàng Long", class: "10A1", symptom: "Sốt nhẹ 38°C, đau đầu, chóng mặt", treatment: "Cấp 01 gói Oresol, nằm nghỉ tại giường số 1", note: "Học sinh đã ổn định và quay lại lớp sau tiết 3", bed: "1", status: "completed", timestamp: new Date() }
    ],
    yt_pharmacy_items: [
        { id: "MED-001", name: "Paracetamol 500mg", type: "drug", unit: "Viên", batches: [{ lot: "LOT202501", qty: 250, expiry: "2026-12-31" }] },
        { id: "MED-002", name: "Oresol 245mg", type: "drug", unit: "Gói", batches: [{ lot: "LOT202502", qty: 85, expiry: "2026-06-30" }] },
        { id: "MED-003", name: "Băng dán cá nhân Urgo", type: "supply", unit: "Miếng", batches: [{ lot: "LOT202503", qty: 500, expiry: "2027-01-01" }] }
    ],
    yt_exam_campaigns: [
        { id: "DOTKHAM_2025_K10", name: "Khám sức khỏe đầu năm học 2025-2026", createdAt: new Date() }
    ],
    yt_exam_results: [
        { id: "EXAM_RES_01", campaignId: "DOTKHAM_2025_K10", studentId: "YT-10001", name: "Nguyễn Hoàng Long", class: "10A1", height: "170", weight: "62", facility: "Trung tâm Y tế Huyện", examDate: new Date().toISOString().split('T')[0], reportDate: new Date().toISOString().split('T')[0], eyes: "10/10 (Bình thường)", dental: "Có sâu 01 răng hàm dưới", ent: "Bình thường", internalMedicine: "Bình thường", surgery: "Bình thường", mentalHealth: "Bình thường", summary: { physicalDev: "Thể lực tốt", mentalDev: "Bình thường", healthStatus: "Đủ điều kiện học tập", notes: "Trám răng sâu sớm", advice: "Khám chuyên khoa Răng Hàm Mặt" } }
    ],
    yt_attendance: [
        { id: "ATT_DEMO_01", studentId: "YT-10001", date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], reason: "B", diagnosis: "Cảm cúm mùa", symptom: "Sốt, ho có đờm" }
    ],
    yt_tests: [
        { id: "TEST_STRESS_01", title: "Thang đánh giá lo âu & trầm cảm DASS-21", type: "mental", description: "Đánh giá mức độ stress học đường", totalQuestions: 21, active: true }
    ],
    yt_tickets: [
        { id: "TK_DEMO_01", ticketId: "REQ-88992", studentId: "YT-10001", name: "Nguyễn Hoàng Long", class: "10A1", content: "Thưa cô, em muốn cập nhật lại thông tin dị ứng thuốc của em trong hồ sơ y tế ạ.", status: "resolved", adminReply: "Chào em, Phòng Y Tế đã ghi nhận và cập nhật vào hồ sơ theo dõi rồi nhé!", timestamp: new Date(Date.now() - 86400000) }
    ],
    yt_notifications: [
        { id: "NOTI_DEMO_01", title: "Nhắc nhở khám sức khỏe định kỳ Khối 10", content: "Chào bạn Long, sáng mai bạn nhớ có mặt tại phòng Y tế lúc 8h00 để kiểm tra chuyên khoa Răng Hàm Mặt nhé.", targetType: "student", targetValue: ["YT-10001"], sender: "Phòng Y Tế", timestamp: new Date() }
    ],
    ai_memory_notes: [
        { id: "NOTE_AI_01", title: "Lưu ý dịch tễ học đường", content: "Mùa mưa đang đến, cần theo dõi sát các ca sốt xuất huyết và cảm cúm mùa ở khối 10 và 11.", timestamp: new Date() }
    ],
    yt_stats: [
        { id: `${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getFullYear()}`, monthInfo: `${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getFullYear()}`, lastUpdated: new Date(), topSymptoms: [{ name: "Sốt & Cảm cúm", count: 12 }, { name: "Đau đầu, Chóng mặt", count: 8 }, { name: "Đau bụng tiêu hóa", count: 5 }], studentVisits: { "YT-10001": 1 } }
    ]
};

// =========================================================================
// CAN THIỆP TẦNG LÕI PROTOTYPE CỦA FIRESTORE (CHẮC CHẮN ĐỔI BẢNG 100%)
// =========================================================================
(function hookFirestorePrototype() {
    function applyHook() {
        if (window.firebase && firebase.firestore && firebase.firestore.Firestore) {
            if (!firebase.firestore.Firestore.prototype._originalCollection) {
                firebase.firestore.Firestore.prototype._originalCollection = firebase.firestore.Firestore.prototype.collection;

                // Ghi đè phương thức collection của Firestore ở cấp độ Prototype gốc
                firebase.firestore.Firestore.prototype.collection = function(name) {
                    const isDemo = sessionStorage.getItem('is_demo_mode') === 'true' || window.isDemoMode;
                    if (isDemo && DEMO_ISOLATED_COLLECTIONS.includes(name)) {
                        return this._originalCollection(`demo_${name}`);
                    }
                    return this._originalCollection(name);
                };
            }
        }
    }
    applyHook();
    window.addEventListener('load', applyHook);
})();

// Hàm kích hoạt chế độ Demo
function enableDemoMode() {
    window.isDemoMode = true;
    sessionStorage.setItem('is_demo_mode', 'true');

    // XÓA SẠCH BỘ NHỚ ĐỆM CỦA DỮ LIỆU THẬT ĐỂ TRÁNH BỊ LƯU TRÊN TRÌNH DUYỆT
    sessionStorage.removeItem('vts_students_cache');
    sessionStorage.removeItem('vts_session_logged');
    if (window.allStudents) window.allStudents = [];

    renderDemoTopBanner();
}

// =========================================================================
// HÀM RESET & NẠP TỰ ĐỘNG DỮ LIỆU MẪU LÊN CLOUD
// =========================================================================
async function resetDemoDatabase(showToast = true) {
    if (typeof sysLoading === 'function') sysLoading(true, "Đang khởi tạo toàn bộ 20 bảng dữ liệu mẫu...");

    try {
        const rawDb = firebase.firestore();
        const getRawCol = (name) => rawDb._originalCollection ? rawDb._originalCollection(name) : rawDb.collection(name);

        // 1. Xóa dữ liệu demo cũ
        for (const colName of DEMO_ISOLATED_COLLECTIONS) {
            const snap = await getRawCol(`demo_${colName}`).get();
            const batch = rawDb.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        // 2. Nạp dữ liệu mẫu mới
        for (const [colName, docs] of Object.entries(INITIAL_DEMO_DATA)) {
            const batch = rawDb.batch();
            docs.forEach(item => {
                const docRef = getRawCol(`demo_${colName}`).doc(item.id);
                let payload = { ...item };

                if (typeof encryptField === 'function') {
                    ['name', 'class', 'dob', 'phone', 'parentPhone', 'street', 'symptom', 'treatment', 'note'].forEach(f => {
                        if (payload[f]) payload[f] = encryptField(payload[f]);
                    });
                    if (payload.name) payload.name_search = encryptField(removeVietnameseTones(item.name));
                }
                batch.set(docRef, payload);
            });
            await batch.commit();
        }

        sessionStorage.removeItem('vts_students_cache');
        if (window.allStudents) window.allStudents = [];

        if (showToast && typeof sysAlert === 'function') {
            sysAlert("Đã hoàn nguyên dữ liệu mẫu thành công!", "success");
            setTimeout(() => window.location.reload(), 800);
        }
    } catch (err) {
        console.error("Lỗi Reset Demo:", err);
        if (typeof sysAlert === 'function') sysAlert("Lỗi: " + err.message, "error");
    } finally {
        if (typeof sysLoading === 'function') sysLoading(false);
    }
}

// Kiểm tra xem database demo có dữ liệu chưa, nếu chưa có thì tự động tạo luôn
async function autoSeedIfEmpty() {
    try {
        const rawDb = firebase.firestore();
        const getRawCol = (name) => rawDb._originalCollection ? rawDb._originalCollection(name) : rawDb.collection(name);
        const checkSnap = await getRawCol('demo_yt_students').limit(1).get();
        
        if (checkSnap.empty) {
            console.log("Database demo trống, đang tự động nạp dữ liệu mẫu...");
            await resetDemoDatabase(false);
            window.location.reload();
        }
    } catch (e) {
        console.warn("Auto-seed check:", e);
    }
}

// Render thanh công cụ màu cam trên đầu trang
function renderDemoTopBanner() {
    if (document.getElementById('demo-top-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'demo-top-banner';
    banner.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; z-index: 9999999;
        background: linear-gradient(90deg, #f59e0b, #d97706);
        color: white; padding: 6px 15px; font-size: 0.85rem; font-weight: bold;
        display: flex; justify-content: space-between; align-items: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.15);
    `;
    banner.innerHTML = `
        <div>
            <i class="fas fa-flask"></i> <strong>PHIÊN BẢN TRẢI NGHIỆM BAN GIÁM KHẢO</strong> 
            <span style="font-weight:normal; margin-left:8px; opacity:0.9;">(Dữ liệu mẫu độc lập - Toàn quyền thao tác)</span>
        </div>
        <div>
            <button onclick="resetDemoDatabase()" style="background: white; color: #b45309; border: none; padding: 4px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; cursor: pointer;">
                🔄 Khôi phục dữ liệu gốc
            </button>
        </div>
    `;
    document.body.prepend(banner);
    document.body.style.paddingTop = "34px";
}

// Lắng nghe đăng nhập để tự kích hoạt chế độ Demo
window.addEventListener('load', () => {
    if (window.firebase && firebase.auth()) {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user && user.email && user.email.toLowerCase() === DEMO_ACCOUNT_EMAIL) {
                enableDemoMode();
                await autoSeedIfEmpty();
            } else if (!user) {
                sessionStorage.removeItem('is_demo_mode');
            }
        });
    }
});
