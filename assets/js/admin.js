// 1. Hàm bật/tắt Loading Toàn màn hình
function sysLoading(show = true, text = "Đang xử lý...") {
    const loadingEl = document.getElementById('yt-sys-loading');
    if (show) {
        document.getElementById('yt-sys-loading-text').innerText = text;
        loadingEl.style.display = 'flex';
    } else {
        loadingEl.style.display = 'none';
    }
}

// 2. Hàm thông báo Toast (Thay thế alert) - Tự động tắt sau 3s
function sysAlert(message, type = "success") {
    const container = document.getElementById('yt-toast-container');
    const toast = document.createElement('div');
    toast.className = `yt-toast ${type}`;
    
    let icon = "fa-info-circle";
    if (type === 'success') icon = "fa-check-circle";
    if (type === 'error') icon = "fa-exclamation-triangle";
    
    toast.innerHTML = `<i class="fas ${icon}" style="font-size:1.2rem;"></i> <span>${message}</span>`;
    container.appendChild(toast);

    // Tự động xóa sau 3.5 giây
    setTimeout(() => {
        toast.style.animation = 'fadeOutRight 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 3. Hàm Xác nhận (Thay thế confirm) - Dùng chung với Async/Await
function sysConfirm(message, title = "Xác nhận thao tác", isDanger = false) {
    return new Promise((resolve) => {
        const modal = document.getElementById('yt-sys-confirm');
        document.getElementById('yt-sys-confirm-title').innerText = title;
        document.getElementById('yt-sys-confirm-text').innerText = message;
        
        const btnOk = document.getElementById('btn-yt-sys-ok');
        const icon = document.getElementById('yt-sys-confirm-icon');
        
        if (isDanger) {
            btnOk.style.background = '#ef4444';
            icon.className = 'fas fa-exclamation-triangle';
            icon.style.color = '#ef4444';
        } else {
            btnOk.style.background = '#2563eb';
            icon.className = 'fas fa-question-circle';
            icon.style.color = '#2563eb';
        }

        modal.style.display = 'flex';

        // Xử lý sự kiện bấm nút
        document.getElementById('btn-yt-sys-ok').onclick = () => {
            modal.style.display = 'none';
            resolve(true);
        };
        document.getElementById('btn-yt-sys-cancel').onclick = () => {
            modal.style.display = 'none';
            resolve(false);
        };
    });
}
// Hàm chuyển đổi trạng thái đóng mở của nhóm menu
function toggleSidebarGroup(headerElement) {
    const content = headerElement.nextElementSibling;
    const isExpanded = content.classList.contains('expanded');
    
    // Đóng tất cả các nhóm khác để tiết kiệm diện tích (Tùy chọn)
    document.querySelectorAll('.sidebar-group-content').forEach(el => {
        el.classList.remove('expanded');
    });
    document.querySelectorAll('.sidebar-group-header').forEach(el => {
        el.classList.remove('active');
    });

    // Nếu nhóm chưa mở thì tiến hành mở
    if (!isExpanded) {
        content.classList.add('expanded');
        headerElement.classList.add('active');
    }
}

// Hàm khởi tạo: Tự động mở nhóm chứa nút có class 'active' khi tải trang
document.addEventListener("DOMContentLoaded", () => {
    const activeBtn = document.querySelector('.admin-tab-btn.active');
    if (activeBtn) {
        const parentContent = activeBtn.closest('.sidebar-group-content');
        if (parentContent) {
            parentContent.classList.add('expanded');
            const header = parentContent.previousElementSibling;
            if (header) {
                header.classList.add('active');
            }
        }
    }
});
// CHỨC NĂNG LÀM MỚI HỆ THỐNG (TƯƠNG ĐƯƠNG CTRL + F5)
async function forceRefreshSystem() {
    // 1. Hiển thị màn hình Loading
    if (typeof sysLoading === 'function') {
        sysLoading(true, "Đang làm mới dữ liệu...");
    }
    
    // 2. Xóa sạch bộ nhớ đệm Cache (RAM & SessionStorage)
    sessionStorage.removeItem('vts_students_cache');
    window.allStudents = [];
    if (typeof ytStudentsCache !== 'undefined') ytStudentsCache = null;
    if (typeof adminLookupCache !== 'undefined') adminLookupCache = null;
    if (typeof allStudentsForNotiCache !== 'undefined') allStudentsForNotiCache = [];
    if (typeof cachedAdminPosts !== 'undefined') cachedAdminPosts = [];
    if (typeof cachedNotifications !== 'undefined') cachedNotifications = [];
    if (typeof cachedTickets !== 'undefined') cachedTickets = [];

    // 3. Tải lại trang web từ Server (Tương đương Ctrl + F5)
    setTimeout(() => {
        window.location.reload(true);
    }, 400);
}
// DỰ ĐOÁN NGUY CƠ DỊCH BỆNH AI
// Xác định thời tiết và mùa dịch tại Bà Rịa - Vũng Tàu theo tháng
function LocalEpidemicSeasonContext() {
    const month = new Date().getMonth() + 1;
    let seasonText = "";
    let typicalDiseases = "";

    if (month >= 5 && month <= 11) {
        seasonText = `Tháng ${month} (Mùa mưa tại Bà Rịa - Vũng Tàu, độ ẩm cao)`;
        typicalDiseases = "Sốt xuất huyết, Tay chân miệng, Sốt do siêu vi, Cúm A/B";
    } else {
        seasonText = `Tháng ${month} (Mùa khô/nắng nóng hoặc chuyển mùa khô)`;
        typicalDiseases = "Đau mắt đỏ, Thủy đậu, Quai bị, Viêm đường hô hấp trên, Tiêu chảy cấp";
    }

    return { seasonText, typicalDiseases };
}
async function gatherEpidemicData(rangeDays) {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - rangeDays);
    startDate.setHours(0, 0, 0, 0);

    const formatLocalDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const startStr = formatLocalDate(startDate);
    const endStr = formatLocalDate(endDate);

    const [visitsSnap, attSnap, weatherTimeSeries, externalAlerts] = await Promise.all([
        db.collection('yt_visits')
            .where('timestamp', '>=', startDate)
            .where('timestamp', '<=', endDate)
            .get(),
            
        db.collection('yt_attendance')
            .where('date', '>=', startStr)
            .where('date', '<=', endStr)
            .get(),
            
        fetchDatDoWeatherTimeSeries(rangeDays),
        getExternalEpidemiologicalSignals()
    ]);

    let visitSymptoms = {};
    let visitClasses = {};
    let totalVisits = visitsSnap.size;

    visitsSnap.forEach(doc => {
        const v = doc.data();
        const rawSymptom = v.symptom ? (typeof decryptField === 'function' ? decryptField(v.symptom) : v.symptom) : '';
        const rawClass = v.class ? (typeof decryptField === 'function' ? decryptField(v.class) : v.class) : '';
        
        if (rawSymptom) {
            let symps = rawSymptom.toLowerCase().split(/[,+\/;.]+|\s+và\s+/g);
            symps.forEach(s => {
                let clean = s.trim();
                if (clean) visitSymptoms[clean] = (visitSymptoms[clean] || 0) + 1;
            });
        }
        if (rawClass) {
            const cleanClass = rawClass.trim();
            if (cleanClass) visitClasses[cleanClass] = (visitClasses[cleanClass] || 0) + 1;
        }
    });

    let sickAbsenceDays = 0;
    let sickDiagnoses = {};
    let sickClasses = {};
    const studentPseudoMap = new Map();
    const groupedSickStudents = {};

    attSnap.forEach(doc => {
        const a = doc.data();
        if (a.reason === 'B') {
            sickAbsenceDays++;

            const resolvedClass = ((typeof decryptField === 'function' ? decryptField(a.class) : a.class) || 'Không rõ lớp').trim();
            const resolvedName = ((typeof decryptField === 'function' ? decryptField(a.name) : a.name) || '').trim();
            
            // Xử lý key an toàn: Không decrypt chuỗi đã giải mã
            let studentKey = '';
            const rawId = a.studentId || a.student_id || a.id;
            if (rawId) {
                studentKey = (typeof decryptField === 'function' ? decryptField(rawId) : rawId);
            }
            if (!studentKey) {
                studentKey = (resolvedName && resolvedClass !== 'Không rõ lớp') ? `${resolvedClass}_${resolvedName}` : doc.id;
            }
            
            if (!studentPseudoMap.has(studentKey)) {
                const pseudoId = `HS_${String(studentPseudoMap.size + 1).padStart(2, '0')}`;
                studentPseudoMap.set(studentKey, pseudoId);
            }
            const pseudoId = studentPseudoMap.get(studentKey);

            const rawDiag = ((typeof decryptField === 'function' ? decryptField(a.diagnosis) : a.diagnosis) || '').trim();
            const rawSymp = ((typeof decryptField === 'function' ? decryptField(a.symptoms || a.symptom) : (a.symptoms || a.symptom)) || '').trim();

            if (!groupedSickStudents[pseudoId]) {
                groupedSickStudents[pseudoId] = {
                    pseudoId: pseudoId,
                    class: resolvedClass,
                    daysCount: 0,
                    diagnoses: new Set(),
                    symptoms: new Set()
                };
            }

            groupedSickStudents[pseudoId].daysCount++;
            if (rawDiag && rawDiag.toLowerCase() !== 'chưa xác định') {
                groupedSickStudents[pseudoId].diagnoses.add(rawDiag);
            }
            if (rawSymp && rawSymp.toLowerCase() !== 'không ghi nhận') {
                groupedSickStudents[pseudoId].symptoms.add(rawSymp);
            }
        }
    });

    // Sắp xếp các ca bệnh: ưu tiên ca nghỉ nhiều ngày lên trước
    const sickCases = Object.values(groupedSickStudents)
        .sort((a, b) => b.daysCount - a.daysCount)
        .map(item => {
            const diagList = Array.from(item.diagnoses).join(' / ') || 'Chưa xác định';
            const sympList = Array.from(item.symptoms).join('; ') || 'Không ghi nhận';

            // Đếm tần suất chẩn đoán bóc tách từng bệnh
            if (item.diagnoses.size > 0) {
                item.diagnoses.forEach(d => {
                    sickDiagnoses[d] = (sickDiagnoses[d] || 0) + 1;
                });
            } else {
                sickDiagnoses['Chưa xác định'] = (sickDiagnoses['Chưa xác định'] || 0) + 1;
            }

            sickClasses[item.class] = (sickClasses[item.class] || 0) + 1;

            return {
                pseudoId: item.pseudoId,
                class: item.class,
                daysCount: item.daysCount,
                symptoms: sympList,
                diagnosis: diagList
            };
        });

    const uniqueSickStudentsCount = studentPseudoMap.size;

    return {
        startDateText: startDate.toLocaleDateString('vi-VN'),
        endDateText: endDate.toLocaleDateString('vi-VN'),
        totalVisits,
        visitSymptoms,
        visitClasses,
        sickAbsenceDays,
        uniqueSickStudentsCount,
        sickAbsences: uniqueSickStudentsCount,
        sickDiagnoses,
        sickClasses,
        sickCases,
        weatherTimeSeries,
        externalAlerts
    };
}
async function fetchDatDoWeatherTimeSeries(rangeDays) {
    try {
        const AI_SERVER_URL = "https://vts-health-ai.yte-thptvothisaubrvt.workers.dev";
        
        const res = await fetch(`${AI_SERVER_URL}/get-weather`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location: "Dat Do",
                rangeDays: rangeDays
            })
        });

        if (!res.ok) throw new Error("Không thể tải dữ liệu thời tiết");
        const data = await res.json();

        return {
            summary: data.summary,
            avgHumidity: data.avgHumidity,
            totalRain: data.totalRain,
            rainyDays: data.rainyDays
        };
    } catch (e) {
        console.warn("Lỗi kết nối thời tiết:", e);
        return { 
            summary: "Không có dữ liệu thời tiết",
            avgHumidity: "N/A",
            totalRain: "N/A",
            rainyDays: "N/A"
        };
    }
}

// MỚI: Tự động gửi từ khóa lên Cloudflare Worker để Google Search dữ liệu mới nhất
async function getExternalEpidemiologicalSignals() {
    try {
        const AI_SERVER_URL = "https://vts-health-ai.yte-thptvothisaubrvt.workers.dev";

        const res = await fetch(`${AI_SERVER_URL}/search-epidemic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                queries: [
                    "Cảnh báo dịch bệnh Cục Y tế Dự phòng Bộ Y tế mới nhất",
                    "Tình hình dịch bệnh HCDC Sở Y tế TP HCM Đông Nam Bộ",
                    "WHO disease outbreak news school health"
                ]
            })
        });

        if (!res.ok) throw new Error("Lỗi tìm kiếm dịch tễ Google");
        const results = await res.json();

        return {
            nationalAlerts: results.nationalAlerts || "Đang duy trì giám sát dịch thường quy từ Bộ Y tế.",
            regionalSignals: results.regionalSignals || "Không ghi nhận ổ dịch bất thường diện rộng tại khu vực lân cận.",
            whoGuidelines: results.whoGuidelines || "Khuyến nghị theo dõi sát các chùm ca sốt trong trường học."
        };
    } catch (e) {
        console.warn("Lỗi tìm kiếm Google từ Worker:", e);
        return {
            nationalAlerts: "Không có dữ liệu cảnh báo từ Bộ Y tế.",
            regionalSignals: "Không có dữ liệu dịch tễ từ HCDC/Khu vực.",
            whoGuidelines: "Không có dữ liệu khuyến cáo từ WHO."
        };
    }
}
function buildSocraticPrompt(data, seasonInfo) {
    const sympText = Object.keys(data.visitSymptoms).map(k => `${k}: ${data.visitSymptoms[k]} ca`).join(", ") || "Không có";
    const diagText = Object.keys(data.sickDiagnoses).map(k => `${k}: ${data.sickDiagnoses[k]} ca`).join(", ") || "Không có";
    const classClusterText = Object.keys(data.sickClasses).map(k => `Lớp ${k}: ${data.sickClasses[k]} HS`).join(", ") || "Rải rác";
    const visitClassText = Object.keys(data.visitClasses || {}).map(k => `Lớp ${k}: ${data.visitClasses[k]} lượt`).join(", ") || "Rải rác";
    const sickDetailText = (data.sickCases && data.sickCases.length > 0)
    ? data.sickCases.map(c => `     + Mã ${c.pseudoId} (Lớp ${c.class}): Nghỉ liên tiếp ${c.daysCount} ngày | Triệu chứng: [${c.symptoms}] | Chẩn đoán sơ bộ: [${c.diagnosis}]`).join("\n")
    : "     + Không có ca bệnh chi tiết ghi nhận.";
    const weatherSummary = data.weatherTimeSeries?.summary || "Không có dữ liệu thời tiết";
    const extNational = data.externalAlerts?.nationalAlerts || "Bình thường";
    const extRegional = data.externalAlerts?.regionalSignals || "Bình thường";
    const extWHO = data.externalAlerts?.whoGuidelines || "Theo dõi thường quy";

    return `
Bạn là Chuyên gia Dịch tễ học Học đường cao cấp thuộc THPT Võ Thị Sáu (Bà Rịa - Vũng Tàu).
Hãy thực hiện quy trình suy luận bằng PHƯƠNG PHÁP SOCRATIC (Liên tục đặt câu hỏi và tự phản biện) để đánh giá nguy cơ dịch bệnh.

=== TỔNG HỢP 5 NGUỒN DỮ LIỆU ĐẦU VÀO (${data.startDateText} - ${data.endDateText}) ===
1. [Nội bộ] Khám tại trường: ${data.totalVisits} lượt. Triệu chứng: ${sympText}. Phân bố theo lớp: ${visitClassText}.
2. [Nội bộ] Nghỉ học do BỆNH: Có ${data.uniqueSickStudentsCount || 0} học sinh bệnh (tương ứng ${data.sickAbsenceDays || 0} lượt ngày nghỉ, một học sinh có thể nghỉ nhiều ngày liên tiếp).
   - Thống kê chẩn đoán: ${diagText}.
   - Phân bố chùm ca: ${classClusterText}.
   - Chi tiết từng học sinh (đã ẩn danh định danh theo dõi theo chuỗi ngày):
${sickDetailText}
3. [Thời tiết Đất Đỏ]: ${weatherSummary}.
4. [Mùa vụ BR-VT]: ${seasonInfo.seasonText}. Bệnh thường gặp: ${seasonInfo.typicalDiseases}.
5. [Dịch tễ bên ngoài]:
   - Bộ Y tế/Cục Y tế DP: ${extNational}
   - HCDC/Sở Y Tế: ${extRegional}
   - Khuyến cáo WHO: ${extWHO}
6. Do đây là Trường THPT nên Bệnh Tay Chân Miệng sẽ ít xuất hiện hơn.
=== NGHỆ THUẬT PHÂN TÍCH (LẦN LƯỢT TRẢ LỜI 5 CÂU HỎI TRUY VẤN) ===
- Q1: Sự kết hợp giữa triệu chứng nội bộ và số liệu vắng mặt có khớp với các cảnh báo dịch tễ từ Bộ Y tế/HCDC bên ngoài không?
- Q2: Có sự xuất hiện chùm ca bệnh (cluster) tại lớp/khối cụ thể nào không? Tốc độ lây đang diễn ra thế nào?
- Q3: Các chỉ số thời tiết (nhiệt độ, độ ẩm, mưa) kết hợp với yếu tố mùa vụ tác động rủi ro thế nào đến mầm bệnh?
- Q4: Dựa trên tổng hợp đa nguồn, tỷ lệ XÁC SUẤT BÙNG PHÁT THÀNH Ổ DỊCH (từ 0% đến 100%) của từng nhóm bệnh là bao nhiêu?
- Q5: Cần kích hoạt quy trình can thiệp trọng tâm nào theo khuyến cáo của WHO và Bộ Y tế?

=== NGUYÊN TẮC TRẢ VỀ KẾT QUẢ ===
1. Dữ liệu nội bộ chiếm 60% kết quả dự báo cuối cùng, các phần trăm cảnh báo phải được tính toán cẩn thận, chỉ thật sự nằm ở mức đỏ, vàng khi nguồn dữ liệu nội bộ ở mức đáng báo động.
Chỉ trả về ĐÚNG MÃ HTML thuần túy bọc trong <div class="ai-epidemic-report"> (KHÔNG dùng markdown \`\`\`html):

<div class="ai-epidemic-report" style="line-height: 1.6; font-size: 0.93rem; color: #1e293b;">
    <!-- KHỐI ĐÁNH GIÁ CHUỖI CÂU HỎI SOCRATIC -->
    <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 12px; margin-bottom: 15px;">
        <strong style="color: #0369a1;"><i class="fas fa-microscope"></i> Phân Tích Tổng Hợp Đa Chiều (Socratic Reasoning):</strong>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #334155;">
            <li><strong>Mối liên hệ Thời tiết - Triệu chứng:</strong> [Phân tích tác động của thời tiết lên sức khỏe học sinh]</li>
            <li><strong>Tác động Dịch tễ Bên ngoài:</strong> [Đối chiếu mầm bệnh nội bộ với cảnh báo HCDC/Bộ Y tế]</li>
            <li><strong>Nguy cơ chùm ca bệnh nội bộ:</strong> [Đánh giá phân bố theo lớp học]</li>
        </ul>
    </div>

    <!-- BẢNG BẢO VỆ NGUY CƠ 4 NHÓM BỆNH KÈM PHẦN TRĂM BÙNG PHÁT -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 15px;">
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 5px solid [MÀU_HEX_1]; padding: 12px; border-radius: 10px;">
            <strong style="color: #0f172a;">1. Sốt xuất huyết:</strong><br>
            Nguy cơ: <span style="font-weight:bold; color:[MÀU_HEX_1];">[Thấp/Trung bình/Cao] ([X]% bùng phát)</span>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 5px solid [MÀU_HEX_2]; padding: 12px; border-radius: 10px;">
            <strong style="color: #0f172a;">2. Cúm & Hô hấp:</strong><br>
            Nguy cơ: <span style="font-weight:bold; color:[MÀU_HEX_2];">[Thấp/Trung bình/Cao] ([X]% bùng phát)</span>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 5px solid [MÀU_HEX_3]; padding: 12px; border-radius: 10px;">
            <strong style="color: #0f172a;">3. Tay chân miệng:</strong><br>
            Nguy cơ: <span style="font-weight:bold; color:[MÀU_HEX_3];">[Thấp/Trung bình/Cao] ([X]% bùng phát)</span>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 5px solid [MÀU_HEX_4]; padding: 12px; border-radius: 10px;">
            <strong style="color: #0f172a;">4. Đau mắt đỏ/Khác:</strong><br>
            Nguy cơ: <span style="font-weight:bold; color:[MÀU_HEX_4];">[Thấp/Trung bình/Cao] ([X]% bùng phát)</span>
        </div>
    </div>

    <!-- TÓM TẮT DỰ BÁO & HÀNH ĐỘNG -->
    <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 15px; border-radius: 12px;">
        <strong style="color: #b45309;"><i class="fas fa-shield-virus"></i> Nhắc Nhở & Can Thiệp Trọng Tâm:</strong>
        <p style="margin: 6px 0 0 0; color: #78350f;">[3 khuyến cáo hành động thực tiễn cho Phòng Y Tế và GVCN]</p>
    </div>
    
    <p style="margin-top: 10px; font-size: 0.8rem; color: #94a3b8; font-style: italic; text-align: right;">
        * Nhắc nhở: Phân tích AI dựa trên tổng hợp đa nguồn, mang tính chất cảnh báo sớm và hỗ trợ tham khảo.
    </p>
</div>

Lưu ý quy định màu HEX: Nguy cơ Thấp (<40%) = #10b981, Trung bình (40% - 70%) = #f59e0b, Cao (>70%) = #ef4444.
`;
}
// Lấy thông tin thiết bị / Trình duyệt của máy tính
function getClientDeviceMetadata() {
    const ua = navigator.userAgent;
    let os = "Máy tính Admin";
    if (ua.includes("Win")) os = "Windows PC";
    if (ua.includes("Mac")) os = "Macintosh";
    if (ua.includes("Linux")) os = "Linux PC";
    
    let browser = "Trình duyệt Web";
    if (ua.includes("Chrome")) browser = "Google Chrome";
    if (ua.includes("Firefox")) browser = "Mozilla Firefox";
    if (ua.includes("Edg")) browser = "Microsoft Edge";

    return `${os} (${browser})`;
}

// 5. Hàm chính: Chạy phân tích AI (Thủ công / Tự động)
window.executeEpidemicAIPrediction = async function(isAuto = false) {
    const rangeDays = parseInt(document.getElementById('ai-predict-range-days')?.value || "14");
    const btn = document.getElementById('btn-run-ai-predict');
    const loadingBox = document.getElementById('ai-predict-loading');
    const loadingText = document.getElementById('ai-loading-step-text');

    if (btn) btn.disabled = true;
    if (loadingBox) loadingBox.style.display = 'block';

    try {
        if (loadingText) loadingText.innerText = `Đang thu thập dữ liệu ${rangeDays} ngày gần nhất...`;
        
        const aggregatedData = await gatherEpidemicData(rangeDays);

        // NẾU TỰ ĐỘNG CHẠY MÀ KHÔNG CÓ CA BỆNH: Cập nhật mốc kiểm tra và dừng
        if (isAuto && aggregatedData.totalVisits === 0 && aggregatedData.sickAbsences === 0) {
            console.log("AI Auto-Predict: Không có dữ liệu bệnh mới, gia hạn thêm 48h.");
            await db.collection('yt_system_config').doc('ai_prediction_config').set({
                lastRunTimestamp: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            return;
        }

        if (loadingText) loadingText.innerText = "AI đang suy luận chuỗi câu hỏi dịch tễ (Socratic Method)...";

        const seasonInfo = LocalEpidemicSeasonContext();
        const systemPrompt = buildSocraticPrompt(aggregatedData, seasonInfo);

        const AI_SERVER_URL = "https://vts-health-ai.yte-thptvothisaubrvt.workers.dev";
        const response = await fetch(AI_SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }]
            })
        });

        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        const data = await response.json();

        let aiHTML = "";
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            aiHTML = data.candidates[0].content.parts[0].text;
        } else if (data.choices?.[0]?.message?.content) {
            aiHTML = data.choices[0].message.content;
        } else {
            throw new Error("Không nhận được phản hồi hợp lệ từ AI Server.");
        }

        aiHTML = aiHTML.replace(/```html/g, '').replace(/```/g, '').trim();

        const activeUser = firebase.auth().currentUser;
        const operatorName = isAuto 
            ? "Hệ thống Tự động (Auto Scheduler)" 
            : (activeUser ? (activeUser.displayName || activeUser.email) : "Admin");
        
        const deviceMeta = getClientDeviceMetadata();

        await db.collection('yt_ai_predictions').add({
            rangeDays: rangeDays,
            rangeText: `${aggregatedData.startDateText} đến ${aggregatedData.endDateText}`,
            totalVisits: aggregatedData.totalVisits,
            sickAbsences: aggregatedData.sickAbsences,
            aiResultHTML: aiHTML,
            operatorName: operatorName,
            deviceMeta: deviceMeta,
            isAutoRun: isAuto,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection('yt_system_config').doc('ai_prediction_config').set({
            lastRunTimestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        if (!isAuto && typeof sysAlert === 'function') {
            sysAlert("Đã hoàn tất bản phân tích & dự báo dịch bệnh!", "success");
        }
        // Không gọi lại loadSavedAIPredictionsHistory() ở đây vì onSnapshot sẽ tự động cập nhật

    } catch (err) {
        console.error("Lỗi phân tích AI:", err);
        if (!isAuto) {
            if (typeof sysAlert === 'function') sysAlert("Lỗi phân tích AI: " + err.message, "error");
            else alert("Lỗi: " + err.message);
        }
    } finally {
        if (btn) btn.disabled = false;
        if (loadingBox) loadingBox.style.display = 'none';
    }
};

// Gọi nút thủ công
window.runAIPredictionManual = function() {
    window.executeEpidemicAIPrediction(false);
};
window.loadSavedAIPredictionsHistory = function() {
    const container = document.getElementById('ai-predictions-history-container');
    if (!container) return;

    db.collection('yt_ai_predictions')
        .orderBy('timestamp', 'desc')
        .limit(6)
        .onSnapshot(snap => {
            if (snap.empty) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 25px; color: #94a3b8; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1; font-size: 0.88rem;">
                        <i class="fas fa-info-circle"></i> Chưa có bản dự báo nào. Nhấn <strong>"Phân tích ngay"</strong> để kích hoạt AI.
                    </div>`;
                return;
            }

            let html = '';
            snap.forEach(doc => {
                const d = doc.data();
                const timeStr = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'Vừa xong';
                const isAutoBadge = d.isAutoRun 
                    ? `<span style="background: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;"><i class="fas fa-robot"></i> Tự động</span>` 
                    : `<span style="background: #e0f2fe; color: #0284c7; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;"><i class="fas fa-user-shield"></i> Thủ công</span>`;

                html += `
                    <div class="ai-history-row">
                        <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                            <div style="width: 38px; height: 38px; border-radius: 10px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">
                                <i class="fas fa-file-medical-alt"></i>
                            </div>
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                                    <strong style="color: #1e293b; font-size: 0.92rem;">Giai đoạn: ${d.rangeText}</strong>
                                    ${isAutoBadge}
                                </div>
                                <div style="font-size: 0.8rem; color: #64748b;">
                                    Tiếp nhận: <strong>${d.totalVisits}</strong> ca &bull; Nghỉ bệnh: <strong>${d.sickAbsences || 0}</strong> HS &bull; Thực hiện lúc: ${timeStr}
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 6px;">
                            <button onclick="openAIPredictionDetailModal('${doc.id}')" class="btn btn-sm" style="background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 0.8rem;">
                                <i class="fas fa-eye"></i> Xem báo cáo
                            </button>
                            <button onclick="deleteAIPredictionDoc('${doc.id}')" class="btn btn-sm" style="background: #fff1f2; color: #ef4444; border: 1px solid #fecdd3; padding: 6px 10px; border-radius: 8px; font-size: 0.8rem;" title="Xóa bản ghi">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        }, err => console.error("Lỗi nạp lịch sử AI:", err));
};
window.openAIPredictionDetailModal = async function(docId) {
    try {
        const doc = await db.collection('yt_ai_predictions').doc(docId).get();
        if (!doc.exists) return alert("Bản ghi dự báo không tồn tại!");

        const d = doc.data();
        const timeStr = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString('vi-VN') : 'N/A';

        // 1. Đổ thông tin Metadata máy tính và người vận hành
        const metaBox = document.getElementById('ai-modal-metadata-box');
        metaBox.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
                <div>👤 <strong>Người vận hành:</strong> <span style="color:#0284c7; font-weight:bold;">${d.operatorName || 'Admin'}</span></div>
                <div>💻 <strong>Thiết bị thực hiện:</strong> <span>${d.deviceMeta || 'Máy tính Admin'}</span></div>
                <div>⏰ <strong>Thời gian phân tích:</strong> <span>${timeStr}</span></div>
                <div>📊 <strong>Dữ liệu tổng hợp:</strong> <span>${d.totalVisits} lượt khám, ${d.sickAbsences || 0} HS nghỉ bệnh</span></div>
            </div>
        `;

        // 2. Đổ nội dung bài phân tích HTML của AI
        document.getElementById('ai-modal-report-content').innerHTML = d.aiResultHTML;

        // 3. Mở Modal
        document.getElementById('ai-prediction-detail-modal').style.display = 'flex';

    } catch (e) {
        alert("Lỗi khi mở chi tiết: " + e.message);
    }
};

window.closeAIPredictionDetailModal = function() {
    document.getElementById('ai-prediction-detail-modal').style.display = 'none';
};

window.deleteAIPredictionDoc = async function(docId) {
    const ok = await sysConfirm("Bạn có chắc chắn muốn xóa bản dự báo nguy cơ dịch bệnh này?", "Xác nhận xóa", true);
    if (ok) {
        try {
            await db.collection('yt_ai_predictions').doc(docId).delete();
            if (typeof sysAlert === 'function') sysAlert("Đã xóa bản dự báo thành công!", "success");
        } catch (e) {
            if (typeof sysAlert === 'function') sysAlert("Lỗi khi xóa: " + e.message, "error");
        }
    }
};
window.toggleAutoAIPredict = async function(isEnabled) {
    try {
        await db.collection('yt_system_config').doc('ai_prediction_config').set({
            enableAutoAIPredict: isEnabled
        }, { merge: true });

        if (typeof sysAlert === 'function') {
            sysAlert(isEnabled ? "Đã BẬT tự động phân tích 2 ngày/lần!" : "Đã TẮT tự động phân tích!", "success");
        }
    } catch (e) {
        console.error("Lỗi lưu cấu hình AI:", e);
    }
};
let isAutoPredictRunning = false;

async function checkAndRunAutoAIPrediction() {
    if (isAutoPredictRunning) return;
    try {
        const configDoc = await db.collection('yt_system_config').doc('ai_prediction_config').get();
        if (!configDoc.exists) return;

        const config = configDoc.data();
        const chkBox = document.getElementById('chk-auto-ai-predict');
        if (chkBox) chkBox.checked = Boolean(config.enableAutoAIPredict);

        if (!config.enableAutoAIPredict) return;

        let lastRun = new Date(0);
        if (config.lastRunTimestamp) {
            if (typeof config.lastRunTimestamp.toDate === 'function') {
                lastRun = config.lastRunTimestamp.toDate();
            } else if (config.lastRunTimestamp.seconds) {
                lastRun = new Date(config.lastRunTimestamp.seconds * 1000);
            } else {
                lastRun = new Date(config.lastRunTimestamp);
            }
        }

        const now = new Date();
        const diffHours = (now - lastRun) / (1000 * 60 * 60);

        if (diffHours >= 48) {
            isAutoPredictRunning = true;
            console.log(`🤖 AI Auto Scheduler: Đã qua ${diffHours.toFixed(1)} giờ. Đang phân tích tự động...`);
            await window.executeEpidemicAIPrediction(true);
            isAutoPredictRunning = false;
        }
    } catch (e) {
        isAutoPredictRunning = false;
        console.warn("Auto AI Predict check skipped:", e.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            setTimeout(() => {
                checkAndRunAutoAIPrediction();
                if (document.getElementById('ai-predictions-history-container')) {
                    window.loadSavedAIPredictionsHistory();
                }
            }, 2000);
        }
    });
});
// =========================================================================
// QUẢN LÝ CHỈNH SỬA & XÓA TOÀN DIỆN LƯỢT KHÁM
// =========================================================================
let editVisitOriginalMedicines = []; 
let editVisitCurrentMedicines = [];

function closeEditVisitModal() {
    const modal = document.getElementById('edit-visit-modal');
    if (modal) modal.style.display = 'none';
    const suggest = document.getElementById('edit-med-suggest-box');
    if (suggest) suggest.style.display = 'none';
}

async function openEditVisitModal(visitId) {
    sysLoading(true, "Đang tải chi tiết lượt khám...");
    try {
        const doc = await db.collection('yt_visits').doc(visitId).get();
        if (!doc.exists) {
            sysAlert("Không tìm thấy lượt khám này!", "error");
            return;
        }

        const data = doc.data();

        const visitTimeMs = data.timestamp ? (data.timestamp.seconds ? data.timestamp.seconds * 1000 : new Date(data.timestamp).getTime()) : 0;
        if ((Date.now() - visitTimeMs) > (30 * 24 * 60 * 60 * 1000)) {
            sysAlert("⛔ Lượt khám này đã quá 30 ngày, hệ thống đã khóa không cho phép sửa/xóa!", "error");
            return;
        }

        document.getElementById('edit-visit-id').value = visitId;
        document.getElementById('edit-visit-student-id').value = data.studentId || '';
        document.getElementById('edit-visit-original-timestamp').value = JSON.stringify(data.timestamp || null);
        document.getElementById('edit-visit-signature').value = data.sign || '';

        const decName = data.name ? decryptField(data.name) : '';
        const decClass = data.class ? decryptField(data.class) : '';
        document.getElementById('edit-visit-student-name').innerText = decName;
        document.getElementById('edit-visit-student-class').innerText = decClass;

        const timeStr = data.timestamp ? new Date(visitTimeMs).toLocaleString('vi-VN') : '--';
        document.getElementById('edit-visit-time-display').innerText = timeStr;

        document.getElementById('edit-visit-symptom').value = data.symptom ? decryptField(data.symptom) : '';
        document.getElementById('edit-visit-treatment').value = data.treatment ? decryptField(data.treatment) : '';
        document.getElementById('edit-visit-note').value = data.note ? decryptField(data.note) : '';

        const staffSelect = document.getElementById('edit-visit-staff-select');
        if (staffSelect) {
            staffSelect.value = '__CURRENT_USER__';
            if (data.doctor === 'Nguyễn Thị Xuân Đồng') {
                staffSelect.value = 'Nguyễn Thị Xuân Đồng';
            }
        }

        editVisitOriginalMedicines = [];
        const txSnap = await db.collection('yt_pharmacy_transactions')
            .where('type', '==', 'export')
            .where('notes', '==', `Kèm theo Lượt khám Y tế số ${visitId}`)
            .get();

        if (!txSnap.empty) {
            const txData = txSnap.docs[0].data();
            editVisitOriginalMedicines = JSON.parse(JSON.stringify(txData.items || []));
        }

        editVisitCurrentMedicines = JSON.parse(JSON.stringify(editVisitOriginalMedicines));
        renderEditVisitMedicines();

        document.getElementById('edit-visit-modal').style.display = 'flex';
    } catch (err) {
        sysAlert("Lỗi tải lượt khám: " + err.message, "error");
    } finally {
        sysLoading(false);
    }
}

function searchMedicineForEditVisit(val) {
    const box = document.getElementById('edit-med-suggest-box');
    if (!val || val.trim().length < 2) { box.style.display = 'none'; return; }

    const keyword = removeVietnameseTones(val.trim());
    const matched = ytPharmacyCache.filter(item => {
        const hasStock = item.batches && item.batches.some(b => parseFloat(b.qty) > 0);
        return hasStock && removeVietnameseTones(item.name).includes(keyword);
    });

    box.innerHTML = '';
    if (matched.length === 0) {
        box.innerHTML = '<div style="padding:10px; color:#ef4444; font-size:0.85rem; text-align:center;">Không tìm thấy thuốc còn hàng!</div>';
    } else {
        matched.forEach(d => {
            const el = document.createElement('div');
            el.className = 'suggest-item';
            el.innerHTML = `<strong>${d.name}</strong> <span style="font-size:0.8rem; color:#64748b;">(${d.unit})</span>`;
            el.onclick = () => selectMedicineForEditVisit(d);
            box.appendChild(el);
        });
    }
    box.style.display = 'block';
}

function selectMedicineForEditVisit(item) {
    document.getElementById('edit-med-search').value = item.name;
    document.getElementById('edit-med-selected-id').value = item.id;
    document.getElementById('edit-med-selected-name').value = item.name;
    document.getElementById('edit-med-selected-unit').value = item.unit;
    document.getElementById('edit-med-suggest-box').style.display = 'none';

    const batchSelect = document.getElementById('edit-med-batch-select');
    batchSelect.innerHTML = '<option value="">-- Chọn Lô --</option>';
    if (item.batches) {
        item.batches.forEach((b, index) => {
            if (parseFloat(b.qty) > 0) {
                batchSelect.innerHTML += `<option value="${index}">Lô ${b.lot} (Tồn: ${b.qty}) - HSD: ${b.expiry || 'K'}</option>`;
            }
        });
    }
}

function syncMedicinesToTreatmentField(oldMedRemoved = null, newMedAdded = null) {
    const treatmentInput = document.getElementById('edit-visit-symptom') ? document.getElementById('edit-visit-treatment') : null;
    if (!treatmentInput) return;

    let currentText = treatmentInput.value.trim();

    if (oldMedRemoved) {
        const patternStr = `(?:,\\s*)?Cấp:\\s*${escapeRegExp(oldMedRemoved.itemName)}\\s*\\(${oldMedRemoved.qty}\\s*${escapeRegExp(oldMedRemoved.unit)}\\)`;
        const regex = new RegExp(patternStr, 'gi');
        currentText = currentText.replace(regex, '').trim();

        currentText = currentText.replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
    }

    if (newMedAdded) {
        const textToAdd = `Cấp: ${newMedAdded.itemName} (${newMedAdded.qty} ${newMedAdded.unit})`;
        if (currentText === "") {
            currentText = textToAdd;
        } else if (!currentText.includes(textToAdd)) {
            currentText = currentText + ", " + textToAdd;
        }
    }

    treatmentInput.value = currentText;
}

function escapeRegExp(string) {
    return (string || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addMedicineToEditVisit() {
    const id = document.getElementById('edit-med-selected-id').value;
    const name = document.getElementById('edit-med-selected-name').value;
    const unit = document.getElementById('edit-med-selected-unit').value;
    const batchIndex = document.getElementById('edit-med-batch-select').value;
    const qty = parseFloat(document.getElementById('edit-med-qty').value);

    if (!id || batchIndex === "" || isNaN(qty) || qty <= 0) {
        return sysAlert("Vui lòng chọn thuốc, lô và số lượng hợp lệ!", "warning");
    }

    const item = ytPharmacyCache.find(i => i.id === id);
    const batch = item.batches[batchIndex];

    const newMed = {
        itemId: id,
        itemName: name,
        batchIndex: parseInt(batchIndex),
        lot: batch.lot,
        qty: qty,
        unit: unit || batch.unit
    };

    editVisitCurrentMedicines.push(newMed);
    renderEditVisitMedicines();

    syncMedicinesToTreatmentField(null, newMed);

    document.getElementById('edit-med-search').value = '';
    document.getElementById('edit-med-selected-id').value = '';
    document.getElementById('edit-med-batch-select').innerHTML = '<option value="">-- Trống --</option>';
    document.getElementById('edit-med-qty').value = 1;
}

function removeEditVisitMed(idx) {
    const removedMed = editVisitCurrentMedicines[idx];
    editVisitCurrentMedicines.splice(idx, 1);
    renderEditVisitMedicines();

    if (removedMed) {
        syncMedicinesToTreatmentField(removedMed, null);
    }
}

function renderEditVisitMedicines() {
    const list = document.getElementById('edit-visit-med-list');
    if (!list) return;

    if (editVisitCurrentMedicines.length === 0) {
        list.innerHTML = '<div style="font-size:0.85rem; color:#94a3b8; text-align:center; padding:10px;">Không cấp thuốc cho lượt này.</div>';
        return;
    }

    let html = '';
    editVisitCurrentMedicines.forEach((med, idx) => {
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem;">
                <div><strong style="color:#0f172a;">${med.itemName}</strong> <span style="color:#64748b;">(Lô: ${med.lot})</span></div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <strong style="color:#10b981;">${med.qty} ${med.unit}</strong>
                    <i class="fas fa-trash-alt" style="color:#ef4444; cursor:pointer;" onclick="removeEditVisitMed(${idx})" title="Xóa thuốc"></i>
                </div>
            </div>
        `;
    });
    list.innerHTML = html;
}

async function saveEditVisit() {
    const visitId = document.getElementById('edit-visit-id').value;
    const studentName = document.getElementById('edit-visit-student-name').innerText;
    const studentClass = document.getElementById('edit-visit-student-class').innerText;
    const symptom = document.getElementById('edit-visit-symptom').value.trim();
    const treatment = document.getElementById('edit-visit-treatment').value.trim();
    const note = document.getElementById('edit-visit-note').value.trim();

    if (!symptom || !treatment) {
        return sysAlert("Triệu chứng và Xử trí không được để trống!", "warning");
    }

    sysLoading(true, "Đang cân đối kho dược và cập nhật lượt khám...");

    try {
        const batch = db.batch();

        const itemIdsNeeded = new Set([
            ...editVisitOriginalMedicines.map(m => m.itemId),
            ...editVisitCurrentMedicines.map(m => m.itemId)
        ]);

        const itemsDocs = {};
        for (const itemId of itemIdsNeeded) {
            const doc = await db.collection('yt_pharmacy_items').doc(itemId).get();
            if (doc.exists) {
                itemsDocs[itemId] = doc.data();
            }
        }

        editVisitOriginalMedicines.forEach(oldMed => {
            if (itemsDocs[oldMed.itemId] && itemsDocs[oldMed.itemId].batches) {
                const batchObj = itemsDocs[oldMed.itemId].batches.find(b => b.lot === oldMed.lot);
                if (batchObj) {
                    batchObj.qty = parseFloat(batchObj.qty) + parseFloat(oldMed.qty);
                }
            }
        });

        for (const newMed of editVisitCurrentMedicines) {
            if (!itemsDocs[newMed.itemId] || !itemsDocs[newMed.itemId].batches) {
                throw new Error(`Mặt hàng ${newMed.itemName} không còn tồn tại trong kho!`);
            }
            const batchObj = itemsDocs[newMed.itemId].batches.find(b => b.lot === newMed.lot);
            if (!batchObj) {
                throw new Error(`Lô ${newMed.lot} của thuốc ${newMed.itemName} không tìm thấy!`);
            }
            if (parseFloat(batchObj.qty) < parseFloat(newMed.qty)) {
                throw new Error(`Kho không đủ hàng! Lô ${newMed.lot} của thuốc ${newMed.itemName} chỉ còn ${batchObj.qty} ${newMed.unit}.`);
            }
            batchObj.qty = parseFloat(batchObj.qty) - parseFloat(newMed.qty);
        }

        for (const itemId of itemIdsNeeded) {
            if (itemsDocs[itemId]) {
                batch.update(db.collection('yt_pharmacy_items').doc(itemId), {
                    batches: itemsDocs[itemId].batches
                });
            }
        }

        const staffSelectVal = document.getElementById('edit-visit-staff-select') ? document.getElementById('edit-visit-staff-select').value : '__CURRENT_USER__';
        const activeUser = firebase.auth().currentUser;
        const currentUserName = activeUser ? (activeUser.displayName || activeUser.email || 'Cán bộ y tế') : 'Cán bộ y tế';
        const finalStaffName = (staffSelectVal === '__CURRENT_USER__') ? currentUserName : staffSelectVal;

        const oldTxSnap = await db.collection('yt_pharmacy_transactions')
            .where('type', '==', 'export')
            .where('notes', '==', `Kèm theo Lượt khám Y tế số ${visitId}`)
            .get();
        oldTxSnap.forEach(d => batch.delete(d.ref));

        if (editVisitCurrentMedicines.length > 0) {
            const newTxId = "XK-" + Date.now().toString().slice(-6);
            const newTxRef = db.collection('yt_pharmacy_transactions').doc(newTxId);
            batch.set(newTxRef, {
                id: newTxId,
                type: 'export',
                receiver: `${studentName} (${studentClass})`,
                reason: "Cấp phát y tế tại phòng (Chỉnh sửa)",
                notes: `Kèm theo Lượt khám Y tế số ${visitId}`,
                items: editVisitCurrentMedicines,
                user: finalStaffName, // Tên cán bộ tiếp nhận hiển thị trên phiếu xuất kho
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        const visitRef = db.collection('yt_visits').doc(visitId);
        batch.update(visitRef, {
            doctor: finalStaffName,
            symptom: encryptField(symptom),
            treatment: encryptField(treatment),
            note: encryptField(note),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() // Chỉ lưu vết cập nhật, không đổi timestamp gốc
        });

        await batch.commit();

        sysAlert("Đã cập nhật lượt khám và đồng bộ kho dược thành công!", "success");
        closeEditVisitModal();

    } catch (err) {
        sysAlert("Lỗi khi cập nhật lượt khám: " + err.message, "error");
    } finally {
        sysLoading(false);
    }
}

async function deleteCompleteVisit(visitId, studentName) {
    const visitDoc = await db.collection('yt_visits').doc(visitId).get();
    if (!visitDoc.exists) return sysAlert("Lượt khám không tồn tại!", "error");

    const vData = visitDoc.data();
    const visitTimeMs = vData.timestamp ? (vData.timestamp.seconds ? vData.timestamp.seconds * 1000 : new Date(vData.timestamp).getTime()) : 0;
    if ((Date.now() - visitTimeMs) > (30 * 24 * 60 * 60 * 1000)) {
        return sysAlert("⛔ Lượt khám này đã quá 30 ngày, hệ thống đã khóa không cho phép sửa/xóa!", "error");
    }

    const isConfirm = await sysConfirm(
        `Bạn có chắc chắn muốn XÓA TOÀN DIỆN lượt khám của học sinh ${studentName}?\n\n- Thuốc đã cấp (nếu có) sẽ được HOÀN TRẢ VÀO KHO.\n- Phiếu xuất kho liên quan sẽ bị hủy.\n- Giường bệnh (nếu đang nằm) sẽ được giải phóng.\n- Thông báo liên quan gửi học sinh sẽ bị thu hồi.`,
        "Xóa toàn diện lượt khám",
        true
    );

    if (!isConfirm) return;

    sysLoading(true, "Đang xóa lượt khám và hoàn kho thuốc...");

    try {
        const batch = db.batch();

        const txSnap = await db.collection('yt_pharmacy_transactions')
            .where('type', '==', 'export')
            .where('notes', '==', `Kèm theo Lượt khám Y tế số ${visitId}`)
            .get();

        if (!txSnap.empty) {
            for (const tDoc of txSnap.docs) {
                const txData = tDoc.data();
                if (txData.items && Array.isArray(txData.items)) {
                    for (const med of txData.items) {
                        const itemDoc = await db.collection('yt_pharmacy_items').doc(med.itemId).get();
                        if (itemDoc.exists) {
                            const itemData = itemDoc.data();
                            if (itemData.batches) {
                                const bObj = itemData.batches.find(b => b.lot === med.lot);
                                if (bObj) {
                                    bObj.qty = parseFloat(bObj.qty) + parseFloat(med.qty);
                                    batch.update(itemDoc.ref, { batches: itemData.batches });
                                }
                            }
                        }
                    }
                }
                batch.delete(tDoc.ref);
            }
        }

        const bedsSnap = await db.collection('yt_beds').where('visitId', '==', visitId).get();
        bedsSnap.forEach(b => batch.delete(b.ref));

        const notiSnap = await db.collection('yt_notifications').where('relatedVisitId', '==', visitId).get();
        notiSnap.forEach(n => batch.delete(n.ref));

        batch.delete(visitDoc.ref);

        await batch.commit();

        sysAlert("Đã xóa hoàn toàn lượt khám và hoàn trả kho dược thành công!", "success");
        loadBeds(); // Tải lại danh sách giường và bảng

    } catch (err) {
        sysAlert("Lỗi khi xóa lượt khám: " + err.message, "error");
    } finally {
        sysLoading(false);
    }
}
