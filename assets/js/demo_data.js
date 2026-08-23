/* ==========================================================
   HỆ THỐNG DEMO TOÀN DIỆN CHO BAN GIÁM KHẢO (ĐÃ FIX LỖI 100%)
   ========================================================== */
if (typeof ALLOWED_ADMIN_EMAILS !== 'undefined' && Array.isArray(ALLOWED_ADMIN_EMAILS)) {
    if (!ALLOWED_ADMIN_EMAILS.includes("bgk.demo@yteso.vn")) {
        ALLOWED_ADMIN_EMAILS.push("bgk.demo@yteso.vn");
    }
}
const DEMO_ACCOUNT_EMAIL = "bgk.demo@yteso.vn";
const DEMO_ACCOUNT_PASS = "Demo@BGK2025";

// DANH SÁCH TOÀN BỘ 20 COLLECTION CẦN CÁCH LY
const DEMO_ISOLATED_COLLECTIONS = [
    'ai_memory_notes',
    'announcements',
    'posts',
    'temp_signatures',
    'yt_audit_logs',
    'yt_collaborators',
    'yt_exam_campaigns',
    'yt_exam_results',
    'yt_media_assets',
    'yt_notifications',
    'yt_pharmacy_items',
    'yt_pharmacy_transactions',
    'yt_stats',
    'yt_students',
    'yt_test_results',
    'yt_tests',
    'yt_tickets',
    'yt_visits',
    'yt_beds',
    'yt_attendance'
];

// BỘ DỮ LIỆU MẪU CHUẨN HÓA DẠNG MẢNG (ARRAY)
const INITIAL_DEMO_DATA = {
    // 1. Học sinh mẫu
    yt_students: [
        { 
            id: "YT-10001", 
            name: "Nguyễn Hoàng Long", 
            class: "10A1", 
            studentCode: "HS1001", 
            linkedEmail: "bgk.demo@yteso.vn",
            dob: "2008-03-15", 
            gender: "Nam", 
            height: "170", 
            weight: "62", 
            phone: "0901234567", 
            parentPhone: "0912345678", 
            street: "123 Cách Mạng Tháng Tám", 
            ward: "Xã Đất Đỏ", 
            city: "Thành phố Hồ Chí Minh", 
            medicalNote: "Tiền sử hen phế quản nhẹ" 
        },
        { 
            id: "YT-10002", 
            name: "Trần Thị Mai Anh", 
            class: "11A4", 
            studentCode: "HS1002", 
            dob: "2007-08-20", 
            gender: "Nữ", 
            height: "160", 
            weight: "48", 
            phone: "0902345678", 
            parentPhone: "0913456789", 
            street: "45 Lê Lợi", 
            ward: "Xã Long Điền", 
            city: "Thành phố Hồ Chí Minh", 
            medicalNote: "Dị ứng Paracetamol" 
        },
        { 
            id: "YT-10003", 
            name: "Lê Quốc Bảo", 
            class: "12A2", 
            studentCode: "HS1003", 
            dob: "2006-11-05", 
            gender: "Nam", 
            height: "175", 
            weight: "68", 
            phone: "0903456789", 
            parentPhone: "0914567890", 
            street: "78 Hùng Vương", 
            ward: "Xã Phước Hải", 
            city: "Thành phố Hồ Chí Minh", 
            medicalNote: "" 
        }
    ],

    // 2. Giường bệnh
    yt_beds: [
        { id: "bed_1", name: "Nguyễn Hoàng Long", class: "10A1", visitId: "VISIT_DEMO_01", startTime: new Date() }
    ],

    // 3. Lượt tiếp nhận / khám mẫu
    yt_visits: [
        { 
            id: "VISIT_DEMO_01", 
            studentId: "YT-10001", 
            name: "Nguyễn Hoàng Long", 
            class: "10A1", 
            symptom: "Sốt nhẹ 38°C, đau đầu, chóng mặt", 
            treatment: "Cấp 01 gói Oresol, nằm nghỉ tại giường số 1", 
            note: "Học sinh đã ổn định và quay lại lớp sau tiết 3", 
            bed: "1", 
            status: "completed", 
            timestamp: new Date() 
        }
    ],

    // 4. Kho Dược & Vật tư
    yt_pharmacy_items: [
        { id: "MED-001", name: "Paracetamol 500mg", type: "drug", unit: "Viên", batches: [{ lot: "LOT202501", qty: 250, expiry: "2026-12-31" }] },
        { id: "MED-002", name: "Oresol 245mg", type: "drug", unit: "Gói", batches: [{ lot: "LOT202502", qty: 85, expiry: "2026-06-30" }] },
        { id: "MED-003", name: "Băng dán cá nhân Urgo", type: "supply", unit: "Miếng", batches: [{ lot: "LOT202503", qty: 500, expiry: "2027-01-01" }] }
    ],

    // 5. Đợt khám sức khỏe định kỳ
    yt_exam_campaigns: [
        { id: "DOTKHAM_2025_K10", name: "Khám sức khỏe đầu năm học 2025-2026", createdAt: new Date() }
    ],
    yt_exam_results: [
        { 
            id: "EXAM_RES_01", 
            campaignId: "DOTKHAM_2025_K10", 
            studentId: "YT-10001", 
            name: "Nguyễn Hoàng Long", 
            class: "10A1", 
            height: "170", 
            weight: "62", 
            facility: "Trung tâm Y tế Huyện", 
            examDate: new Date().toISOString().split('T')[0],
            reportDate: new Date().toISOString().split('T')[0],
            eyes: "10/10 (Bình thường)", 
            dental: "Có sâu 01 răng hàm dưới", 
            ent: "Bình thường",
            internalMedicine: "Bình thường",
            surgery: "Bình thường",
            mentalHealth: "Bình thường",
            summary: {
                physicalDev: "Thể lực tốt",
                mentalDev: "Bình thường",
                healthStatus: "Đủ điều kiện học tập và rèn luyện thể chất",
                notes: "Trám răng sâu sớm",
                advice: "Khám chuyên khoa Răng Hàm Mặt"
            }
        }
    ],

    // 6. Lịch sử điểm danh (Nghỉ học)
    yt_attendance: [
        {
            id: "ATT_DEMO_01",
            studentId: "YT-10001",
            date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
            reason: "B",
            diagnosis: "Cảm cúm mùa",
            symptom: "Sốt, ho có đờm"
        }
    ],

    // 7. Trắc nghiệm tâm lý
    yt_tests: [
        { id: "TEST_STRESS_01", title: "Thang đánh giá lo âu & trầm cảm DASS-21", type: "mental", description: "Đánh giá mức độ stress học đường", totalQuestions: 21, active: true }
    ],

    // 8. Hòm thư hỗ trợ (Tickets)
    yt_tickets: [
        { 
            id: "TK_DEMO_01",
            ticketId: "REQ-88992", 
            studentId: "YT-10001", 
            name: "Nguyễn Hoàng Long", 
            class: "10A1", 
            content: "Thưa cô, em muốn cập nhật lại thông tin dị ứng thuốc của em trong hồ sơ y tế ạ.", 
            status: "resolved", 
            adminReply: "Chào em, Phòng Y Tế đã ghi nhận và cập nhật vào hồ sơ theo dõi rồi nhé!", 
            timestamp: new Date(Date.now() - 86400000) 
        }
    ],

    // 9. Thông báo
    yt_notifications: [
        { 
            id: "NOTI_DEMO_01", 
            title: "Nhắc nhở khám sức khỏe định kỳ Khối 10", 
            content: "Chào bạn Long, sáng mai bạn nhớ có mặt tại phòng Y tế lúc 8h00 để hoàn tất kiểm tra chuyên khoa Răng Hàm Mặt nhé.", 
            targetType: "student", 
            targetValue: ["YT-10001"], 
            sender: "Phòng Y Tế", 
            timestamp: new Date() 
        }
    ],

    // 10. Bộ nhớ AI
    ai_memory_notes: [
        { id: "NOTE_AI_01", title: "Lưu ý dịch tễ học đường", content: "Mùa mưa đang đến, cần theo dõi sát các ca sốt xuất huyết và cảm cúm mùa ở khối 10 và 11.", timestamp: new Date() }
    ],

    // 11. Thống kê tháng (Đã chuyển thành Array chuẩn)
    yt_stats: [
        {
            id: `${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getFullYear()}`,
            monthInfo: `${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getFullYear()}`,
            lastUpdated: new Date(),
            topSymptoms: [
                { name: "Sốt & Cảm cúm", count: 12 },
                { name: "Đau đầu, Chóng mặt", count: 8 },
                { name: "Đau bụng tiêu hóa", count: 5 }
            ],
            studentVisits: {
                "YT-10001": 1
            }
        }
    ]
};

// ==========================================================
// CƠ CHẾ ĐÁNH CHẶN & CHUYỂN HƯỚNG DATABASE
// ==========================================================
(function initDemoInterceptor() {
    const isDemo = sessionStorage.getItem('is_demo_mode') === 'true';
    if (isDemo) {
        enableDemoMode();
    }
})();

function enableDemoMode() {
    window.isDemoMode = true;
    sessionStorage.setItem('is_demo_mode', 'true');

    if (window.db && typeof db.collection === 'function' && !db._isIntercepted) {
        const originalCollection = db.collection.bind(db);
        
        db.collection = function(name) {
            if (DEMO_ISOLATED_COLLECTIONS.includes(name)) {
                return originalCollection(`demo_${name}`);
            }
            return originalCollection(name);
        };
        db._isIntercepted = true;
    }

    window.addEventListener('DOMContentLoaded', renderDemoTopBanner);
}

// Hàm đăng nhập 1-click cho BGK (Tự động tạo tài khoản Firebase Auth nếu chưa có)
async function loginDemoJudge() {
    if (typeof sysLoading === 'function') sysLoading(true, "Đang kết nối phiên Ban Giám Khảo...");
    enableDemoMode();

    try {
        await firebase.auth().signInWithEmailAndPassword(DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASS);
    } catch(err) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            // Tự động khởi tạo user trên Firebase Auth nếu chưa tồn tại
            try {
                await firebase.auth().createUserWithEmailAndPassword(DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASS);
                // Nạp sẵn data lần đầu
                await resetDemoDatabase(false);
            } catch(createErr) {
                alert("Lỗi tạo phiên demo: " + createErr.message);
            }
        } else {
            alert("Lỗi đăng nhập demo: " + err.message);
        }
    } finally {
        if (typeof sysLoading === 'function') sysLoading(false);
    }
}

// Hàm phục hồi dữ liệu mẫu
async function resetDemoDatabase(showToast = true) {
    if (typeof sysLoading === 'function') sysLoading(true, "Đang khôi phục toàn bộ 20 bảng dữ liệu mẫu...");
    
    try {
        const originalCollection = db.collection.bind(db);

        // 1. Xóa sạch các collection demo
        for (const colName of DEMO_ISOLATED_COLLECTIONS) {
            const snap = await originalCollection(`demo_${colName}`).get();
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        // 2. Nạp lại dữ liệu gốc ban đầu
        for (const [colName, docs] of Object.entries(INITIAL_DEMO_DATA)) {
            const batch = db.batch();
            docs.forEach(item => {
                const docRef = originalCollection(`demo_${colName}`).doc(item.id);
                let payload = { ...item };

                // Tự động mã hóa nếu hệ thống dùng Crypto
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

// Banner hiển thị trên đầu
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
            <i class="fas fa-flask"></i> <strong>CHẾ ĐỘ TRẢI NGHIỆM BAN GIÁM KHẢO</strong> 
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

// Đồng bộ khi đăng nhập/đăng xuất
window.addEventListener('load', () => {
    if (window.firebase && firebase.auth()) {
        firebase.auth().onAuthStateChanged(user => {
            if (user && user.email && user.email.toLowerCase() === DEMO_ACCOUNT_EMAIL) {
                enableDemoMode();
            } else if (!user) {
                sessionStorage.removeItem('is_demo_mode');
            }
        });
    }
});
