/* PHYSICAL HEALTH EXAMINATION ENGINE - VTS HEALTH ADMIN
   Author: Nguyễn Tính */

let examCampaignsCache = [];
let activeCampaignId = null;
let examStudentCache = null;
let activeCampaignResults = [];
let currentStatsResultsCache = [];
let examResultsListener = null;

// Khởi tạo và lắng nghe các đợt khám khi tab hoạt động
window.addEventListener('DOMContentLoaded', () => {
    if (typeof switchTab === 'function') {
        const originalSwitchTab = switchTab;
        switchTab = function(tabId, btn) {
            originalSwitchTab(tabId, btn);
            if (tabId === 'tab-physical-exam') {
                loadExamCampaigns();
            }
        };
    } else {
        console.warn("Hệ thống chưa tìm thấy hàm switchTab toàn cục.");
    }
});

// 1. TẢI DANH SÁCH ĐỢT KHÁM LÊN BẢNG ĐIỀU KHIỂN
function loadExamCampaigns() {
    db.collection('yt_exam_campaigns').orderBy('createdAt', 'desc').onSnapshot(snap => {
        examCampaignsCache = [];
        const container = document.getElementById('campaigns-list-container');
        if (!container) return;

        if (snap.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; background: white; border-radius: 15px; border: 1px dashed #cbd5e1;">
                    <i class="fas fa-box-open fa-3x" style="color: #cbd5e1; margin-bottom: 15px;"></i>
                    <p style="color: #64748b;">Hiện chưa có đợt khám nào được khởi tạo.</p>
                </div>`;
            return;
        }

        container.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            examCampaignsCache.push({ id: doc.id, ...d });

            container.innerHTML += `
                <div class="form-card" style="display: flex; justify-content: space-between; align-items: center; padding: 20px 30px; margin-bottom: 0; border-left: 5px solid #2563eb; transition: 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                    <div style="cursor: pointer; flex: 1;" onclick="openCampaignDetail('${doc.id}')">
                        <h4 style="font-size: 1.15rem; color: #1e293b; margin-bottom: 5px;"><i class="far fa-calendar-alt" style="color:#2563eb;"></i> ${d.name}</h4>
                        <span style="font-size: 0.8rem; color: #64748b; font-weight: bold;">MÃ ĐỢT KHÁM: ${doc.id}</span>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="viewCampaignStats('${doc.id}', event)" class="btn" style="background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe; font-weight: bold;"><i class="fas fa-chart-pie"></i> Thống Kê</button>
                        <button onclick="deleteExamCampaign('${doc.id}', event)" class="btn" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; font-weight: bold;"><i class="fas fa-trash-alt"></i> Xóa Đợt Khám</button>
                    </div>
                </div>`;
        });
    });
}

// 2. TÌM KIẾM HỌC SINH NHẬP THỦ CÔNG
// 2. TỐI ƯU HÓA TÌM KIẾM HỌC SINH NHẬP THỦ CÔNG
async function searchStudentForExam(val) {
    const box = document.getElementById('exam-student-suggest');
    if (val.trim().length < 2) { box.style.display = 'none'; return; }

    // Tận dụng mảng RAM tập trung toàn trang để tránh lãng phí lượt đọc cơ sở dữ liệu
    let students = [];
    if (window.allStudents && window.allStudents.length > 0) {
        students = window.allStudents;
    } else {
        if (!examStudentCache) {
            const snap = await db.collection('yt_students').get();
            examStudentCache = [];
            snap.forEach(doc => examStudentCache.push({ id: doc.id, ...doc.data() }));
        }
        students = examStudentCache;
    }

    const keyword = removeVietnameseTones(val.trim());
    const matched = students.filter(st => {
        const str = `${st.name_search} ${st.class.toLowerCase()} ${st.id.toLowerCase()}`;
        return str.includes(keyword);
    }).slice(0, 10);

    box.innerHTML = '';
    if (matched.length === 0) {
        box.innerHTML = '<div style="padding:10px; color:red;">Không tìm thấy học sinh!</div>';
    } else {
        let htmlBuffer = '';
        matched.forEach(st => {
            // Sử dụng cơ chế tạo Element tạm hoặc gán nhanh
            const item = document.createElement('div');
            item.className = 'suggest-item';
            item.style.padding = '10px';
            item.innerHTML = `<strong>${st.name}</strong> - Lớp: <span style="color:#0062ff; font-weight:bold;">${st.class}</span>`;
            item.onclick = () => {
                document.getElementById('exam-student-search').value = st.name;
                document.getElementById('exam-student-class').value = st.class;
                document.getElementById('exam-selected-sid').value = st.id;
                box.style.display = 'none';
                
                if(st.height) document.getElementById('ex-height').value = st.height;
                if(st.weight) document.getElementById('ex-weight').value = st.weight;
            };
            box.appendChild(item);
        });
    }
    box.style.display = 'block';
}
// 3. LƯU PHIẾU KHÁM THỦ CÔNG
async function saveManualPhysicalExam() {
    const sid = document.getElementById('exam-selected-sid').value;
    const name = document.getElementById('exam-student-search').value.trim();
    const className = document.getElementById('exam-student-class').value;

    if (!activeCampaignId) return alert("Vui lòng chọn đợt khám!");
    if (!sid) return alert("Vui lòng tìm chọn một học sinh trong hệ thống!");

    const height = document.getElementById('ex-height').value.trim();
    const weight = document.getElementById('ex-weight').value.trim();

    const payload = {
        campaignId: activeCampaignId,
        studentId: sid,
        name,
        class: className,
        facility: document.getElementById('ex-facility').value.trim(),
        height,
        weight,
        examDate: document.getElementById('ex-date').value,
        reportDate: document.getElementById('ex-report-date').value,
        mentalHealth: document.getElementById('ex-mental').value,
        internalMedicine: document.getElementById('ex-internal').value,
        ent: document.getElementById('ex-ent').value,
        surgery: document.getElementById('ex-surgery').value,
        eyes: document.getElementById('ex-eyes').value,
        dental: document.getElementById('ex-dental').value,
        summary: {
            physicalDev: document.getElementById('ex-sum-phys').value.trim(),
            mentalDev: document.getElementById('ex-sum-ment').value.trim(),
            healthStatus: document.getElementById('ex-sum-status').value.trim(),
            notes: document.getElementById('ex-sum-notes').value.trim(),
            advice: document.getElementById('ex-sum-advice').value.trim()
        }
    };

    try {
        const batch = db.batch();
        const recordId = `${activeCampaignId}_${sid}`;
        batch.set(db.collection('yt_exam_results').doc(recordId), payload);

        if (height || weight) {
            let updateObj = {};
            if (height) updateObj.height = height;
            if (weight) updateObj.weight = weight;
            batch.update(db.collection('yt_students').doc(sid), updateObj);
        }

        await batch.commit();
        alert("✅ Đã lưu phiếu khám và cập nhật thể trạng học sinh gốc thành công!");
        resetManualExamForm();
        examStudentCache = null; 
    } catch (e) {
        alert("Lỗi khi lưu phiếu khám: " + e.message);
    }
}

function resetManualExamForm() {
    document.getElementById('exam-selected-sid').value = '';
    document.getElementById('exam-student-search').value = '';
    document.getElementById('exam-student-class').value = '';
    document.getElementById('ex-height').value = '';
    document.getElementById('ex-weight').value = '';
    document.getElementById('ex-sum-phys').value = '';
    document.getElementById('ex-sum-ment').value = '';
    document.getElementById('ex-sum-status').value = '';
    document.getElementById('ex-sum-notes').value = '';
    document.getElementById('ex-sum-advice').value = '';
}

// 4. THUẬT TOÁN ĐỊNH VỊ CỘT THÔNG MINH (DYNAMIC COLUMN MAPPING)
function buildColumnMapping(rawJson) {
    const row0 = rawJson[0] || [];
    const row1 = rawJson[1] || [];
    
    const map = {
        stt: -1, name: -1, facility: -1, class: -1, dob: -1,
        gender_nam: -1, gender_nu: -1, weight: -1, height: -1,
        exam_date: -1, report_date: -1,
        mental_normal: -1, mental_slow: -1, mental_adhd: -1, mental_autism: -1, mental_anxiety: -1, mental_depression: -1, mental_other: -1,
        internal_normal: -1, internal_abnormal: -1,
        ent_normal: -1, ent_deaf: -1, ent_disease: -1,
        surgery_normal: -1, surgery_kyphosis: -1, surgery_scoliosis: -1, surgery_joints: -1, surgery_genital: -1,
        eyes_normal: -1, eyes_reflex: -1, eyes_refractive: -1, eyes_disease: -1,
        dental_normal: -1, dental_cavities: -1, dental_missing: -1, dental_gingivitis: -1, dental_periodontitis: -1, dental_enamel: -1, dental_fluor: -1, dental_mucosa: -1, dental_tongue: -1, dental_lip: -1, dental_cleft: -1, dental_other: -1,
        sum_phys: -1, sum_ment: -1, sum_status: -1, sum_notes: -1, sum_advice: -1
    };

    const maxCols = Math.max(row0.length, row1.length);
    for (let c = 0; c < maxCols; c++) {
        const h0 = String(row0[c] || "").trim().toLowerCase();
        const h1 = String(row1[c] || "").trim().toLowerCase();

        if (h0.includes("stt") || h1.includes("stt")) { map.stt = c; continue; }
        if (h0.includes("họ tên") || h1.includes("họ tên") || h0.includes("họ và tên") || h1.includes("họ và tên")) { map.name = c; continue; }
        if (h0.includes("cơ sở") || h1.includes("cơ sở") || h0.includes("nơi khám") || h1.includes("nơi khám")) { map.facility = c; continue; }
        if (h0.includes("lớp") || h1.includes("lớp")) { map.class = c; continue; }
        if (h0.includes("ngày sinh") || h1.includes("ngày sinh")) { map.dob = c; continue; }
        if (h0.includes("ngày khám") || h1.includes("ngày khám")) { map.exam_date = c; continue; }
        if (h0.includes("lập phiếu") || h1.includes("lập phiếu") || h0.includes("báo cáo") || h1.includes("báo cáo")) { map.report_date = c; continue; }

        if (h1 === "nam" || (h1.includes("nam") && h0.includes("giới tính"))) { map.gender_nam = c; continue; }
        if (h1 === "nữ" || (h1.includes("nữ") && h0.includes("giới tính"))) { map.gender_nu = c; continue; }

        if (h1.includes("cân nặng") || h1.includes("nặng")) { map.weight = c; continue; }
        if (h1.includes("chiều cao") || h1.includes("cao")) { map.height = c; continue; }

        if (h1.includes("chậm phát triển")) { map.mental_slow = c; continue; }
        if (h1.includes("adhd") || h1.includes("giảm chú ý")) { map.mental_adhd = c; continue; }
        if (h1.includes("tự kỷ")) { map.mental_autism = c; continue; }
        if (h1.includes("lo âu")) { map.mental_anxiety = c; continue; }
        if (h1.includes("trầm cảm")) { map.mental_depression = c; continue; }
        if (h1.includes("khác") && h0.includes("tâm thần")) { map.mental_other = c; continue; }

        if (h1.includes("bất thường") && h0.includes("nội khoa")) { map.internal_abnormal = c; continue; }

        if (h1.includes("thính lực")) { map.ent_deaf = c; continue; }
        if ((h1.includes("bệnh") || h1.includes("bất thường") || h1.includes("tai mũi họng")) && h0.includes("tai mũi họng")) { map.ent_disease = c; continue; }

        if (h1.includes("còng")) { map.surgery_kyphosis = c; continue; }
        if (h1.includes("vẹo")) { map.surgery_scoliosis = c; continue; }
        if (h1.includes("khớp") || h1.includes("xương")) { map.surgery_joints = c; continue; }
        if (h1.includes("sinh dục")) { map.surgery_genital = c; continue; }

        if (h1.includes("phản xạ")) { map.eyes_reflex = c; continue; }
        if (h1.includes("khúc xạ")) { map.eyes_refractive = c; continue; }
        if ((h1.includes("bệnh") || h1.includes("bất thường")) && h0.includes("mắt")) { map.eyes_disease = c; continue; }

        if (h1.includes("sâu")) { map.dental_cavities = c; continue; }
        if (h1.includes("mất")) { map.dental_missing = c; continue; }
        if (h1.includes("nướu")) { map.dental_gingivitis = c; continue; }
        if (h1.includes("nha chu")) { map.dental_periodontitis = c; continue; }
        if (h1.includes("men răng") || h1.includes("thiểu sản")) { map.dental_enamel = c; continue; }
        if (h1.includes("fluor")) { map.dental_fluor = c; continue; }
        if (h1.includes("niêm mạc")) { map.dental_mucosa = c; continue; }
        if (h1.includes("thắng lưỡi") || h1.includes("dính thắng")) { map.dental_tongue = c; continue; }
        if (h1.includes("khe hở môi") || h1.includes("môi")) { map.dental_lip = c; continue; }
        if (h1.includes("khe hở vòm") || h1.includes("vòm")) { map.dental_cleft = c; continue; }
        if (h1.includes("khác") && h0.includes("răng")) { map.dental_other = c; continue; }

        if (h1.includes("thể chất")) { map.sum_phys = c; continue; }
        if (h1.includes("vận động") || h1.includes("tâm thần vận động") || h1.includes("tâm thần/vận động")) { map.sum_ment = c; continue; }
        if (h1.includes("sức khỏe") && h0.includes("tổng kết")) { map.sum_status = c; continue; }
        if (h1.includes("lưu ý") || h1.includes("bệnh, tật cần lưu ý")) { map.sum_notes = c; continue; }
        if (h1.includes("đề nghị") || h1.includes("yêu cầu")) { map.sum_advice = c; continue; }

        if (h1 === "bình thường") {
            if (h0.includes("tâm thần")) map.mental_normal = c;
            else if (h0.includes("nội khoa")) map.internal_normal = c;
            else if (h0.includes("tai mũi họng")) map.ent_normal = c;
            else if (h0.includes("ngoại khoa")) map.surgery_normal = c;
            else if (h0.includes("mắt")) map.eyes_normal = c;
            else if (h0.includes("răng")) map.dental_normal = c;
        }
    }

    // Cơ chế khôi phục dự phòng (Fallback) nếu cấu trúc Excel thiếu hụt thông tin tiêu đề
    if (map.stt === -1) map.stt = 0;
    if (map.name === -1) map.name = 1;
    if (map.facility === -1) map.facility = 2;
    if (map.class === -1) map.class = 3;
    if (map.dob === -1) map.dob = 4;
    if (map.gender_nam === -1) map.gender_nam = 5;
    if (map.gender_nu === -1) map.gender_nu = 6;
    if (map.weight === -1) map.weight = 7;
    if (map.height === -1) map.height = 8;
    if (map.exam_date === -1) map.exam_date = 9;
    if (map.report_date === -1) map.report_date = 10;
    
    if (map.mental_normal === -1) map.mental_normal = 11;
    if (map.mental_slow === -1) map.mental_slow = 12;
    if (map.mental_adhd === -1) map.mental_adhd = 13;
    if (map.mental_autism === -1) map.mental_autism = 14;
    if (map.mental_anxiety === -1) map.mental_anxiety = 15;
    if (map.mental_depression === -1) map.mental_depression = 16;
    if (map.mental_other === -1) map.mental_other = 17;

    if (map.internal_normal === -1) map.internal_normal = 18;
    if (map.internal_abnormal === -1) map.internal_abnormal = 19;

    if (map.ent_normal === -1) map.ent_normal = 20;
    if (map.ent_deaf === -1) map.ent_deaf = 21;
    if (map.ent_disease === -1) map.ent_disease = 22;

    if (map.surgery_normal === -1) map.surgery_normal = 23;
    if (map.surgery_kyphosis === -1) map.surgery_kyphosis = 24;
    if (map.surgery_scoliosis === -1) map.surgery_scoliosis = 25;
    if (map.surgery_joints === -1) map.surgery_joints = 26;
    if (map.surgery_genital === -1) map.surgery_genital = 27;

    if (map.eyes_normal === -1) map.eyes_normal = 28;
    if (map.eyes_reflex === -1) map.eyes_reflex = 29;
    if (map.eyes_refractive === -1) map.eyes_refractive = 30;
    if (map.eyes_disease === -1) map.eyes_disease = 31;

    if (map.dental_normal === -1) map.dental_normal = 32;
    if (map.dental_cavities === -1) map.dental_cavities = 33;
    if (map.dental_missing === -1) map.dental_missing = 34;
    if (map.dental_gingivitis === -1) map.dental_gingivitis = 35;
    if (map.dental_periodontitis === -1) map.dental_periodontitis = 36;
    if (map.dental_enamel === -1) map.dental_enamel = 37;
    if (map.dental_fluor === -1) map.dental_fluor = 38;
    if (map.dental_mucosa === -1) map.dental_mucosa = 39;
    if (map.dental_tongue === -1) map.dental_tongue = 40;
    if (map.dental_lip === -1) map.dental_lip = 41;
    if (map.dental_cleft === -1) map.dental_cleft = 42;
    if (map.dental_other === -1) map.dental_other = 43;

    if (map.sum_phys === -1) map.sum_phys = 44;
    if (map.sum_ment === -1) map.sum_ment = 45;
    if (map.sum_status === -1) map.sum_status = 46;
    if (map.sum_notes === -1) map.sum_notes = 47;
    if (map.sum_advice === -1) map.sum_advice = 48;

    return map;
}

// 5. ĐỌC VÀ NHẬP DỮ LIỆU EXCEL KHÁM SỨC KHỎE
async function handleExcelExamUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!activeCampaignId) { event.target.value = ''; return alert("Vui lòng chọn hoặc tạo đợt khám trước khi nạp dữ liệu!"); }

    event.target.value = ''; 

    const btn = document.getElementById('btn-excel-upload-trigger');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang phân tích...';
        btn.disabled = true;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array', cellDates: true});
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

            if (rawJson.length < 3) throw new Error("Tệp dữ liệu trống hoặc không hợp lệ!");

            // Xử lý lệch múi giờ trên các trình duyệt khác nhau bằng UTC Methods
            const formatExDate = (cellVal) => {
                if (!cellVal) return "";
                if (cellVal instanceof Date) {
                    let y = cellVal.getUTCFullYear();
                    let m = String(cellVal.getUTCMonth() + 1).padStart(2, '0');
                    let d = String(cellVal.getUTCDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                }
                // Hỗ trợ số Serial Date gốc trong Excel
                if (typeof cellVal === 'number' && cellVal > 25569) {
                    const utcDays = Math.floor(cellVal - 25569);
                    const dateInfo = new Date(utcDays * 86400 * 1000);
                    let y = dateInfo.getUTCFullYear();
                    let m = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
                    let d = String(dateInfo.getUTCDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                }
                return formatDateString(cellVal);
            };
            const formatExamDate = (cellVal) => {
    		if (!cellVal) return "";
    		if (cellVal instanceof Date) {
       			let temp = new Date(cellVal.getTime());
        		temp.setHours(temp.getHours() + 12); // Chỉ bù giờ riêng cho Ngày khám
        		let d = String(temp.getDate()).padStart(2, '0');
        		let m = String(temp.getMonth() + 1).padStart(2, '0');
        		let y = temp.getFullYear();
        		return `${y}-${m}-${d}`;
    	}
    		return formatDateString(cellVal);
		};
            const formatDateString = (dateInput) => {
                if (!dateInput) return '';
                let dateStr = String(dateInput).trim();
                let parts = dateStr.split(/[\/\-]/);
                if (parts.length === 3) {
                    let d = String(parts[0]).padStart(2, '0');
                    let m = String(parts[1]).padStart(2, '0');
                    let y = parts[2];
                    if (y.length === 2) y = "20" + y;
                    return `${y}-${m}-${d}`;
                }
                return dateStr;
            };

            const getChoiceFromMappedColumns = (row, columnsArray, labelsArray) => {
                for (let i = 0; i < columnsArray.length; i++) {
                    const colIndex = columnsArray[i];
                    if (colIndex !== undefined && colIndex !== -1) {
                        const cellVal = String(row[colIndex] || "").trim().toLowerCase();
                        if (cellVal === "x") return labelsArray[i];
                    }
                }
                return labelsArray[0]; 
            };

            // Thực hiện ánh xạ cột dựa trên tiêu đề của file
            const map = buildColumnMapping(rawJson);

            if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Khớp danh mục học sinh...';
            const studentsList = await getStudentsList(); 
            let dbStudentsMap = new Map();
	    studentsList.forEach(s => {
    		if (s.name && s.class) {
           	const cleanName = s.name.trim().toLowerCase();
        	const cleanClass = s.class.trim().toLowerCase();
        	const dobFormat = s.dob ? s.dob.trim() : '';

        		if (dobFormat) {
            			dbStudentsMap.set(`${cleanName}_${cleanClass}_${dobFormat}`, { id: s.id, ...s });
        		}
        		dbStudentsMap.set(`${cleanName}_${cleanClass}_`, { id: s.id, ...s });
    		}
	});

            let batches = [];
            let currentBatch = db.batch();
            let opCount = 0;
            let successCount = 0;
            let skippedCount = 0;

            // Đọc dữ liệu từ dòng số 3 (Index = 2)
            for (let r = 2; r < rawJson.length; r++) {
                const row = rawJson[r];
                if (row.length < 4) continue; 

                const name = String(row[map.name] || "").trim();
                const facility = String(row[map.facility] || "").trim();
                const className = String(row[map.class] || "").trim().toUpperCase();
                const dob = formatExDate(row[map.dob]);

                if (name && className) {
                    const nameLower = name.toLowerCase();
                    const classLower = className.toLowerCase();
                    
                    const matchKeyStrict = `${nameLower}_${classLower}_${dob}`;
                    const matchKeyFallback = `${nameLower}_${classLower}_`;

                    let matchedStudent = null;
                    if (dbStudentsMap.has(matchKeyStrict)) {
                        matchedStudent = dbStudentsMap.get(matchKeyStrict);
                    } else if (dbStudentsMap.has(matchKeyFallback)) {
                        matchedStudent = dbStudentsMap.get(matchKeyFallback);
                    }

                    if (matchedStudent) {
                        const student = matchedStudent;
                        
                        const weight = String(row[map.weight] || "").trim();
                        const height = String(row[map.height] || "").trim();
                        const examDate = formatExamDate(row[map.exam_date]);
                        const reportDate = formatExDate(row[map.report_date]);

                        const mentalCols = [map.mental_normal, map.mental_slow, map.mental_adhd, map.mental_autism, map.mental_anxiety, map.mental_depression, map.mental_other];
                        const mentalLabels = ["Bình thường", "Nghi ngờ chậm phát triển", "Nghi ngờ rối loạn giảm chú ý - tăng động", "Nghi ngờ rối loạn phổ tự kỷ", "Nghi ngờ lo âu", "Nghi ngờ trầm cảm", "Khác"];
                        const mental = getChoiceFromMappedColumns(row, mentalCols, mentalLabels);

                        const internalCols = [map.internal_normal, map.internal_abnormal];
                        const internalLabels = ["Bình thường", "Có phát hiện bất thường"];
                        const internal = getChoiceFromMappedColumns(row, internalCols, internalLabels);

                        const entCols = [map.ent_normal, map.ent_deaf, map.ent_disease];
                        const entLabels = ["Bình thường", "Có bất thường về thính lực", "Có bệnh về tai mũi họng"];
                        const ent = getChoiceFromMappedColumns(row, entCols, entLabels);

                        const surgeryCols = [map.surgery_normal, map.surgery_kyphosis, map.surgery_scoliosis, map.surgery_joints, map.surgery_genital];
                        const surgeryLabels = ["Bình thường", "Có còng cột sống", "Có vẹo cột sống", "Có bệnh về xương khớp", "Có bất thường về cơ quan sinh dục ngoài"];
                        const surgery = getChoiceFromMappedColumns(row, surgeryCols, surgeryLabels);

                        const eyesCols = [map.eyes_normal, map.eyes_reflex, map.eyes_refractive, map.eyes_disease];
                        const eyesLabels = ["Bình thường", "Có bất thường về phản xạ", "Có tật khúc xạ", "Có bệnh về mắt"];
                        const eyes = getChoiceFromMappedColumns(row, eyesCols, eyesLabels);

                        const dentalCols = [map.dental_normal, map.dental_cavities, map.dental_missing, map.dental_gingivitis, map.dental_periodontitis, map.dental_enamel, map.dental_fluor, map.dental_mucosa, map.dental_tongue, map.dental_lip, map.dental_cleft, map.dental_other];
                        const dentalLabels = ["Bình thường", "Có sâu răng", "Có mất răng", "Có viêm nướu", "Có viêm nha chu", "Có thiểu sản men răng", "Có răng nhiễm Fluor", "Có bệnh về niêm mạc miệng", "Có dị tật bẩm sinh về dính thắng lưỡi", "Có dị tật bẩm sinh về khe hở môi", "Có dị tật bẩm sinh về khe hở vòm miệng", "Có bệnh về răng hàm mặt khác"];
                        const dental = getChoiceFromMappedColumns(row, dentalCols, dentalLabels);

                        const summary = {
                            physicalDev: String(row[map.sum_phys] || "").trim(),
                            mentalDev: String(row[map.sum_ment] || "").trim(),
                            healthStatus: String(row[map.sum_status] || "").trim(),
                            notes: String(row[map.sum_notes] || "").trim(),
                            advice: String(row[map.sum_advice] || "").trim()
                        };

                        const recordId = `${activeCampaignId}_${student.id}`;
                        const refResult = db.collection('yt_exam_results').doc(recordId);

                        currentBatch.set(refResult, {
                            campaignId: activeCampaignId, studentId: student.id, name, class: className, dob,
                            facility, height, weight, examDate, reportDate, mentalHealth: mental,
                            internalMedicine: internal, ent, surgery, eyes, dental, summary
                        });
                        opCount++;

                        let updatePayload = {};
                        if (height) updatePayload.height = height;
                        if (weight) updatePayload.weight = weight;
                        if (!student.dob && dob) updatePayload.dob = dob;

                        if (Object.keys(updatePayload).length > 0) {
                            const refStudent = db.collection('yt_students').doc(student.id);
                            currentBatch.update(refStudent, updatePayload);
                            opCount++;
                        }

                        successCount++;

                        if (opCount >= 400) {
                            batches.push(currentBatch);
                            currentBatch = db.batch();
                            opCount = 0;
                        }
                    } else {
                        skippedCount++;
                    }
                }
            }

            if (opCount > 0) batches.push(currentBatch);

            if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu lên đám mây...';

            for (let b of batches) {
                await b.commit();
            }

            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }

            if (typeof writeAuditLog === 'function') {
                writeAuditLog("IMPORT_EXAM", "yt_exam_results", activeCampaignId, `Nhập hàng loạt phiếu khám bằng file Excel cho ${successCount} học sinh.`);
            }

            alert(`✅ Nhập dữ liệu thành công!\n- Số lượng phiếu khớp và cập nhật: ${successCount} học sinh.\n- Số lượng bị bỏ qua (không khớp trong hệ thống): ${skippedCount} học sinh.`);
            examStudentCache = null; 
        } catch (error) {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
            alert("Lỗi khi đọc file Excel khám: " + error.message);
            console.error(error);
        }
    };
    reader.readAsArrayBuffer(file);
}

// 6. XUẤT TẤT CẢ FILE MẪU CHUẨN SỞ GD&ĐT
function downloadExcelTemplateExam() {
    const row0 = [
        "STT", "Họ tên", "Cơ sở KTSK", "Lớp", "Ngày sinh",
        "Giới tính", "Giới tính",
        "Thể lực", "Thể lực",
        "Ngày khám", "Ngày lập phiếu",
        "Sức khỏe tâm thần", "Sức khỏe tâm thần", "Sức khỏe tâm thần", "Sức khỏe tâm thần", "Sức khỏe tâm thần", "Sức khỏe tâm thần", "Sức khỏe tâm thần",
        "Nội khoa", "Nội khoa",
        "Tai mũi họng", "Tai mũi họng", "Tai mũi họng",
        "Ngoại khoa", "Ngoại khoa", "Ngoại khoa", "Ngoại khoa", "Ngoại khoa",
        "Mắt", "Mắt", "Mắt", "Mắt",
        "Răng hàm mặt", "Răng hàm mặt", "Răng hàm mặt", "Răng hàm mặt", "Răng hàm mặt", "Răng hàm mặt", "Răng hàm mặt", "Răng hàm mặt", "Răng hàm mặt", "Răng hàm mặt", "Răng hàm mặt", "Răng hàm mặt",
        "Tổng kết", "Tổng kết", "Tổng kết", "Tổng kết", "Tổng kết"
    ];

    const row1 = [
        "", "", "", "", "",
        "Nam", "Nữ",
        "Cân nặng (kg)", "Chiều cao (cm)",
        "", "",
        "Bình thường", "Nghi ngờ chậm phát triển", "Nghi ngờ rối loạn giảm chú ý - tăng động", "Nghi ngờ rối loạn phổ tự kỷ", "Nghi ngờ lo âu", "Nghi ngờ trầm cảm", "Khác",
        "Bình thường", "Có phát hiện bất thường",
        "Bình thường", "Có bất thường về thính lực", "Có bất thường về tai mũi họng",
        "Bình thường", "Có còng cột sống", "Có vẹo cột sống", "Có bệnh về xương khớp", "Có bất thường về cơ quan sinh dục ngoài",
        "Bình thường", "Có bất thường về phản xạ", "Có tật khúc xạ", "Có bệnh về mắt",
        "Bình thường", "Có sâu răng", "Có mất răng", "Có viêm nướu", "Có viêm nha chu", "Có thiểu sản men răng", "Có răng nhiễm Fluor", "Có bệnh về niêm mạc miệng", "Có dị tật bẩm sinh về dính thắng lưỡi", "Có dị tật bẩm sinh về khe hở môi", "Có dị tật bẩm sinh về khe hở vòm miệng", "Có bệnh về răng hàm mặt khác",
        "Phát triển thể chất", "Phát triển tâm thần/vận động", "Tình trạng sức khỏe", "Bệnh, tật cần lưu ý", "Đề nghị"
    ];

    const sampleData = [
        row0,
        row1,
        [
            1, "Bùi Dương Quốc", "Trung tâm Y tế khu vực Long Đất", "10A1", "16/11/2009", "x", "",
            "41", "164", "08/10/2025", "08/10/2025",
            "x", "", "", "", "", "", "",
            "x", "",
            "x", "", "",
            "x", "", "", "", "",
            "", "", "x", "",
            "", "", "x", "", "", "", "", "", "", "", "", "",
            "SDD thể gầy còm", "Bình thường", "Đủ sức khỏe", "Sâu răng", "Không"
        ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleData);

    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, 
        { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, 
        { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, 
        { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } }, 
        { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } }, 
        { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } }, 
        { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } }, 
        { s: { r: 0, c: 9 }, e: { r: 1, c: 9 } }, 
        { s: { r: 0, c: 10 }, e: { r: 1, c: 10 } }, 
        { s: { r: 0, c: 11 }, e: { r: 0, c: 17 } }, 
        { s: { r: 0, c: 18 }, e: { r: 0, c: 19 } }, 
        { s: { r: 0, c: 20 }, e: { r: 0, c: 22 } }, 
        { s: { r: 0, c: 23 }, e: { r: 0, c: 27 } }, 
        { s: { r: 0, c: 28 }, e: { r: 0, c: 31 } }, 
        { s: { r: 0, c: 32 }, e: { r: 0, c: 43 } }, 
        { s: { r: 0, c: 44 }, e: { r: 0, c: 48 } }  
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mau_Kham_Suc_Khoe_SoGD");
    XLSX.writeFile(wb, "Mau_File_Kham_Suc_Khoe_Truong_VTS.xlsx");
}

// 7. BẢNG ĐIỀU KHIỂN CHI TIẾT ĐỢT KHÁM
async function openCampaignDetail(cid) {
    activeCampaignId = cid;
    const campaign = examCampaignsCache.find(c => c.id === cid);
    document.getElementById('detail-campaign-title').innerText = `Bảng nhập liệu: ${campaign ? campaign.name : cid}`;
    document.getElementById('campaign-detail-modal').style.display = 'flex';
    document.getElementById('exam-search-input').value = '';

    loadExamResultsForCampaign(cid);
}

function loadExamResultsForCampaign(cid, searchQuery = "") {
    const tbody = document.getElementById('campaign-students-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Đang tải danh sách học sinh...</td></tr>';

    // HUỶ luồng lắng nghe cũ (nếu có) trước khi mở đợt khám mới
    if (examResultsListener) examResultsListener();

    examResultsListener = db.collection('yt_exam_results')
        .where('campaignId', '==', cid)
        .onSnapshot(snap => {
            activeCampaignResults = [];
            snap.forEach(doc => { activeCampaignResults.push({ id: doc.id, ...doc.data() }); });
            renderCampaignStudentsTable(searchQuery);
        });
}

// 3. TỐI ƯU HÓA KẾT XUẤT DANH SÁCH HỌC SINH ĐÃ KHÁM ĐỊNH KỲ
let displayedExamCount = 50; // Giới hạn hiển thị ban đầu 50 em đã khám
let currentFilteredExams = [];

function renderCampaignStudentsTable(query = "") {
    const tbody = document.getElementById('campaign-students-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    const normalizedQuery = removeVietnameseTones(query.trim()).toLowerCase();
    currentFilteredExams = activeCampaignResults.filter(r => {
        const str = removeVietnameseTones(`${r.name} ${r.class}`).toLowerCase();
        return str.includes(normalizedQuery);
    });

    if (currentFilteredExams.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color:#64748b;">Chưa có học sinh hoặc không tìm thấy.</td></tr>';
        return;
    }

    // Phân trang lấy ra 50 bản ghi trước
    const sliceData = currentFilteredExams.slice(0, displayedExamCount);
    let htmlBuffer = '';
    
    sliceData.forEach(r => {
        htmlBuffer += `
            <tr style="transition:0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="font-weight:bold; color:#2563eb; font-size: 0.9rem;">${r.studentId}</td>
                <td style="font-weight:600; font-size: 0.9rem;">${r.name}</td>
                <td><span class="badge" style="background:#f1f5f9; color:#475569; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold;">Lớp ${r.class}</span></td>
                <td style="font-size: 0.9rem;">${r.examDate ? new Date(r.examDate).toLocaleDateString('vi-VN') : '--'}</td>
                <td style="text-align: right; white-space: nowrap; width: 1%;">
                    <div style="display: inline-flex; gap: 4px; justify-content: flex-end; align-items: center;">
                        <button onclick="viewStudentExamDetail('${r.id}')" class="btn btn-sm" style="background:#eff6ff; color:#2563eb; padding: 5px 10px; font-size: 0.8rem; font-weight:bold; border-radius: 6px; border: none; cursor: pointer; margin: 0;">Xem</button>
                        <button onclick="printStudentExamResult('${r.id}')" class="btn btn-sm" style="background:#f0fdf4; color:#16a34a; padding: 5px 10px; font-size: 0.8rem; font-weight:bold; border-radius: 6px; border: none; cursor: pointer; margin: 0;">In</button>
                        <button onclick="openManualEntryModal('${r.studentId}')" class="btn btn-sm" style="background:#fef3c7; color:#d97706; padding: 5px 10px; font-size: 0.8rem; font-weight:bold; border-radius: 6px; border: none; cursor: pointer; margin: 0;">Sửa</button>
                        <button onclick="deleteStudentExamRecord('${r.id}')" class="btn btn-sm" style="background:#fef2f2; color:#ef4444; padding: 5px 10px; font-size: 0.8rem; font-weight:bold; border-radius: 6px; border: none; cursor: pointer; margin: 0;">Xóa</button>
                    </div>
                </td>
            </tr>`;
    });
    
    tbody.innerHTML = htmlBuffer;
}
function searchExamResults() {
    const q = document.getElementById('exam-search-input').value;
    renderCampaignStudentsTable(q);
}

function triggerExcelExamUpload() {
    document.getElementById('excel-exam-upload-direct').click();
}

function openCreateCampaignModal() {
    document.getElementById('exam-new-name').value = '';
    document.getElementById('exam-new-id').value = '';
    document.getElementById('exam-new-method').value = 'manual';
    document.getElementById('create-campaign-modal').style.display = 'flex';
}

function closeCreateCampaignModal() {
    document.getElementById('create-campaign-modal').style.display = 'none';
}

function openManualEntryModal(studentId = null) {
    resetManualExamForm();
    const title = document.getElementById('manual-entry-title');
    const searchInput = document.getElementById('exam-student-search');

    if (studentId) {
        title.innerHTML = '<i class="fas fa-user-edit"></i> Cập nhật phiếu khám học sinh';
        searchInput.disabled = true;
        searchInput.style.background = "#f1f5f9";

        const record = activeCampaignResults.find(r => r.studentId === studentId);
        if (record) {
            document.getElementById('exam-selected-sid').value = record.studentId;
            document.getElementById('exam-student-search').value = record.name;
            document.getElementById('exam-student-class').value = record.class;
            document.getElementById('ex-facility').value = record.facility || '';
            document.getElementById('ex-height').value = record.height || '';
            document.getElementById('ex-weight').value = record.weight || '';
            document.getElementById('ex-date').value = record.examDate || '';
            document.getElementById('ex-report-date').value = record.reportDate || '';
            document.getElementById('ex-mental').value = record.mentalHealth || 'Bình thường';
            document.getElementById('ex-internal').value = record.internalMedicine || 'Bình thường';
            document.getElementById('ex-ent').value = record.ent || 'Bình thường';
            document.getElementById('ex-surgery').value = record.surgery || 'Bình thường';
            document.getElementById('ex-eyes').value = record.eyes || 'Bình thường';
            document.getElementById('ex-dental').value = record.dental || 'Bình thường';
            
            if (record.summary) {
                document.getElementById('ex-sum-phys').value = record.summary.physicalDev || '';
                document.getElementById('ex-sum-ment').value = record.summary.mentalDev || '';
                document.getElementById('ex-sum-status').value = record.summary.healthStatus || '';
                document.getElementById('ex-sum-notes').value = record.summary.notes || '';
                document.getElementById('ex-sum-advice').value = record.summary.advice || '';
            }
        }
    } else {
        title.innerHTML = '<i class="fas fa-keyboard"></i> Nhập phiếu khám sức khỏe thủ công';
        searchInput.disabled = false;
        searchInput.style.background = "white";
    }
    document.getElementById('manual-entry-modal').style.display = 'flex';
}

function closeManualEntryModal() {
    document.getElementById('manual-entry-modal').style.display = 'none';
}

function viewStudentExamDetail(recordId) {
    const r = activeCampaignResults.find(item => item.id === recordId);
    if (!r) return;

    const content = document.getElementById('view-exam-content');
    content.innerHTML = `
        <!-- Khối Thông Tin Chung -->
        <div style="background: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; gap: 20px;">
            <div>
                <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: bold;">Hồ sơ học sinh</span>
                <h3 style="margin: 4px 0 6px 0; color: #1e293b; font-size: 1.5rem; font-weight: 700;">${r.name}</h3>
                <div style="font-size: 0.9rem; color: #475569; display: flex; gap: 15px;">
                    <span>Mã YT: <strong style="color: #0f172a;">${r.studentId}</strong></span>
                    <span style="color: #cbd5e1;">|</span>
                    <span>Lớp: <strong style="color: #0062ff;">${r.class}</strong></span>
                </div>
            </div>
            <div style="text-align: right; font-size: 0.85rem; color: #64748b; line-height: 1.6;">
                <div>Ngày khám thực tế: <strong style="color: #1e293b;">${r.examDate ? new Date(r.examDate).toLocaleDateString('vi-VN') : 'Chưa ghi nhận'}</strong></div>
                <div>Ngày hoàn tất hồ sơ: <strong style="color: #1e293b;">${r.reportDate ? new Date(r.reportDate).toLocaleDateString('vi-VN') : 'Chưa ghi nhận'}</strong></div>
            </div>
        </div>

        <!-- Khối Chi Tiết Khám Chuyên Khoa và Kết Luận -->
        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; margin-top: 10px;">
            
            <!-- Cột trái: Khám Lâm Sàng -->
            <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 20px;">
                <h4 style="color: #0f172a; margin: 0; font-size: 1.1rem; font-weight: 700; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Khám chuyên khoa</h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 0.95rem;">
                    <div style="grid-column: span 2; background: #f8fafc; padding: 12px 16px; border-radius: 8px;">
                        <span style="color: #64748b; font-size: 0.8rem; display: block; text-transform: uppercase; margin-bottom: 2px;">Cơ sở thực hiện</span>
                        <strong style="color: #1e293b;">${r.facility || 'Chưa ghi nhận'}</strong>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px;">
                        <span style="color: #64748b; font-size: 0.8rem; display: block; text-transform: uppercase; margin-bottom: 2px;">Chiều cao</span>
                        <strong style="color: #1e293b;">${r.height ? r.height + ' cm' : 'Chưa đo'}</strong>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px;">
                        <span style="color: #64748b; font-size: 0.8rem; display: block; text-transform: uppercase; margin-bottom: 2px;">Cân nặng</span>
                        <strong style="color: #1e293b;">${r.weight ? r.weight + ' kg' : 'Chưa cân'}</strong>
                    </div>

                    <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; grid-column: span 2; margin: 5px 0 0 0;"></div>

                    <div>
                        <span style="color: #64748b; font-size: 0.8rem; display: block; text-transform: uppercase;">Mắt</span>
                        <strong style="color: #1e293b;">${r.eyes}</strong>
                    </div>
                    <div>
                        <span style="color: #64748b; font-size: 0.8rem; display: block; text-transform: uppercase;">Răng hàm mặt</span>
                        <strong style="color: #1e293b;">${r.dental}</strong>
                    </div>
                    <div>
                        <span style="color: #64748b; font-size: 0.8rem; display: block; text-transform: uppercase;">Tai mũi họng</span>
                        <strong style="color: #1e293b;">${r.ent}</strong>
                    </div>
                    <div>
                        <span style="color: #64748b; font-size: 0.8rem; display: block; text-transform: uppercase;">Nội khoa</span>
                        <strong style="color: #1e293b;">${r.internalMedicine}</strong>
                    </div>
                    <div>
                        <span style="color: #64748b; font-size: 0.8rem; display: block; text-transform: uppercase;">Ngoại khoa / Cột sống</span>
                        <strong style="color: #1e293b;">${r.surgery}</strong>
                    </div>
                    <div>
                        <span style="color: #64748b; font-size: 0.8rem; display: block; text-transform: uppercase;">Sức khỏe tâm thần</span>
                        <strong style="color: #1e293b;">${r.mentalHealth}</strong>
                    </div>
                </div>
            </div>

            <!-- Cột phải: Đánh giá & Kết luận -->
            <div style="background: #faf5ff; padding: 24px; border-radius: 12px; border: 1px solid #f3e8ff; display: flex; flex-direction: column; gap: 20px;">
                <h4 style="color: #6b21a8; margin: 0; font-size: 1.1rem; font-weight: 700; border-bottom: 2px solid #f3e8ff; padding-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Kết luận tổng hợp</h4>
                
                <div style="display: flex; flex-direction: column; gap: 16px; font-size: 0.95rem;">
                    <div>
                        <span style="color: #8b5cf6; font-size: 0.8rem; display: block; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Phát triển thể chất</span>
                        <div style="color: #1e293b; font-weight: 600; background: white; padding: 10px 14px; border-radius: 8px; border: 1px solid #e9d5ff;">${r.summary.physicalDev || 'Chưa đánh giá'}</div>
                    </div>
                    
                    <div>
                        <span style="color: #8b5cf6; font-size: 0.8rem; display: block; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Phát triển tâm thần vận động</span>
                        <div style="color: #1e293b; font-weight: 600; background: white; padding: 10px 14px; border-radius: 8px; border: 1px solid #e9d5ff;">${r.summary.mentalDev || 'Chưa đánh giá'}</div>
                    </div>
                    
                    <div>
                        <span style="color: #8b5cf6; font-size: 0.8rem; display: block; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Tình trạng sức khỏe chung</span>
                        <div style="color: #1e293b; font-weight: 600; background: white; padding: 10px 14px; border-radius: 8px; border: 1px solid #e9d5ff;">${r.summary.healthStatus || 'Chưa đánh giá'}</div>
                    </div>
                    
                    <div>
                        <span style="color: #b91c1c; font-size: 0.8rem; display: block; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Bệnh lý cần lưu ý</span>
                        <div style="color: #b91c1c; font-weight: 600; background: #fef2f2; padding: 10px 14px; border-radius: 8px; border: 1px solid #fecaca;">${r.summary.notes || 'Không phát hiện bất thường'}</div>
                    </div>
                    
                    <div>
                        <span style="color: #6b21a8; font-size: 0.8rem; display: block; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Đề nghị điều trị / Theo dõi chuyên khoa</span>
                        <div style="color: #4c1d95; font-weight: 600; background: #fdf4ff; padding: 10px 14px; border-radius: 8px; border: 1px solid #f5d0fe; white-space: pre-line;">${r.summary.advice || 'Không yêu cầu chỉ định thêm'}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- PHẦN THÊM MỚI: Khối chứa nút In Phiếu Kết Quả -->
        <div style="margin-top: 25px; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            <button onclick="printStudentExamResult('${r.id}')" class="btn" style="background: #10b981; color: white; border: none; font-weight: bold; padding: 10px 22px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">
                <i class="fas fa-print"></i> In phiếu kết quả (Khổ A5)
            </button>
        </div>
    `;

    document.getElementById('view-exam-detail-modal').style.display = 'flex';
}
async function deleteStudentExamRecord(recordId) {
    const r = activeCampaignResults.find(item => item.id === recordId);
    if (!r) return;

    if (confirm(`Xác nhận xóa kết quả khám sức khỏe của học sinh: ${r.name} trong đợt này?`)) {
        try {
            await db.collection('yt_exam_results').doc(recordId).delete();
            alert("✅ Đã xóa bản ghi phiếu khám thành công!");
        } catch (e) {
            alert("Lỗi khi xóa bản ghi: " + e.message);
        }
    }
}

// 8. TẠO ĐỢT KHÁM MỚI
async function createNewExamCampaign() {
    const name = document.getElementById('exam-new-name').value.trim();
    let cid = document.getElementById('exam-new-id').value.trim();
    const selectedMethod = document.getElementById('exam-new-method').value;

    if (!name) return alert("Vui lòng nhập Tên đợt khám!");
    if (!cid) cid = "KHAM_" + Date.now().toString().slice(-6);

    try {
        await db.collection('yt_exam_campaigns').doc(cid).set({
            name: name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        closeCreateCampaignModal();
        await openCampaignDetail(cid);

        if (selectedMethod === 'manual') {
            openManualEntryModal();
        } else {
            triggerExcelExamUpload();
        }

        if (typeof writeAuditLog === 'function') {
            writeAuditLog("CREATE_EXAM", "yt_exam_campaigns", cid, `Khởi tạo đợt khám sức khỏe mới: ${name}.`);
        }

        alert(`🎉 Đã khởi tạo thành công đợt khám mới!`);
    } catch (e) {
        console.error("❌ LỖI FIRESTORE (Tạo đợt khám):", e);
        alert(`❌ LỖI KẾT NỐI DATABASE:\n\nChi tiết: ${e.message}`);
    }
}

// 9. XÓA ĐỢT KHÁM
async function deleteExamCampaign(cid, event) {
    if (event) event.stopPropagation(); 

    const campaign = examCampaignsCache.find(c => c.id === cid);
    const displayName = campaign ? campaign.name : cid;

    if (confirm(`⚠️ CẢNH BÁO: Xóa đợt khám: ${displayName}?\nHành động này sẽ XÓA TOÀN BỘ kết quả khám sức khỏe của TẤT CẢ học sinh thuộc đợt khám này.`)) {
        try {
            const batch = db.batch();
            batch.delete(db.collection('yt_exam_campaigns').doc(cid));

            const resultsSnap = await db.collection('yt_exam_results').where('campaignId', '==', cid).get();
            resultsSnap.forEach(doc => batch.delete(doc.ref));

            await batch.commit();
            alert("✅ Đã xóa đợt khám thành công!");
        } catch (e) {
            alert("Lỗi: " + e.message);
        }
    }
}

// 10. THỐNG KÊ CHI TIẾT CHỈ SỐ SỨC KHỎE ĐỢT KHÁM
async function viewCampaignStats(cid, event) {
    if (event) event.stopPropagation();

    const campaign = examCampaignsCache.find(c => c.id === cid);
    document.getElementById('stats-campaign-title').innerText = `Thống kê kết quả: ${campaign ? campaign.name : cid}`;
    
    const grid = document.getElementById('stats-render-grid');
    grid.innerHTML = '<div style="grid-column: span 2; text-align:center; padding:50px;"><i class="fas fa-spinner fa-spin fa-2x"></i> Đang phân tích dữ liệu và vẽ biểu đồ...</div>';
    document.getElementById('exam-stats-modal').style.display = 'flex';

    try {
        const snap = await db.collection('yt_exam_results').where('campaignId', '==', cid).get();
        if (snap.empty) {
            grid.innerHTML = '<div style="grid-column: span 2; text-align:center; padding: 50px; color:#64748b;">Chưa tìm thấy dữ liệu khám trong đợt này.</div>';
            return;
        }

        let total = snap.size;
        let bmiStats = { underweight: 0, normal: 0, overweight: 0, obese: 0 };
        let diseaseStats = { eyes: 0, dental: 0, mental: 0, ent: 0, surgery: 0, internal: 0 };

        currentStatsResultsCache = [];
		snap.forEach(doc => {
    	const v = doc.data();
    		currentStatsResultsCache.push({ id: doc.id, ...v });
            if (v.height && v.weight) {
                const h = parseFloat(v.height) / 100;
                const w = parseFloat(v.weight);
                if (h > 0 && w > 0) {
                    const bmi = w / (h * h);
                    if (bmi < 18.5) bmiStats.underweight++;
                    else if (bmi < 25.0) bmiStats.normal++;
                    else if (bmi < 30.0) bmiStats.overweight++;
                    else bmiStats.obese++;
                }
            }
            if (v.eyes && v.eyes !== "Bình thường") diseaseStats.eyes++;
            if (v.dental && v.dental !== "Bình thường") diseaseStats.dental++;
            if (v.mentalHealth && v.mentalHealth !== "Bình thường") diseaseStats.mental++;
            if (v.ent && v.ent !== "Bình thường") diseaseStats.ent++;
            if (v.surgery && v.surgery !== "Bình thường") diseaseStats.surgery++;
            if (v.internalMedicine && v.internalMedicine !== "Bình thường") diseaseStats.internal++;
        });

        const getPercent = (count) => total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";

        // Tạo ra các biến lưu phần trăm để vẽ biểu đồ thanh (bar charts)
        const pctNormal = getPercent(bmiStats.normal);
        const pctUnder = getPercent(bmiStats.underweight);
        const pctOver = getPercent(bmiStats.overweight);
        const pctObese = getPercent(bmiStats.obese);

        const pctEyes = getPercent(diseaseStats.eyes);
        const pctDental = getPercent(diseaseStats.dental);
        const pctMental = getPercent(diseaseStats.mental);
        const pctEnt = getPercent(diseaseStats.ent);
        const pctSurgery = getPercent(diseaseStats.surgery);

        grid.innerHTML = `
            <!-- CỘT 1: PHÂN TÍCH PHÂN PHỐI THỂ TRẠNG BMI (CỘT TRÁI) -->
            <div style="background: white; border: 1px solid #e2e8f0; padding: 26px; border-radius: 12px;">
                <h4 style="color: #0f172a; margin-top: 0; margin-bottom: 6px; font-size: 1.1rem; font-weight: 700;">Chỉ số thể trạng BMI</h4>
                <p style="color: #64748b; font-size: 0.85rem; margin: 0 0 20px 0;">Tổng số học sinh được đo: ${total} học sinh</p>
                
                <!-- Thanh tiến trình gộp phân bổ liên tục -->
                <div style="display: flex; height: 16px; border-radius: 8px; overflow: hidden; background: #f1f5f9; margin-bottom: 24px;">
                    <div style="width: ${pctNormal}%; background: #10b981; transition: width 0.5s;" title="Bình thường: ${pctNormal}%"></div>
                    <div style="width: ${pctUnder}%; background: #3b82f6; transition: width 0.5s;" title="Thiếu cân: ${pctUnder}%"></div>
                    <div style="width: ${pctOver}%; background: #f59e0b; transition: width 0.5s;" title="Thừa cân: ${pctOver}%"></div>
                    <div style="width: ${pctObese}%; background: #ef4444; transition: width 0.5s;" title="Béo phì: ${pctObese}%"></div>
                </div>

                <!-- Danh sách chi tiết thể trạng có thể tương tác -->
                <div style="display: flex; flex-direction: column; gap: 14px;">
                    <div onclick="showDrilldownStudents('bmi_normal', 'Danh sách Học sinh có Thể trạng Bình thường')" style="cursor: pointer; padding: 6px; border-radius: 8px; transition: 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 4px;">
                            <span style="font-weight: 600; color: #1e293b;">Bình thường</span>
                            <span style="color: #475569;">${bmiStats.normal} học sinh (${pctNormal}%)</span>
                        </div>
                        <div style="height: 6px; background: #f1f5f9; border-radius: 3px;"><div style="width: ${pctNormal}%; height: 100%; background: #10b981; border-radius: 3px;"></div></div>
                    </div>
                    
                    <div onclick="showDrilldownStudents('bmi_underweight', 'Danh sách Học sinh Thiếu cân')" style="cursor: pointer; padding: 6px; border-radius: 8px; transition: 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 4px;">
                            <span style="font-weight: 600; color: #1e293b;">Thiếu cân</span>
                            <span style="color: #475569;">${bmiStats.underweight} học sinh (${pctUnder}%)</span>
                        </div>
                        <div style="height: 6px; background: #f1f5f9; border-radius: 3px;"><div style="width: ${pctUnder}%; height: 100%; background: #3b82f6; border-radius: 3px;"></div></div>
                    </div>

                    <div onclick="showDrilldownStudents('bmi_overweight', 'Danh sách Học sinh Thừa cân')" style="cursor: pointer; padding: 6px; border-radius: 8px; transition: 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 4px;">
                            <span style="font-weight: 600; color: #1e293b;">Thừa cân</span>
                            <span style="color: #475569;">${bmiStats.overweight} học sinh (${pctOver}%)</span>
                        </div>
                        <div style="height: 6px; background: #f1f5f9; border-radius: 3px;"><div style="width: ${pctOver}%; height: 100%; background: #f59e0b; border-radius: 3px;"></div></div>
                    </div>

                    <div onclick="showDrilldownStudents('bmi_obese', 'Danh sách Học sinh Béo phì')" style="cursor: pointer; padding: 6px; border-radius: 8px; transition: 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 4px;">
                            <span style="font-weight: 600; color: #1e293b;">Béo phì</span>
                            <span style="color: #475569;">${bmiStats.obese} học sinh (${pctObese}%)</span>
                        </div>
                        <div style="height: 6px; background: #f1f5f9; border-radius: 3px;"><div style="width: ${pctObese}%; height: 100%; background: #ef4444; border-radius: 3px;"></div></div>
                    </div>
                </div>
            </div>

            <!-- CÔT 2: BIỂU ĐỒ BỆNH LÝ PHÁT HIỆN (CỘT PHẢI) -->
            <div style="background: white; border: 1px solid #e2e8f0; padding: 26px; border-radius: 12px;">
                <h4 style="color: #0f172a; margin-top: 0; margin-bottom: 6px; font-size: 1.1rem; font-weight: 700;">Biểu đồ bệnh lý phát hiện</h4>
                <p style="color: #64748b; font-size: 0.85rem; margin: 0 0 20px 0;">Tỷ lệ xuất hiện bất thường lâm sàng tại các chuyên khoa</p>

                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div onclick="showDrilldownStudents('eyes', 'Danh sách bệnh lý về Mắt / Tật khúc xạ')" style="cursor: pointer; padding: 8px; border-radius: 8px; transition: 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 5px;">
                            <span style="font-weight: 600; color: #1e293b;">Bệnh về Mắt / Tật khúc xạ</span>
                            <span style="font-weight: bold; color: #0062ff;">${diseaseStats.eyes} ca (${pctEyes}%)</span>
                        </div>
                        <div style="height: 10px; background: #f1f5f9; border-radius: 5px;">
                            <div style="width: ${pctEyes}%; height: 100%; background: #3b82f6; border-radius: 5px; transition: width 0.8s;"></div>
                        </div>
                    </div>

                    <div onclick="showDrilldownStudents('dental', 'Danh sách bệnh lý Răng Hàm Mặt')" style="cursor: pointer; padding: 8px; border-radius: 8px; transition: 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 5px;">
                            <span style="font-weight: 600; color: #1e293b;">Bệnh Răng Hàm Mặt</span>
                            <span style="font-weight: bold; color: #0062ff;">${diseaseStats.dental} ca (${pctDental}%)</span>
                        </div>
                        <div style="height: 10px; background: #f1f5f9; border-radius: 5px;">
                            <div style="width: ${pctDental}%; height: 100%; background: #3b82f6; border-radius: 5px; transition: width 0.8s;"></div>
                        </div>
                    </div>

                    <div onclick="showDrilldownStudents('surgery', 'Danh sách bất thường Cột sống / Ngoại khoa')" style="cursor: pointer; padding: 8px; border-radius: 8px; transition: 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 5px;">
                            <span style="font-weight: 600; color: #1e293b;">Cột sống (Còng, vẹo) / Ngoại khớp</span>
                            <span style="font-weight: bold; color: #0062ff;">${diseaseStats.surgery} ca (${pctSurgery}%)</span>
                        </div>
                        <div style="height: 10px; background: #f1f5f9; border-radius: 5px;">
                            <div style="width: ${pctSurgery}%; height: 100%; background: #3b82f6; border-radius: 5px; transition: width 0.8s;"></div>
                        </div>
                    </div>

                    <div onclick="showDrilldownStudents('ent', 'Danh sách bất thường Tai Mũi Họng')" style="cursor: pointer; padding: 8px; border-radius: 8px; transition: 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 5px;">
                            <span style="font-weight: 600; color: #1e293b;">Bất thường Tai Mũi Họng</span>
                            <span style="font-weight: bold; color: #0062ff;">${diseaseStats.ent} ca (${pctEnt}%)</span>
                        </div>
                        <div style="height: 10px; background: #f1f5f9; border-radius: 5px;">
                            <div style="width: ${pctEnt}%; height: 100%; background: #3b82f6; border-radius: 5px; transition: width 0.8s;"></div>
                        </div>
                    </div>

                    <div onclick="showDrilldownStudents('mental', 'Danh sách nghi ngờ tâm lý / tâm thần')" style="cursor: pointer; padding: 8px; border-radius: 8px; transition: 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 5px;">
                            <span style="font-weight: 600; color: #1e293b;">Nghi ngờ tâm lý / tâm thần</span>
                            <span style="font-weight: bold; color: #0062ff;">${diseaseStats.mental} ca (${pctMental}%)</span>
                        </div>
                        <div style="height: 10px; background: #f1f5f9; border-radius: 5px;">
                            <div style="width: ${pctMental}%; height: 100%; background: #3b82f6; border-radius: 5px; transition: width 0.8s;"></div>
                        </div>
                    </div>
                </div>
            </div>`;
    } catch (e) {
        grid.innerHTML = `<div style="grid-column:span 2; color:red; text-align:center; padding: 20px;">Lỗi tính toán dữ liệu: ${e.message}</div>`;
    }
}
// 11. HÀM IN PHIẾU KẾT QUẢ KHÁM SỨC KHỎE KHỔ A5 (THIẾT KẾ HIỆN ĐẠI, CAO CẤP)
async function printStudentExamResult(recordId) {
    const r = activeCampaignResults.find(item => item.id === recordId);
    if (!r) return alert("Không tìm thấy dữ liệu phiếu khám!");

    const campaign = examCampaignsCache.find(c => c.id === r.campaignId);

    let gender = "Chưa xác định";
    let studentCode = "--";
    let age = "N/A";

    try {
        const stSnap = await db.collection('yt_students').doc(r.studentId).get();
        if (stSnap.exists) {
            const stData = stSnap.data();
            gender = stData.gender || "Chưa xác định";
            studentCode = stData.studentCode || stData.code || "--";
            
            const dob = stData.dob || r.dob || "";
            if (dob) {
                let birthYear = NaN;
                if (dob.includes('-')) birthYear = parseInt(dob.split('-')[0]);
                else if (dob.includes('/')) {
                    let parts = dob.split('/');
                    if (parts[2] && parts[2].length === 4) birthYear = parseInt(parts[2]);
                    else if (parts[0] && parts[0].length === 4) birthYear = parseInt(parts[0]);
                }
                if (!isNaN(birthYear)) {
                    age = new Date().getFullYear() - birthYear;
                }
            }
        }
    } catch (err) {
        console.warn("Không thể tải bổ sung thông tin từ hồ sơ gốc:", err);
    }

    let bmiVal = "--";
    let bmiClass = "Chưa có chỉ số";
    if (r.height && r.weight) {
        let h = parseFloat(r.height) / 100;
        let w = parseFloat(r.weight);
        if (h > 0 && w > 0) {
            let bmi = w / (h * h);
            bmiVal = bmi.toFixed(1);
            if (bmi < 18.5) bmiClass = "Thiếu cân";
            else if (bmi < 25.0) bmiClass = "Bình thường";
            else if (bmi < 30.0) bmiClass = "Thừa cân";
            else bmiClass = "Béo phì";
        }
    }

    // Thiết kế cấu trúc HTML A5 cao cấp, hiện đại
    const htmlContent = `
        <div style="width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.35; box-sizing: border-box; background: white;">
            
            <!-- ĐƯỜNG VIỀN ĐẦU TRANG -->
            <div style="height: 4px; background: #2563eb; width: 100%; border-radius: 2px; margin-bottom: 12px;"></div>

            <!-- TIÊU ĐỀ ĐẦU TRANG -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 6px;">
                <div style="line-height: 1.3;">
                    <div style="font-size: 8pt; font-weight: 800; color: #1e293b; text-transform: uppercase; margin-top: 1px;">Trường THPT Võ Thị Sáu- BRVT</div>
                    <div style="font-size: 7pt; font-weight: 600; color: #64748b; text-transform: uppercase;">Phòng Y Tế</div>
                </div>
                <div style="text-align: right; line-height: 1.3;">
                    <div style="font-size: 8pt; font-weight: bold; color: #2563eb; font-family: monospace;">MÃ PHIẾU: ${r.id}</div>
		    <img src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${r.id}&scale=2&height=6&includetext=false" alt="Barcode" style="height: 18px; max-width: 150px; opacity: 0.85;">
                </div>
            </div>

            <!-- TIÊU ĐỀ LỚN CHÍNH -->
            <div style="text-align: center; margin-bottom: 15px; margin-top: 5px;">
                <h1 style="margin: 0 0 3px 0; font-size: 13pt; font-weight: 800; color: #1e3a8a; letter-spacing: 0.5px;">PHIẾU KẾT QUẢ KHÁM SỨC KHỎE</h1>
            </div>

            <!-- MỤC 1: THÔNG TIN ĐỢT KHÁM -->
            <div style="margin-bottom: 10px;">
                <div style="font-size: 8.5pt; font-weight: 800; color: #1e3a8a; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.3px;">1. Thông tin đợt khám</div>
                <table style="width: 100%; font-size: 8pt; border-collapse: collapse;">
                    <tr>
                        <td style="width: 18%; color: #64748b; padding: 2.5px 0;">Đợt khám:</td>
                        <td style="width: 47%; font-weight: 600; color: #0f172a; padding: 2.5px 0;">${campaign ? campaign.name : 'Khám định kỳ học sinh'}</td>
                        <td style="width: 15%; color: #64748b; padding: 2.5px 0;">Ngày khám:</td>
                        <td style="width: 20%; font-weight: 600; color: #0f172a; padding: 2.5px 0;">${r.examDate ? new Date(r.examDate).toLocaleDateString('vi-VN') : '--'}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 2.5px 0;">Cơ sở y tế:</td>
                        <td style="font-weight: 600; color: #0f172a; padding: 2.5px 0;">${r.facility || '--'}</td>
                        <td style="color: #64748b; padding: 2.5px 0;">Ngày lập:</td>
                        <td style="font-weight: 600; color: #0f172a; padding: 2.5px 0;">${r.reportDate ? new Date(r.reportDate).toLocaleDateString('vi-VN') : '--'}</td>
                    </tr>
                </table>
            </div>

            <!-- MỤC 2: THÔNG TIN HỌC SINH (CARD PROFILE THIẾT KẾ ĐẸP) -->
            <div style="margin-bottom: 10px;">
                <div style="font-size: 8.5pt; font-weight: 800; color: #1e3a8a; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.3px;">2. Thông tin học sinh</div>
                <table style="width: 100%; font-size: 8pt; border-collapse: collapse; margin-bottom: 4px;">
                    <tr>
                        <td style="width: 18%; color: #64748b; padding: 2.5px 0;">Họ và tên:</td>
                        <td style="width: 47%; font-weight: 700; font-size: 9.5pt; color: #1e3a8a; padding: 2.5px 0;">${r.name}</td>
                        <td style="width: 15%; color: #64748b; padding: 2.5px 0;">Lớp:</td>
                        <td style="width: 20%; font-weight: 700; color: #2563eb; padding: 2.5px 0;">${r.class}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 2.5px 0;">Giới tính:</td>
                        <td style="font-weight: 600; color: #0f172a; padding: 2.5px 0;">${gender}</td>
                        <td style="color: #64748b; padding: 2.5px 0;">Tuổi:</td>
                        <td style="font-weight: 600; color: #0f172a; padding: 2.5px 0;">${age}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 2.5px 0;">Mã Y tế:</td>
                        <td style="font-weight: 600; color: #0f172a; padding: 2.5px 0; font-family: monospace;">${r.studentId}</td>
                        <td style="color: #64748b; padding: 2.5px 0;">Mã HS:</td>
                        <td style="font-weight: 600; color: #0f172a; padding: 2.5px 0;">${studentCode}</td>
                    </tr>
                </table>
            </div>

            <!-- MỤC 3: THÔNG TIN THỂ LỰC -->
            <div style="margin-bottom: 10px;">
                <div style="font-size: 8.5pt; font-weight: 800; color: #1e3a8a; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.3px;">3. Thông tin thể lực</div>
                <table style="width: 100%; font-size: 8pt; border-collapse: collapse;">
                    <tr>
                        <td style="width: 18%; color: #64748b; padding: 2.5px 0;">Cân nặng:</td>
                        <td style="width: 32%; font-weight: 600; color: #0f172a; padding: 2.5px 0;">${r.weight ? r.weight + ' kg' : '--'}</td>
                        <td style="width: 15%; color: #64748b; padding: 2.5px 0;">Chiều cao:</td>
                        <td style="width: 35%; font-weight: 600; color: #0f172a; padding: 2.5px 0;">${r.height ? r.height + ' cm' : '--'}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 2.5px 0;">Chỉ số BMI:</td>
                        <td style="font-weight: 600; color: #0f172a; padding: 2.5px 0;">${bmiVal}</td>
                        <td style="color: #64748b; padding: 2.5px 0;">Đánh giá:</td>
                        <td style="font-weight: 700; color: #10b981; padding: 2.5px 0;">${bmiClass}</td>
                    </tr>
                </table>
            </div>

            <!-- MỤC 4: KẾT QUẢ CHUYÊN KHOA (THIẾT KẾ DẠNG BẢNG KHÔNG VIỀN NGOÀI HIỆN ĐẠI) -->
            <div style="margin-bottom: 10px;">
                <div style="font-size: 8.5pt; font-weight: 800; color: #1e3a8a; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.3px;">4. Kết quả chuyên khoa</div>
                <table style="width: 100%; font-size: 8pt; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                    <thead>
                        <tr style="background-color: #f1f5f9; border-bottom: 1.5px solid #cbd5e1;">
                            <th style="width: 35%; border-right: 1px solid #e2e8f0; padding: 5px; text-align: left; font-weight: 700; color: #475569;">Chuyên khoa</th>
                            <th style="width: 65%; padding: 5px; text-align: left; font-weight: 700; color: #475569;">Kết quả khám lâm sàng</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="border-right: 1px solid #e2e8f0; padding: 4px 6px; font-weight: 600; color: #475569;">Mắt / Thị lực</td>
                            <td style="padding: 4px 6px; color: #0f172a;">${r.eyes || 'Bình thường'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="border-right: 1px solid #e2e8f0; padding: 4px 6px; font-weight: 600; color: #475569;">Răng Hàm Mặt</td>
                            <td style="padding: 4px 6px; color: #0f172a;">${r.dental || 'Bình thường'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="border-right: 1px solid #e2e8f0; padding: 4px 6px; font-weight: 600; color: #475569;">Tai Mũi Họng</td>
                            <td style="padding: 4px 6px; color: #0f172a;">${r.ent || 'Bình thường'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="border-right: 1px solid #e2e8f0; padding: 4px 6px; font-weight: 600; color: #475569;">Nội khoa</td>
                            <td style="padding: 4px 6px; color: #0f172a;">${r.internalMedicine || 'Bình thường'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="border-right: 1px solid #e2e8f0; padding: 4px 6px; font-weight: 600; color: #475569;">Ngoại khoa / Xương khớp</td>
                            <td style="padding: 4px 6px; color: #0f172a;">${r.surgery || 'Bình thường'}</td>
                        </tr>
                        <tr>
                            <td style="border-right: 1px solid #e2e8f0; padding: 4px 6px; font-weight: 600; color: #475569;">Tâm lý / Tâm thần</td>
                            <td style="padding: 4px 6px; color: #0f172a;">${r.mentalHealth || 'Bình thường'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- MỤC 5: TỔNG KẾT (KHỐI BOX MÀU ẤM CAO CẤP, PHÂN TÁCH RÕ RÀNG) -->
            <div style="margin-bottom: 15px; background: #fffbeb; padding: 10px 12px; border-radius: 8px; border: 1px solid #fef3c7;">
                <div style="font-size: 8.5pt; font-weight: 800; color: #b45309; border-bottom: 1px solid #fde68a; padding-bottom: 3px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.3px;">5. Tổng kết đánh giá chung</div>
                <table style="width: 100%; font-size: 8pt; border-collapse: collapse; line-height: 1.4;">
                    <tr>
                        <td style="width: 25%; color: #92400e; padding: 2px 0; vertical-align: top;">Phát triển thể chất:</td>
                        <td style="width: 75%; font-weight: 600; color: #1e293b; padding: 2px 0;">${r.summary.physicalDev || 'Bình thường'}</td>
                    </tr>
                    <tr>
                        <td style="color: #92400e; padding: 2px 0; vertical-align: top;">Tâm thần vận động:</td>
                        <td style="font-weight: 600; color: #1e293b; padding: 2px 0;">${r.summary.mentalDev || 'Bình thường'}</td>
                    </tr>
                    <tr>
                        <td style="color: #92400e; padding: 2px 0; vertical-align: top;">Sức khỏe chung:</td>
                        <td style="font-weight: 600; color: #1e293b; padding: 2px 0;">${r.summary.healthStatus || 'Đủ sức khỏe học tập'}</td>
                    </tr>
                    <tr>
                        <td style="color: #b91c1c; padding: 2px 0; vertical-align: top; font-weight: bold;">Bệnh lý lưu ý:</td>
                        <td style="color: #b91c1c; padding: 2px 0; font-weight: bold;">${r.summary.notes || 'Không phát hiện bất thường'}</td>
                    </tr>
                    <tr>
                        <td style="color: #92400e; padding: 2px 0; vertical-align: top;">Yêu cầu theo dõi:</td>
                        <td style="font-style: italic; color: #1e293b; padding: 2px 0;">${r.summary.advice || 'Tự theo dõi sức khỏe tại phòng y tế học đường'}</td>
                    </tr>
                </table>
            </div>

            <!-- PHẦN CHÂN TRANG (FOOTER) -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1.5px solid #cbd5e1; padding-top: 6px; margin-top: 8px;">
                <div style="font-size: 7pt; color: #64748b; font-style: italic; line-height: 1.35; width: 72%;">
                    Dữ liệu được trích xuất tự động từ Hệ thống Y tế số
                </div>
                <div style="display: flex; align-items: center; gap: 6px; width: 28%; justify-content: flex-end;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=https://yteso-thptvothisaubrvt.netlify.app/" alt="QR" style="width: 32px; height: 32px;">
                </div>
            </div>

        </div>
    `;

    // Khởi tạo Iframe in cô lập
    const iframeId = 'silent-print-iframe';
    let iframe = document.getElementById(iframeId);
    if (iframe) {
        document.body.removeChild(iframe);
    }

    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>In Phiếu Sức Khỏe - THPT Võ Thị Sáu</title>
            <style>
                @page {
                    size: A5 portrait;
                    margin: 5mm 10mm 7mm 10mm;
                }
                body {
                    margin: 0;
                    padding: 0;
                    background: white;
                    color: #1e293b;
                }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    }, 1500);
}
// HÀM DRILL-DOWN: HIỂN THỊ DANH SÁCH CHI TIẾT THEO TỪNG DANH MỤC THỐNG KÊ
function showDrilldownStudents(type, categoryName) {
    const titleElem = document.getElementById('drilldown-modal-title');
    const tbodyElem = document.getElementById('drilldown-students-tbody');
    if (!titleElem || !tbodyElem) return;

    titleElem.innerText = categoryName;
    tbodyElem.innerHTML = '';

    // Tiến hành lọc dữ liệu từ cache theo tham số truyền vào
    const filtered = currentStatsResultsCache.filter(item => {
        let heightVal = parseFloat(item.height) / 100;
        let weightVal = parseFloat(item.weight);
        let bmi = (heightVal > 0 && weightVal > 0) ? (weightVal / (heightVal * heightVal)) : null;

        switch (type) {
            case 'bmi_underweight':
                return bmi !== null && bmi < 18.5;
            case 'bmi_normal':
                return bmi !== null && bmi >= 18.5 && bmi < 25.0;
            case 'bmi_overweight':
                return bmi !== null && bmi >= 25.0 && bmi < 30.0;
            case 'bmi_obese':
                return bmi !== null && bmi >= 30.0;
            case 'eyes':
                return item.eyes && item.eyes !== 'Bình thường';
            case 'dental':
                return item.dental && item.dental !== 'Bình thường';
            case 'ent':
                return item.ent && item.ent !== 'Bình thường';
            case 'surgery':
                return item.surgery && item.surgery !== 'Bình thường';
            case 'mental':
                return item.mentalHealth && item.mentalHealth !== 'Bình thường';
            default:
                return false;
        }
    });

    if (filtered.length === 0) {
        tbodyElem.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 20px;">Không có học sinh nào thuộc nhóm này.</td></tr>';
    } else {
        filtered.forEach(item => {
            let detail = '--';
            if (type.startsWith('bmi')) {
                let h = parseFloat(item.height) / 100;
                let w = parseFloat(item.weight);
                let bmi = w / (h * h);
                detail = `Nặng: ${item.weight}kg, Cao: ${item.height}cm (BMI: ${bmi.toFixed(1)})`;
            } else if (type === 'eyes') {
                detail = item.eyes;
            } else if (type === 'dental') {
                detail = item.dental;
            } else if (type === 'ent') {
                detail = item.ent;
            } else if (type === 'surgery') {
                detail = item.surgery;
            } else if (type === 'mental') {
                detail = item.mentalHealth;
            }

            tbodyElem.innerHTML += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 12px; font-weight: 600; color: #1e293b;">${item.name}</td>
                    <td style="padding: 12px;"><span class="badge" style="background:#eff6ff; color:#2563eb; padding: 4px 8px; border-radius: 6px; font-weight:bold; font-size:0.8rem;">${item.class}</span></td>
                    <td style="padding: 12px; color: #b91c1c; font-size: 0.9rem; font-weight: 500;">${detail}</td>
                </tr>`;
        });
    }

    document.getElementById('exam-stats-drilldown-modal').style.display = 'flex';
}