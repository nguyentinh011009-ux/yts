/* PHYSICAL HEALTH EXAMINATION ENGINE - VTS HEALTH ADMIN
   Author: Nguyễn Tính*/

let examCampaignsCache = [];
let activeCampaignId = null;
let examStudentCache = null;

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
// 1. TẢI DANH SÁCH ĐỢT KHÁM LÊN SELECT
function loadExamCampaigns() {
    db.collection('yt_exam_campaigns').orderBy('createdAt', 'desc').onSnapshot(snap => {
        examCampaignsCache = [];
        const select = document.getElementById('exam-campaign-select');
        if (!select) return;

        select.innerHTML = '<option value="">-- Chọn đợt khám --</option>';
        snap.forEach(doc => {
            const d = doc.data();
            examCampaignsCache.push({ id: doc.id, ...d });
            select.innerHTML += `<option value="${doc.id}">${d.name}</option>`;
        });

        // Nếu đã có đợt khám đang chọn trước đó, giữ lại lựa chọn
        if (activeCampaignId) select.value = activeCampaignId;
    });
}

// --- BỘ ĐIỀU KHIỂN ĐÓNG/MỞ POPUP KHỞI TẠO ĐỢT KHÁM ---
function openCreateCampaignModal() {
    document.getElementById('exam-new-name').value = '';
    document.getElementById('exam-new-id').value = '';
    document.getElementById('exam-new-method').value = 'manual';
    document.getElementById('create-campaign-modal').style.display = 'flex';
}

function closeCreateCampaignModal() {
    document.getElementById('create-campaign-modal').style.display = 'none';
}

// NÂNG CẤP: Hàm khởi tạo đợt khám mới từ Popup (Tự động kích hoạt luồng nhập liệu tương ứng)
async function createNewExamCampaign() {
    const name = document.getElementById('exam-new-name').value.trim();
    let cid = document.getElementById('exam-new-id').value.trim();
    const selectedMethod = document.getElementById('exam-new-method').value;

    if (!name) return alert("Vui lòng nhập Tên đợt khám sức khỏe!");
    if (!cid) cid = "KHAM_" + Date.now().toString().slice(-6);

    // Cập nhật lại phần cuối (khối try/catch) của hàm createNewExamCampaign():
    try {
        // Ghi dữ liệu đợt khám mới lên Cloud Firestore
        await db.collection('yt_exam_campaigns').doc(cid).set({
            name: name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        closeCreateCampaignModal();
        selectExamCampaign(cid);
        switchExamInputMethod(selectedMethod);

        // 👉 ĐÃ SỬA: Bọc kiểm tra phòng vệ chống sập trang nếu chưa nạp file system.js
        if (typeof writeAuditLog === 'function') {
            writeAuditLog("CREATE_EXAM", "yt_exam_campaigns", cid, `Khởi tạo đợt khám sức khỏe mới: ${name}.`);
        }

        alert(`🎉 Đã khởi tạo thành công đợt khám mới!\nHệ thống tự động chuyển sang phân hệ: ${selectedMethod === 'manual' ? 'Nhập thủ công' : 'Nhập file Excel'}.`);

    } catch (e) {
        // 👉 ĐÃ SỬA: Xuất mã lỗi chi tiết của Firebase phục vụ rà soát bảo mật Rules
        console.error("❌ LỖI FIRESTORE (Tạo đợt khám):", e);
        alert(`❌ LỖI KẾT NỐI DATABASE (Mã lỗi: ${e.code || 'UNKNOWN_ERROR'}):\n\nChi tiết: ${e.message}`);
    }
}
// Chọn đợt khám hoạt động
function selectExamCampaign(cid) {
    activeCampaignId = cid;
    const statusBox = document.getElementById('selected-campaign-status');
    const activeLabel = document.getElementById('active-campaign-name');
    const stepEntry = document.getElementById('step-exam-entry');

    if (cid) {
        const campaign = examCampaignsCache.find(c => c.id === cid);
        activeLabel.innerText = campaign ? campaign.name : cid;
        statusBox.style.display = 'block';
        stepEntry.style.display = 'block';
    } else {
        statusBox.style.display = 'none';
        stepEntry.style.display = 'none';
    }
}

// Chuyển phương pháp nhập liệu
function switchExamInputMethod(method) {
    document.getElementById('exam-input-manual').style.display = method === 'manual' ? 'block' : 'none';
    document.getElementById('exam-input-excel').style.display = method === 'excel' ? 'block' : 'none';
    document.getElementById('btn-exam-manual').className = method === 'manual' ? 'top-tab-btn active' : 'top-tab-btn';
    document.getElementById('btn-exam-excel').className = method === 'excel' ? 'top-tab-btn active' : 'top-tab-btn';
}

// 3. TÌM KIẾM HỌC SINH NHẬP THỦ CÔNG
async function searchStudentForExam(val) {
    const box = document.getElementById('exam-student-suggest');
    if (val.trim().length < 2) { box.style.display = 'none'; return; }

    if (!examStudentCache) {
        const snap = await db.collection('yt_students').get();
        examStudentCache = [];
        snap.forEach(doc => examStudentCache.push({ id: doc.id, ...doc.data() }));
    }

    const keyword = removeVietnameseTones(val.trim());
    const matched = examStudentCache.filter(st => {
        const str = `${st.name_search} ${st.class.toLowerCase()} ${st.id.toLowerCase()}`;
        return str.includes(keyword);
    }).slice(0, 10);

    box.innerHTML = '';
    if (matched.length === 0) {
        box.innerHTML = '<div style="padding:10px; color:red;">Không tìm thấy học sinh!</div>';
    } else {
        matched.forEach(st => {
            const item = document.createElement('div');
            item.className = 'suggest-item';
            item.style.padding = '10px';
            item.innerHTML = `<strong>${st.name}</strong> - Lớp: <span style="color:#0062ff; font-weight:bold;">${st.class}</span>`;
            item.onclick = () => {
                document.getElementById('exam-student-search').value = st.name;
                document.getElementById('exam-student-class').value = st.class;
                document.getElementById('exam-selected-sid').value = st.id;
                box.style.display = 'none';
                
                // Điền mốc thể lực cũ dự phòng
                if(st.height) document.getElementById('ex-height').value = st.height;
                if(st.weight) document.getElementById('ex-weight').value = st.weight;
            };
            box.appendChild(item);
        });
    }
    box.style.display = 'block';
}

// 4. LƯU PHIẾU KHÁM THỦ CÔNG
async function saveManualPhysicalExam() {
    const sid = document.getElementById('exam-selected-sid').value;
    const name = document.getElementById('exam-student-search').value.trim();
    const className = document.getElementById('exam-student-class').value;

    if (!activeCampaignId) return alert("Vui lòng chọn đợt khám ở Bước 1!");
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
        
        // 1. Ghi tệp kết quả khám định kỳ
        const recordId = `${activeCampaignId}_${sid}`;
        batch.set(db.collection('yt_exam_results').doc(recordId), payload);

        // 2. Tự động ghi đè/Cập nhật Thể lực vào Hồ sơ học sinh gốc
        if (height || weight) {
            let updateObj = {};
            if (height) updateObj.height = height;
            if (weight) updateObj.weight = weight;
            batch.update(db.collection('yt_students').doc(sid), updateObj);
        }

        await batch.commit();
        alert("✅ Đã lưu phiếu khám và cập nhật thể trạng học sinh gốc thành công!");
        resetManualExamForm();
        examStudentCache = null; // Reset cache học sinh
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

// 5. THUẬT TOÁN ĐỌC & ĐỐI CHIẾU FILE EXCEL KHÁM SỨC KHỎE 45 CỘT SỞ GD&ĐT

async function handleExcelExamUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!activeCampaignId) { event.target.value = ''; return alert("Vui lòng chọn đợt khám ở Bước 1 trước!"); }

    event.target.value = ''; // Reset input

    const btn = document.querySelector('button[onclick="document.getElementById(\'excel-exam-upload\').click()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang phân tích dữ liệu...';
    btn.disabled = true;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array', cellDates: true});
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

            if (rawJson.length < 2) throw new Error("File Excel không có dữ liệu!");

            // 1. Tải danh sách học sinh hiện có để đối chiếu kép (Họ tên, Lớp, Ngày sinh)
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải CSDL để đối chiếu...';
            const studentsSnap = await db.collection('yt_students').get();
            let dbStudentsMap = new Map();
            studentsSnap.forEach(doc => {
                const s = doc.data();
                if (s.name && s.class) {
                    const dobFormat = s.dob ? s.dob.trim() : '';
                    const key = `${s.name.trim().toLowerCase()}_${s.class.trim().toLowerCase()}_${dobFormat}`;
                    dbStudentsMap.set(key, { id: doc.id, ...s });
                }
            });

            // 2. Hàm hỗ trợ tìm kiếm dấu x lựa chọn
            const getChoiceFromColumns = (row, startCol, optionsArray) => {
                for (let i = 0; i < optionsArray.length; i++) {
                    const cellVal = String(row[startCol + i] || "").trim().toLowerCase();
                    if (cellVal === "x") return optionsArray[i];
                }
                return optionsArray[0]; // Mặc định trả về lựa chọn đầu tiên (Bình thường)
            };

            // Hàm xử lý ngày tháng excel chuẩn xác
            const formatExDate = (cellVal) => {
                if(!cellVal) return "";
                if(cellVal instanceof Date) return cellVal.toISOString().split('T')[0];
                return formatDateString(cellVal);
            };

            let batches = [];
            let currentBatch = db.batch();
            let opCount = 0;

            let successCount = 0;
            let skippedCount = 0;

            // Bắt đầu duyệt dữ liệu từ dòng số 2 (Row index 1)
            for (let r = 1; r < rawJson.length; r++) {
                const row = rawJson[r];
                if (row.length < 5) continue; 

                const name = String(row[1] || "").trim(); // Cột 2 (Họ tên)
                const facility = String(row[2] || "").trim(); // Cột 3 (Cơ sở khám)
                const className = String(row[3] || "").trim().toUpperCase(); // Cột 4 (Lớp)
                const dob = formatExDate(row[4]); // Cột 5 (Ngày sinh)

                if (name && className) {
                    const matchKey = `${name.toLowerCase()}_${className.toLowerCase()}_${dob}`;
                    
                    // Đối chiếu kép chuẩn xác: Họ tên, Lớp và Ngày sinh
                    if (dbStudentsMap.has(matchKey)) {
                        const student = dbStudentsMap.get(matchKey);
                        
                        // 👉 ĐÃ SỬA: Khớp đúng Cột 8 (Index 7) là Cân nặng, Cột 9 (Index 8) là Chiều cao
                        const weight = String(row[7] || "").trim();
                        const height = String(row[8] || "").trim();

                        // 👉 ĐÃ SỬA: Bỏ qua cột 10 (BMI), dịch chuyển Ngày khám sang Cột 11 (Index 10) và Ngày lập phiếu sang Cột 12 (Index 11)
                        const examDate = formatExDate(row[10]); 
                        const reportDate = formatExDate(row[11]); 

                        // 👉 ĐÃ SỬA: Tọa độ dịch chuyển các phân khoa chuẩn xác
                        const mental = getChoiceFromColumns(row, 12, [
                            "Bình thường", "Nghi ngờ chậm phát triển", 
                            "Nghi ngờ rối loạn giảm chú ý - tăng động", 
                            "Nghi ngờ rối loạn phổ tự kỷ", "Nghi ngờ lo âu", 
                            "Nghi ngờ trầm cảm", "Khác"
                        ]); // Cột 13-19 (Index 12-18)

                        const internal = getChoiceFromColumns(row, 19, ["Bình thường", "Có phát hiện bất thường"]); // Cột 20-21 (Index 19-20)
                        const ent = getChoiceFromColumns(row, 21, ["Bình thường", "Có bất thường về thính lực", "Có bệnh về tai mũi họng"]); // Cột 22-24 (Index 21-23)
                        const surgery = getChoiceFromColumns(row, 24, ["Bình thường", "Có còng cột sống", "Có vẹo cột sống", "Có bệnh về xương khớp", "Có bất thường về cơ quan sinh dục ngoài"]); // Cột 25-29 (Index 24-28)
                        
                        // 👉 THÊM MỚI: Phân tích phân khoa Mắt (4 cột từ index 29 đến 32)
                        const eyes = getChoiceFromColumns(row, 29, ["Bình thường", "Có bất thường về phản xạ", "Có tật khúc xạ", "Có bệnh về mắt"]); // Cột 30-33 (Index 29-32)
                        
                        const dental = getChoiceFromColumns(row, 33, [
                            "Bình thường", "Có sâu răng", "Có mất răng", "Có viêm nướu", 
                            "Có viêm nha chu", "Có thiểu sản men răng", "Có răng nhiễm Fluor", 
                            "Có bệnh về niêm mạc miệng", "Có dị tật bẩm sinh về dính thắng lưỡi", 
                            "Có dị tật bẩm sinh về khe hở môi", "Có dị tật bẩm sinh về khe hở vòm miệng", 
                            "Có bệnh về răng hàm mặt khác"
                        ]); // Cột 34-45 (Index 33-44)

                        // 👉 ĐÃ SỬA: Tọa độ Tổng kết (Index 45 đến 49)
                        const summary = {
                            physicalDev: String(row[45] || "").trim(),
                            mentalDev: String(row[46] || "").trim(),
                            healthStatus: String(row[47] || "").trim(),
                            notes: String(row[48] || "").trim(),
                            advice: String(row[49] || "").trim()
                        };

                        const recordId = `${activeCampaignId}_${student.id}`;
                        const refResult = db.collection('yt_exam_results').doc(recordId);

                        // Lệnh 1: Lưu phiếu khám sức khỏe định kỳ
                        currentBatch.set(refResult, {
                            campaignId: activeCampaignId, studentId: student.id, name, class: className, dob,
                            facility, height, weight, examDate, reportDate, mentalHealth: mental,
                            internalMedicine: internal, ent, surgery, eyes, dental, summary
                        });
                        opCount++;

                        // Lệnh 2: Ghi đè/Cập nhật Thể lực gốc của học sinh
                        if (height || weight) {
                            const refStudent = db.collection('yt_students').doc(student.id);
                            let updatePayload = {};
                            if (height) updatePayload.height = height;
                            if (weight) updatePayload.weight = weight;
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

            if (successCount === 0) {
                btn.innerHTML = originalText; btn.disabled = false;
                return alert("ℹ️ Kết quả: Không có học sinh nào trong tệp khớp với CSDL hiện hành của trường (Họ tên, Lớp, Ngày sinh). Không có dữ liệu nào được nhập.");
            }

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang nạp lên đám mây...';
            for (let b of batches) {
                await b.commit();
            }

            btn.innerHTML = originalText; btn.disabled = false;
            alert(`✅ Nhập tệp Excel Khám sức khỏe thành công!\n- Nạp phiếu mới và cập nhật thể trạng: ${successCount} học sinh.\n- Bỏ qua (Do không khớp hồ sơ gốc): ${skippedCount} học sinh.`);
            examStudentCache = null; // Clear cache
        } catch (error) {
            btn.innerHTML = originalText; btn.disabled = false;
            alert("Lỗi khi đọc file Excel khám: " + error.message);
            console.error(error);
        }
    };
    reader.readAsArrayBuffer(file);
}
// 6. TẢI FILE EXCEL KHÁM MẪU CHUẨN SỞ GD&ĐT
// assets/js/modules/admin/suckhoe.js

// assets/js/modules/admin/suckhoe.js

function downloadExcelTemplateExam() {
    // 👉 HÀNG TIÊU ĐỀ 1 (Gộp cột chính)
    const row1 = [
        "STT", "Họ tên", "Cơ sở KTSK", "Lớp", "Ngày sinh", "Giới tính", "", "Thể lực", "", "", "Ngày khám", "Ngày lập phiếu",
        "Sức khỏe tâm thần", "", "", "", "", "", "",
        "Nội khoa", "",
        "Tai mũi họng", "", "",
        "Ngoại khoa", "", "", "", "",
        "Mắt", "", "", "",
        "Răng hàm mặt", "", "", "", "", "", "", "", "", "", "", "",
        "Tổng kết", "", "", "", ""
    ];

    // 👉 HÀNG TIÊU ĐỀ 2 (Các lựa chọn con bên dưới)
    const row2 = [
        "", "", "", "", "", "Nam", "Nữ", "Cân nặng (kg)", "Chiều cao (cm)", "BMI (kg/m2)", "", "",
        "Bình thường", "Nghi ngờ chậm phát triển", "Nghi ngờ rối loạn giảm chú ý - tăng động", "Nghi ngờ rối loạn phổ tự kỷ", "Nghi ngờ lo âu", "Nghi ngờ trầm cảm", "Khác",
        "Bình thường", "Có phát hiện bất thường",
        "Bình thường", "Có bất thường về thính lực", "Có bệnh về tai mũi họng",
        "Bình thường", "Có còng cột sống", "Có vẹo cột sống", "Có bệnh về xương khớp", "Có bất thường về cơ quan sinh dục ngoài",
        "Bình thường", "Có bất thường về phản xạ", "Có tật khúc xạ", "Có bệnh về mắt",
        "Bình thường", "Có sâu răng", "Có mất răng", "Có viêm nướu", "Có viêm nha chu", "Có thiểu sản men răng", "Có răng nhiễm Fluor", "Có bệnh về niêm mạc miệng", "Có dị tật bẩm sinh về dính thắng lưỡi", "Có dị tật bẩm sinh về khe hở môi", "Có dị tật bẩm sinh về khe hở vòm miệng", "Có bệnh về răng hàm mặt khác",
        "Phát triển thể chất", "Phát triển tâm thần/vận động", "Tình trạng sức khỏe", "Bệnh, tật cần lưu ý", "Đề nghị"
    ];

    // 👉 DÒNG DỮ LIỆU MẪU (Định dạng ngày tháng đã chuyển sang DD/MM/YYYY chuẩn chỉ)
    const sampleData = [
        1, "Bùi Dương Quốc", "Trung tâm Y tế khu vực Long Đất", "10A1", "16/11/2009", "x", "",
        "41", "164", "15.24", "08/10/2025", "08/10/2025",
        "x", "", "", "", "", "", "",
        "", "x",
        "", "x", "",
        "", "", "x", "", "",
        "", "", "x", "",
        "", "", "x", "", "", "", "", "", "", "", "", "",
        "SDD thể gầy còm", "Bình thường", "Đủ sức khỏe", "Sâu răng", "Không"
    ];

    const data = [row1, row2, sampleData];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // 👉 THIẾT LẬP CẤU HÌNH GỘP Ô (MERGES ARRAY - Chạy chỉ số từ 0)
    ws['!merges'] = [
        // Gộp hàng dọc cho các cột độc lập (Dòng 1 gộp xuống Dòng 2)
        { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // STT (Cột A)
        { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // Họ tên (Cột B)
        { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // Cơ sở KTSK (Cột C)
        { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } }, // Lớp (Cột D)
        { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } }, // Ngày sinh (Cột E)
        { s: { r: 0, c: 10 }, e: { r: 1, c: 10 } }, // Ngày khám (Cột K)
        { s: { r: 0, c: 11 }, e: { r: 1, c: 11 } }, // Ngày lập phiếu (Cột L)

        // Gộp hàng ngang cho các nhóm phân khoa
        { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } },   // Giới tính (Nam, Nữ)
        { s: { r: 0, c: 7 }, e: { r: 0, c: 9 } },   // Thể lực (Cân nặng, Chiều cao, BMI)
        { s: { r: 0, c: 12 }, e: { r: 0, c: 18 } }, // Sức khỏe tâm thần (7 lựa chọn)
        { s: { r: 0, c: 19 }, e: { r: 0, c: 20 } }, // Nội khoa (2 lựa chọn)
        { s: { r: 0, c: 21 }, e: { r: 0, c: 23 } }, // Tai mũi họng (3 lựa chọn)
        { s: { r: 0, c: 24 }, e: { r: 0, c: 28 } }, // Ngoại khoa (5 lựa chọn)
        { s: { r: 0, c: 29 }, e: { r: 0, c: 32 } }, // Mắt (4 lựa chọn)
        { s: { r: 0, c: 33 }, e: { r: 0, c: 44 } }, // Răng hàm mặt (12 lựa chọn)
        { s: { r: 0, c: 45 }, e: { r: 0, c: 49 } }  // Tổng kết (5 cột)
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mau_Kham_Suc_Khoe_SoGD");
    XLSX.writeFile(wb, "Mau_File_Kham_Suc_Khoe.xlsx");
}