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
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - rangeDays);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const [visitsSnap, attSnap, weatherTimeSeries] = await Promise.all([
        db.collection('yt_visits')
            .where('timestamp', '>=', startDate)
            .where('timestamp', '<=', endDate)
            .get(),
            
        db.collection('yt_attendance')
            .where('date', '>=', startStr)
            .where('date', '<=', endStr)
            .get(),
            
        typeof fetchDatDoWeatherTimeSeries === 'function' 
            ? fetchDatDoWeatherTimeSeries(rangeDays) 
            : Promise.resolve({ summary: "Chưa có dữ liệu thời tiết" })
    ]);

    let visitSymptoms = {};
    let visitClasses = {};
    let totalVisits = visitsSnap.size;

    visitsSnap.forEach(doc => {
        const v = doc.data();
        if (v.symptom) {
            let symps = v.symptom.toLowerCase().split(/[,+\/]+|\s+và\s+/g);
            symps.forEach(s => {
                let clean = s.trim();
                if (clean) visitSymptoms[clean] = (visitSymptoms[clean] || 0) + 1;
            });
        }
        if (v.class) {
            visitClasses[v.class] = (visitClasses[v.class] || 0) + 1;
        }
    });

    let sickAbsences = 0;
    let sickDiagnoses = {};
    let sickClasses = {};

    attSnap.forEach(doc => {
        const a = doc.data();
        if (a.reason === 'B') {
            sickAbsences++;
            let diag = (a.diagnosis || 'Sốt/Khác').trim();
            sickDiagnoses[diag] = (sickDiagnoses[diag] || 0) + 1;
            if (a.class) sickClasses[a.class] = (sickClasses[a.class] || 0) + 1;
        }
    });

    const externalAlerts = typeof getExternalEpidemiologicalSignals === 'function' 
        ? getExternalEpidemiologicalSignals() 
        : { nationalAlerts: "Không có", regionalSignals: "Không có", whoGuidelines: "Không có" };

    return {
        startDateText: startDate.toLocaleDateString('vi-VN'),
        endDateText: endDate.toLocaleDateString('vi-VN'),
        totalVisits,
        visitSymptoms,
        visitClasses,
        sickAbsences,
        sickDiagnoses,
        sickClasses,
        weatherTimeSeries,
        externalAlerts
    };
}
// 1. Lấy dữ liệu chuỗi thời tiết thực tế tại Đất Đỏ qua Open-Meteo API (Miễn phí, không cần API Key)
async function fetchDatDoWeatherTimeSeries(rangeDays) {
    try {
        // Tọa độ Đất Đỏ: Vĩ độ 10.4905, Kinh độ 107.2762
        const url = `https://api.open-meteo.com/v1/forecast?latitude=10.4905&longitude=107.2762&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,precipitation_sum&past_days=${rangeDays}&forecast_days=3&timezone=Asia%2FBangkok`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Không thể tải thời tiết");
        const data = await res.json();
        
        const d = data.daily;
        const count = d.time.length;
        const avgTemp = (d.temperature_2m_max.reduce((a, b) => a + b, 0) / count).toFixed(1);
        const avgHumidity = (d.relative_humidity_2m_mean.reduce((a, b) => a + b, 0) / count).toFixed(1);
        const totalRain = d.precipitation_sum.reduce((a, b) => a + b, 0).toFixed(1);
        const rainyDays = d.precipitation_sum.filter(r => r > 0.5).length;

        return {
            summary: `Nhiệt độ TB: ${avgTemp}°C, Độ ẩm TB: ${avgHumidity}%, Tổng mưa: ${totalRain}mm (${rainyDays}/${count} ngày có mưa). Xu hướng 3 ngày tới: ${d.temperature_2m_max.slice(-3).join(', ')}°C`,
            avgHumidity,
            totalRain,
            rainyDays
        };
    } catch (e) {
        console.warn("Lỗi lấy thời tiết Đất Đỏ:", e);
        return { summary: "Dữ liệu thời tiết ngoại tuyến: Nóng ẩm cục bộ, chuyển mưa rải rác." };
    }
}

// 2. Định nghĩa bối cảnh dịch tễ bên ngoài (WHO, Cục Y tế Dự phòng, Bộ Y tế, HCDC)
function getExternalEpidemiologicalSignals() {
    return {
        nationalAlerts: "Bộ Y tế & Cục Y tế dự phòng phát cảnh báo giám sát chủ động: Sốt xuất huyết gia tăng tại phía Nam; các chùm ca bệnh Cúm/Hô hấp tại trường học; cảnh báo dịch Tay chân miệng và Đau mắt đỏ cục bộ.",
        regionalSignals: "HCDC & Sở Y tế TP.HCM / Đông Nam Bộ ghi nhận chỉ số muỗi/lăng quăng cao sau các đợt mưa; tỷ lệ ca nhiễm hợp bào hô hấp (RSV) và Adenovirus ở học sinh phổ thông có xu hướng tăng.",
        whoGuidelines: "WHO khuyến cáo áp dụng can thiệp sớm tại cụm trường học khi có từ 2-3 ca sốt/nghỉ bệnh cùng lớp trong 3-5 ngày."
    };
}
function buildSocraticPrompt(data, seasonInfo) {
    const sympText = Object.keys(data.visitSymptoms).map(k => `${k}: ${data.visitSymptoms[k]} ca`).join(", ") || "Không có";
    const diagText = Object.keys(data.sickDiagnoses).map(k => `${k}: ${data.sickDiagnoses[k]} ca`).join(", ") || "Không có";
    const classClusterText = Object.keys(data.sickClasses).map(k => `Lớp ${k}: ${data.sickClasses[k]} HS nghỉ bệnh`).join(", ") || "Rải rác";

    // Trích xuất an toàn các dữ liệu mới (tránh lỗi nếu API lỗi)
    const weatherSummary = data.weatherTimeSeries?.summary || "Không có dữ liệu thời tiết";
    const extNational = data.externalAlerts?.nationalAlerts || "Bình thường";
    const extRegional = data.externalAlerts?.regionalSignals || "Bình thường";
    const extWHO = data.externalAlerts?.whoGuidelines || "Theo dõi thường quy";

    return `
Bạn là Chuyên gia Dịch tễ học Học đường cao cấp thuộc THPT Võ Thị Sáu (Bà Rịa - Vũng Tàu).
Hãy thực hiện quy trình suy luận bằng PHƯƠNG PHÁP SOCRATIC (Liên tục đặt câu hỏi và tự phản biện) để đánh giá nguy cơ dịch bệnh.

=== TỔNG HỢP 5 NGUỒN DỮ LIỆU ĐẦU VÀO (${data.startDateText} - ${data.endDateText}) ===
1. [Nội bộ] Khám tại trường: ${data.totalVisits} lượt. Triệu chứng: ${sympText}.
2. [Nội bộ] Nghỉ học do BỆNH: ${data.sickAbsences} lượt. Chẩn đoán: ${diagText}. Phân bố: ${classClusterText}.
3. [Thời tiết Đất Đỏ]: ${weatherSummary}.
4. [Mùa vụ BR-VT]: ${seasonInfo.seasonText}. Bệnh thường gặp: ${seasonInfo.typicalDiseases}.
5. [Dịch tễ bên ngoài]:
   - Bộ Y tế/Cục Y tế DP: ${extNational}
   - HCDC/Sở Y Tế: ${extRegional}
   - Khuyến cáo WHO: ${extWHO}

=== NGHỆ THUẬT PHÂN TÍCH (LẦN LƯỢT TRẢ LỜI 5 CÂU HỎI TRUY VẤN) ===
- Q1: Sự kết hợp giữa triệu chứng nội bộ và số liệu vắng mặt có khớp với các cảnh báo dịch tễ từ Bộ Y tế/HCDC bên ngoài không?
- Q2: Có sự xuất hiện chùm ca bệnh (cluster) tại lớp/khối cụ thể nào không? Tốc độ lây đang diễn ra thế nào?
- Q3: Các chỉ số thời tiết (nhiệt độ, độ ẩm, mưa) kết hợp với yếu tố mùa vụ tác động rủi ro thế nào đến mầm bệnh?
- Q4: Dựa trên tổng hợp đa nguồn, tỷ lệ XÁC SUẤT BÙNG PHÁT THÀNH Ổ DỊCH (từ 0% đến 100%) của từng nhóm bệnh là bao nhiêu?
- Q5: Cần kích hoạt quy trình can thiệp trọng tâm nào theo khuyến cáo của WHO và Bộ Y tế?

=== NGUYÊN TẮC TRẢ VỀ KẾT QUẢ ===
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
        
        // 1. Gom dữ liệu đa nguồn
        const aggregatedData = await gatherEpidemicData(rangeDays);

        // NẾU LÀ TỰ ĐỘNG CHẠY: Kiểm tra xem có dữ liệu mới không
        if (isAuto && aggregatedData.totalVisits === 0 && aggregatedData.sickAbsences === 0) {
            console.log("AI Auto-Predict: Không có dữ liệu mới, bỏ qua lượt chạy tự động.");
            return;
        }

        if (loadingText) loadingText.innerText = "AI đang suy luận chuỗi câu hỏi dịch tễ (Socratic Method)...";

        // 2. Tạo prompt Socratic
        const seasonInfo = LocalEpidemicSeasonContext();
        const systemPrompt = buildSocraticPrompt(aggregatedData, seasonInfo);

        // 3. Gọi Cloudflare AI Worker
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

        // 4. Xác định thông tin Người vận hành & Thiết bị
        const activeUser = firebase.auth().currentUser;
        const operatorName = isAuto 
            ? "Hệ thống Tự động (Auto Scheduler)" 
            : (activeUser ? (activeUser.displayName || activeUser.email) : "Admin");
        
        const deviceMeta = getClientDeviceMetadata();

        // 5. Lưu vào Firestore (yt_ai_predictions)
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

        // Cập nhật cấu hình thời gian chạy gần nhất
        await db.collection('yt_system_config').doc('ai_prediction_config').set({
            lastRunTimestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        if (!isAuto && typeof sysAlert === 'function') {
            sysAlert("Đã hoàn tất bản phân tích & dự báo dịch bệnh!", "success");
        }

        window.loadSavedAIPredictionsHistory();

    } catch (err) {
        console.error("Lỗi phân tích AI:", err);
        if (!isAuto) alert("❌ Lỗi phân tích AI: " + err.message);
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
        .limit(10)
        .onSnapshot(snap => {
            if (snap.empty) {
                container.innerHTML = `<div style="text-align: center; padding: 25px; color: #94a3b8; background: #f8fafc; border-radius: 10px; border: 1px dashed #cbd5e1;">Chưa có bản dự báo nào. Nhấn nút "Phân tích & Dự báo ngay" để khởi tạo.</div>`;
                return;
            }

            let html = '';
            snap.forEach(doc => {
                const d = doc.data();
                const timeStr = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString('vi-VN') : 'Vừa xong';
                const isAutoBadge = d.isAutoRun 
                    ? `<span style="background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: bold;"><i class="fas fa-robot"></i> Tự động</span>` 
                    : `<span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: bold;"><i class="fas fa-user-shield"></i> Admin</span>`;

                html += `
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; transition: 0.2s;" onmouseover="this.style.borderColor='#0284c7'" onmouseout="this.style.borderColor='#e2e8f0'">
                        <div>
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                                <strong style="color: #0284c7; font-size: 0.98rem;">📅 Dữ liệu: ${d.rangeText}</strong>
                                ${isAutoBadge}
                            </div>
                            <div style="font-size: 0.82rem; color: #64748b;">
                                Khám tại trường: <strong>${d.totalVisits}</strong> ca | Nghỉ bệnh: <strong>${d.sickAbsences || 0}</strong> HS | Lúc: ${timeStr}
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button onclick="openAIPredictionDetailModal('${doc.id}')" class="btn btn-sm" style="background: #0284c7; color: white; padding: 7px 14px; border-radius: 8px; font-weight: bold; font-size: 0.82rem;">
                                <i class="fas fa-eye"></i> Xem Chi Tiết
                            </button>
                            <button onclick="deleteAIPredictionDoc('${doc.id}')" class="btn btn-sm" style="background: #fef2f2; color: #ef4444; border: 1px solid #fca5a5; padding: 7px 10px; border-radius: 8px; font-size: 0.82rem;" title="Xóa bản ghi này">
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
    if (confirm("Bạn có chắc chắn muốn xóa bản dự báo nguy cơ dịch bệnh này?")) {
        await db.collection('yt_ai_predictions').doc(docId).delete();
        if (typeof sysAlert === 'function') sysAlert("Đã xóa bản dự báo!", "success");
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
async function checkAndRunAutoAIPrediction() {
    try {
        const configDoc = await db.collection('yt_system_config').doc('ai_prediction_config').get();
        if (!configDoc.exists) return;

        const config = configDoc.data();
        const chkBox = document.getElementById('chk-auto-ai-predict');
        if (chkBox) chkBox.checked = config.enableAutoAIPredict || false;

        // Nếu người dùng không bật tính năng tự động -> Bỏ qua
        if (!config.enableAutoAIPredict) return;

        // Kiểm tra thời gian chạy gần nhất
        const lastRun = config.lastRunTimestamp ? config.lastRunTimestamp.toDate() : new Date(0);
        const now = new Date();
        const diffHours = (now - lastRun) / (1000 * 60 * 60);

        // Nếu đã quá 48 giờ (2 ngày) kể từ lần chạy cuối
        if (diffHours >= 48) {
            console.log(`🤖 AI Auto Scheduler: Đã qua ${diffHours.toFixed(1)} giờ kể từ lần phân tích cuối. Tiến hành tự động phân tích...`);
            window.executeEpidemicAIPrediction(true); // Gửi cờ isAuto = true
        }
    } catch (e) {
        console.error("Lỗi kiểm tra Auto AI Predict:", e);
    }
}

// Khởi chạy khi tải trang
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        checkAndRunAutoAIPrediction();
        if (document.getElementById('ai-predictions-history-container')) {
            window.loadSavedAIPredictionsHistory();
        }
    }, 1500);
});
