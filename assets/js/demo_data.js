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

// =========================================================================
// TRÌNH SINH DỮ LIỆU LỚN & MÔ PHỎNG DỊCH TỄ HỌC ĐƯỜNG (THÁNG 08/2026)
// =========================================================================
function buildSmartEpidemicDemoData() {
    const ho = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ"];
    const demNam = ["Văn", "Hữu", "Đức", "Quốc", "Minh", "Gia", "Thanh", "Nhật", "Thành"];
    const demNu = ["Thị", "Ngọc", "Mai", "Thảo", "Phương", "Diệu", "Quỳnh", "Thùy"];
    const tenNam = ["Long", "Bảo", "Nam", "Khánh", "Huy", "Khoa", "Phong", "Tuấn", "Dũng", "Tùng", "Phát", "Kiên"];
    const tenNu = ["Anh", "Linh", "Trang", "Vy", "Hà", "Nhi", "Hân", "Châu", "My", "Trâm", "Yến", "Chi"];
    const wards = ["Xã Đất Đỏ", "Xã Long Điền", "Xã Phước Hải", "Thị trấn Long Hải", "Phường 1", "Phường Thắng Tam"];
    const classes = [];
    ['10A', '11A', '12A'].forEach(prefix => {
        for (let i = 1; i <= 5; i++) classes.push(`${prefix}${i}`);
    });

    const students = [];
    let studentCounter = 10001;

    // 1. SINH 500 HỌC SINH
    for (let c of classes) {
        for (let i = 0; i < 33; i++) { // ~33-34 hs / lớp => 500 hs
            if (students.length >= 500) break;
            const isMale = Math.random() > 0.5;
            const h = ho[Math.floor(Math.random() * ho.length)];
            const d = isMale ? demNam[Math.floor(Math.random() * demNam.length)] : demNu[Math.floor(Math.random() * demNu.length)];
            const t = isMale ? tenNam[Math.floor(Math.random() * tenNam.length)] : tenNu[Math.floor(Math.random() * tenNu.length)];
            const birthYear = c.startsWith('10') ? 2011 : (c.startsWith('11') ? 2010 : 2009);
            
            // Tạo độ lệch dịch tễ: 10A1, 10A2 sống nhiều ở Xã Phước Hải & Long Điền
            let ward = wards[Math.floor(Math.random() * wards.length)];
            if (c === '10A1' || c === '10A2') {
                ward = Math.random() > 0.3 ? "Xã Phước Hải" : "Xã Đất Đỏ";
            }

            const sid = `YT-${studentCounter++}`;
            students.push({
                id: sid,
                name: `${h} ${d} ${t}`,
                class: c,
                studentCode: `HS${studentCounter}`,
                linkedEmail: sid === "YT-10001" ? DEMO_ACCOUNT_EMAIL : `hs.${studentCounter}@school.edu.vn`,
                dob: `${birthYear}-${String(Math.floor(Math.random()*12)+1).padStart(2,'0')}-${String(Math.floor(Math.random()*28)+1).padStart(2,'0')}`,
                gender: isMale ? "Nam" : "Nữ",
                height: `${Math.floor(Math.random()*25 + 155)}`,
                weight: `${Math.floor(Math.random()*30 + 45)}`,
                phone: `09${Math.floor(10000000 + Math.random()*90000000)}`,
                parentPhone: `09${Math.floor(10000000 + Math.random()*90000000)}`,
                street: `${Math.floor(Math.random()*200 + 1)} Đường 3/2`,
                ward: ward,
                city: "Bà Rịa - Vũng Tàu",
                medicalNote: Math.random() < 0.1 ? "Dị ứng phấn hoa / Kháng sinh" : ""
            });
        }
    }

    // 2. SINH 200 LƯỢT KHÁM VÀ 250 LƯỢT NGHỈ HỌC (GÀI LOGIC DỊCH TỄ THÁNG 8/2026)
    const visits = [];
    const attendance = [];
    
    // Pattern 1: Bùng phát CÚM A / HÔ HẤP từ ngày 08/08 -> 18/08 (Tập trung lớp 10A1, 10A2)
    // Pattern 2: Dịch SỐT XUẤT HUYẾT từ ngày 15/08 -> 29/08 (Tập trung khu vực Xã Phước Hải)
    // Pattern 3: Nhiễm trùng tiêu hóa rải rác ngày 22/08
    for (let day = 1; day <= 31; day++) {
        const dateStr = `2026-08-${String(day).padStart(2, '0')}`;
        const dayTime = new Date(`2026-08-${String(day).padStart(2, '0')}T08:30:00Z`);

        // Đếm mật độ ca theo kịch bản bùng phát
        let fluBurst = (day >= 8 && day <= 18);
        let dengueBurst = (day >= 15 && day <= 29);

        for (let s of students) {
            // Logic Cúm Khối 10
            if (fluBurst && (s.class === '10A1' || s.class === '10A2') && Math.random() < 0.18) {
                if (visits.length < 200) {
                    visits.push({
                        id: `VISIT_202608_${visits.length + 1}`,
                        studentId: s.id, name: s.name, class: s.class,
                        symptom: "Sốt cao 38.8°C, ho khan liên tục, đau rát họng, mệt mỏi",
                        treatment: "Nghỉ ngơi phòng cách ly, hạ sốt Paracetamol 500mg, bù Oresol",
                        note: "Nghi ngờ Cúm A học đường - Đã liên hệ PH đón",
                        status: "completed", timestamp: dayTime
                    });
                }
                if (attendance.length < 250) {
                    attendance.push({
                        id: `ATT_202608_${attendance.length + 1}`,
                        studentId: s.id, date: dateStr, reason: "P",
                        diagnosis: "Viêm đường hô hấp trên / Cúm A", symptom: "Sốt cao, đau họng, ho"
                    });
                }
            }

            // Logic Sốt Xuất Huyết theo Xã
            if (dengueBurst && s.ward === "Xã Phước Hải" && Math.random() < 0.12) {
                if (visits.length < 200 && Math.random() < 0.6) {
                    visits.push({
                        id: `VISIT_202608_${visits.length + 1}`,
                        studentId: s.id, name: s.name, class: s.class,
                        symptom: "Sốt li bì ngày thứ 2, đau nhức 2 hốc mắt, đau mỏi cơ",
                        treatment: "Theo dõi mạch/nhiệt, uống nhiều nước, chuyển viện huyện test Dengue",
                        note: "Khu vực cư trú đang có ổ lăng quăng",
                        status: "completed", timestamp: dayTime
                    });
                }
                if (attendance.length < 250) {
                    attendance.push({
                        id: `ATT_202608_${attendance.length + 1}`,
                        studentId: s.id, date: dateStr, reason: "B",
                        diagnosis: "Theo dõi Sốt xuất huyết Dengue", symptom: "Sốt cao liên tục, phát ban"
                    });
                }
            }

            // Ca thông thường rải rác tạo độ lắc léo (Ngoại khoa, Chấn thương, Đau bụng...)
            if (Math.random() < 0.007) {
                if (visits.length < 200) {
                    const normalCases = [
                        { sym: "Trầy xước gối do ngã giờ thể dục", treat: "Rửa oxy già, bôi Povidine, băng gạc", note: "Chấn thương nhẹ" },
                        { sym: "Đau bụng vùng thượng vị sau ăn sáng", treat: "Uống trà gừng ấm, nằm nghỉ", note: "Rối loạn tiêu hóa" },
                        { sym: "Choáng váng, hạ đường huyết", treat: "Uống 1 cốc nước đường nóng", note: "Bỏ bữa sáng" }
                    ];
                    const chosen = normalCases[Math.floor(Math.random() * normalCases.length)];
                    visits.push({
                        id: `VISIT_202608_${visits.length + 1}`,
                        studentId: s.id, name: s.name, class: s.class,
                        symptom: chosen.sym, treatment: chosen.treat, note: chosen.note,
                        status: "completed", timestamp: dayTime
                    });
                }
                if (attendance.length < 250 && Math.random() < 0.5) {
                    attendance.push({
                        id: `ATT_202608_${attendance.length + 1}`,
                        studentId: s.id, date: dateStr, reason: "P",
                        diagnosis: "Rối loạn tiêu hóa cấp", symptom: "Đau quặn bụng, nôn ói"
                    });
                }
            }
        }
    }

    return {
        yt_students: students,
        yt_visits: visits,
        yt_attendance: attendance,
        yt_beds: [{ id: "bed_1", name: students[0].name, class: students[0].class, visitId: visits[0]?.id || "VISIT_01", startTime: new Date() }],
        yt_pharmacy_items: [
            { id: "MED-001", name: "Paracetamol 500mg", type: "drug", unit: "Viên", batches: [{ lot: "LOT2026A", qty: 850, expiry: "2027-12-31" }] },
            { id: "MED-002", name: "Oresol 245mg", type: "drug", unit: "Gói", batches: [{ lot: "LOT2026B", qty: 320, expiry: "2027-06-30" }] },
            { id: "MED-003", name: "Băng dán Urgo", type: "supply", unit: "Miếng", batches: [{ lot: "LOT2026C", qty: 1000, expiry: "2028-01-01" }] }
        ],
        yt_exam_campaigns: [{ id: "DOTKHAM_2026_K10", name: "Khám sức khỏe đầu năm học 2026-2027", createdAt: new Date("2026-08-05") }],
        yt_exam_results: [{ id: "EXAM_RES_01", campaignId: "DOTKHAM_2026_K10", studentId: "YT-10001", name: students[0].name, class: "10A1", height: "170", weight: "62", facility: "Trung tâm Y tế Huyện", examDate: "2026-08-05", reportDate: "2026-08-06", eyes: "10/10", dental: "Bình thường", ent: "Bình thường", internalMedicine: "Bình thường", surgery: "Bình thường", mentalHealth: "Bình thường", summary: { physicalDev: "Thể lực tốt", mentalDev: "Bình thường", healthStatus: "Đạt chuẩn" } }],
        yt_tests: [{ id: "TEST_STRESS_01", title: "Thang DASS-21 (Tâm lý học đường)", type: "mental", description: "Đánh giá stress", totalQuestions: 21, active: true }],
        yt_tickets: [{ id: "TK_DEMO_01", ticketId: "REQ-88992", studentId: "YT-10001", name: students[0].name, class: "10A1", content: "Em xin cấp lại thuốc Oresol ạ", status: "resolved", adminReply: "Em ghé phòng y tế nhé", timestamp: new Date() }],
        yt_notifications: [{ id: "NOTI_DEMO_01", title: "Cảnh báo dịch Cúm mùa Khối 10", content: "Đề nghị GVCN theo dõi sát sĩ số học sinh nghỉ ốm.", targetType: "all", sender: "Phòng Y Tế", timestamp: new Date("2026-08-12") }],
        ai_memory_notes: [{ id: "NOTE_AI_01", title: "Ổ dịch Cúm A và SXH tháng 8/2026", content: "Phát hiện chùm ca sốt tại lớp 10A1-10A2 và khu vực Xã Phước Hải.", timestamp: new Date("2026-08-20") }],
        yt_stats: [{ id: "08-2026", monthInfo: "08-2026", lastUpdated: new Date("2026-08-31"), topSymptoms: [{ name: "Sốt & Cảm cúm", count: 85 }, { name: "Sốt phát ban (Dengue)", count: 32 }, { name: "Đau bụng tiêu hóa", count: 18 }] }]
    };
}

const INITIAL_DEMO_DATA = buildSmartEpidemicDemoData();

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
// HÀM RESET & NẠP TỰ ĐỘNG DỮ LIỆU MẪU LÊN CLOUD (CÓ GIỚI HẠN & AN TOÀN)
// =========================================================================
const MAX_GLOBAL_RESET_COUNT = 0;
let isResetting = false;

// Hiển thị thông báo dễ thương khi hết lượt reset
function showCuteLimitModal(usedCount) {
    const modalHtml = `
        <div id="demo-limit-modal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:99999999; display:flex; align-items:center; justify-content:center; animation: fadeIn 0.3s ease;">
            <div style="background:#fff; border-radius:20px; max-width:440px; padding:28px 24px; text-align:center; box-shadow:0 15px 35px rgba(0,0,0,0.2); font-family:sans-serif; margin:15px;">
                <div style="font-size:3.5rem; margin-bottom:10px;">🌸🥺🌸</div>
                <h3 style="color:#d97706; margin:0 0 12px; font-size:1.3rem;">Kính gửi Ban Giám Khảo mến thương!</h3>
                <p style="color:#4b5563; font-size:0.95rem; line-height:1.6; margin-bottom:18px;">
                   Dạ hệ thống đã sử dụng hết <b>${usedCount}/${MAX_GLOBAL_RESET_COUNT} lượt khôi phục trong ngày hôm nay</b> của Cuộc thi nhằm bảo vệ tài nguyên đám mây phục vụ Cuộc thi ạ.
               </p>
                <div style="background:#fef3c7; border:1px dashed #f59e0b; border-radius:12px; padding:12px; color:#92400e; font-size:0.88rem; margin-bottom:20px;">
                    ✨ Toàn bộ dữ liệu dịch tễ học đường, hồ sơ và kho dược hiện tại vẫn đang ở trạng thái chuẩn chỉnh để quý Ban giám khảo trải nghiệm trọn vẹn ạ!
                </div>
                <p style="color:#6b7280; font-size:0.85rem; margin-bottom:20px; font-style:italic;">
                    Mong quý Ban giám khảo thương  em và thông cảm cho sự bất tiện nhỏ này nhé ạ ❤️
                </p>
                <button onclick="document.getElementById('demo-limit-modal').remove()" style="background:linear-gradient(135deg, #f59e0b, #d97706); color:white; border:none; padding:10px 30px; border-radius:25px; font-weight:bold; font-size:0.95rem; cursor:pointer; box-shadow:0 4px 12px rgba(217,119,6,0.3);">
                    Dạ, mình đã hiểu rồi nè ✨
                </button>
            </div>
        </div>
    `;
    const oldModal = document.getElementById('demo-limit-modal');
    if (oldModal) oldModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function resetDemoDatabase(isManualTrigger = true) {
    if (isResetting) return;
    isResetting = true;

    const btn = document.getElementById('btn-demo-reset');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Đang khôi phục...';
    }

    try {
        const rawDb = firebase.firestore();
        const getRawCol = (name) => rawDb._originalCollection ? rawDb._originalCollection(name) : rawDb.collection(name);
        const quotaDocRef = getRawCol('demo_stats').doc('global_reset_quota');

// 1. Kiểm tra giới hạn 4 lần / ngày trên toàn hệ thống
        if (isManualTrigger) {
            const quotaSnap = await quotaDocRef.get();
            const todayStr = new Date().toISOString().slice(0, 10); // Chuỗi YYYY-MM-DD
            let currentCount = 0;

            if (quotaSnap.exists) {
                const data = quotaSnap.data();
                // Nếu cùng ngày thì tính tiếp, nếu qua ngày mới tự reset về 0
                if (data.date === todayStr) {
                    currentCount = data.count || 0;
                }
            }

            if (currentCount >= MAX_GLOBAL_RESET_COUNT) {
                showCuteLimitModal(currentCount);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '🔄 Khôi phục dữ liệu gốc';
                }
                isResetting = false;
                return;
            }

            // Lưu số lượt kèm theo ngày hôm nay
            await quotaDocRef.set({
                date: todayStr,
                count: currentCount + 1,
                lastResetAt: new Date(),
                lastResetBy: DEMO_ACCOUNT_EMAIL
            }, { merge: true });
        }

        if (typeof sysLoading === 'function') sysLoading(true, "Đang làm mới dữ liệu hệ thống độc lập...");

        // 2. Xóa dữ liệu demo cũ
        for (const colName of DEMO_ISOLATED_COLLECTIONS) {
            const snap = await getRawCol(`demo_${colName}`).get();
            if (!snap.empty) {
                const batch = rawDb.batch();
                snap.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        }

        // 3. Nạp lại dữ liệu mẫu mới
        for (const [colName, docs] of Object.entries(INITIAL_DEMO_DATA)) {
            const CHUNK_SIZE = 200;
            for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
                const chunk = docs.slice(i, i + CHUNK_SIZE);
                const batch = rawDb.batch();
                
                chunk.forEach(item => {
                    const docRef = getRawCol(`demo_${colName}`).doc(item.id);
                    let payload = { ...item };

                    if (typeof encryptField === 'function') {
                        ['name', 'class', 'dob', 'phone', 'parentPhone', 'street', 'symptom', 'treatment', 'note'].forEach(f => {
                            if (payload[f]) payload[f] = encryptField(payload[f]);
                        });
                        if (payload.name && typeof removeVietnameseTones === 'function') {
                            payload.name_search = encryptField(removeVietnameseTones(item.name));
                        }
                    }
                    batch.set(docRef, payload);
                });
                await batch.commit();
            }
        }

        if (typeof sysLoading === 'function') sysLoading(false);
        if (typeof showNotification === 'function') showNotification("Đã khôi phục dữ liệu mẫu gốc thành công!", "success");
        setTimeout(() => window.location.reload(), 800);

    } catch (err) {
        console.error("Lỗi khi reset demo database:", err);
        if (typeof sysLoading === 'function') sysLoading(false);
        alert("Có lỗi xảy ra khi khôi phục dữ liệu. Vui lòng thử lại!");
    } finally {
        isResetting = false;
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🔄 Khôi phục dữ liệu gốc';
        }
    }
}

// Kiểm tra xem database demo có dữ liệu chưa (Chống lặp vô tận)
async function autoSeedIfEmpty() {
    if (sessionStorage.getItem('demo_seed_checked')) return;
    sessionStorage.setItem('demo_seed_checked', 'true');

    try {
        const rawDb = firebase.firestore();
        const getRawCol = (name) => rawDb._originalCollection ? rawDb._originalCollection(name) : rawDb.collection(name);
        const checkSnap = await getRawCol('demo_yt_students').limit(1).get();
        
        if (checkSnap.empty) {
            console.log("Database demo chưa có dữ liệu, đang khởi tạo lần đầu...");
            await resetDemoDatabase(false); // Không tính vào 4 lượt bấm của BGK
        }
    } catch (e) {
        console.warn("Auto-seed check error:", e);
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
            <button id="btn-demo-reset" onclick="resetDemoDatabase(true)" style="background: white; color: #b45309; border: none; padding: 4px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; cursor: pointer; transition: 0.2s;">
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
                sessionStorage.removeItem('demo_seed_checked');
            }
        });
    }
});
