        let currentUserEmail = null;
        let currentStudent = null;
	let allNotificationsCache = [];
// Hàm bổ trợ phân tích ngày tháng an toàn, chống crash Invalid Date trên iOS/Safari
function safeParseDate(dateStr) {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;
    
    let parts = String(dateStr).split(/[\/\-]/);
    if (parts.length === 3) {
        // Hỗ trợ định dạng chuẩn YYYY-MM-DD
        if (parts[0].length === 4) {
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } 
        // Hỗ trợ định dạng Việt Nam DD/MM/YYYY
        else if (parts[2].length === 4) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
    }
    let parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
}

        // --- HỆ THỐNG TAB MƯỢT MÀ ---
        function switchStTab(tabId, btn) {
            document.querySelectorAll('.st-tab-pane').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.st-tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            btn.classList.add('active');
        }

        // --- XÁC THỰC ---
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                currentUserEmail = user.email;
                document.getElementById('auth-section').style.display = 'none';
                checkLinkedAccount(user.email);
            } else {
                document.getElementById('auth-section').style.display = 'block';
                document.getElementById('link-section').style.display = 'none';
                document.getElementById('dashboard-section').style.display = 'none';
            }
        });

function loginStudentGoogle() {
            // Chặn Zalo/Facebook
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            if (userAgent.indexOf("Zalo") > -1 || userAgent.indexOf("FBAN") > -1 || userAgent.indexOf("FBAV") > -1) {
                alert("⚠️ HỆ THỐNG CẢNH BÁO:\nBạn đang mở web bằng Zalo/Facebook.\nVui lòng bấm vào dấu 3 chấm góc phải, chọn 'Mở bằng trình duyệt' (Chrome/Safari) để đăng nhập!");
                return;
            }

            const btn = document.querySelector('#auth-section button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xác thực...';
            btn.disabled = true;

            const provider = new firebase.auth.GoogleAuthProvider();

            firebase.auth().signInWithPopup(provider)
                .then((result) => {
                    // 👉 ÉP BUỘC CHẠY NGAY LẬP TỨC TRÊN iOS (Không đợi onAuthStateChanged)
                    const user = result.user;
                    currentUserEmail = user.email;
                    
                    document.getElementById('auth-section').style.display = 'none';
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    
                    // Gọi hàm kiểm tra hồ sơ ngay lập tức
                    checkLinkedAccount(user.email);
                })
                .catch(err => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    
                    if (err.code !== 'auth/popup-closed-by-user') {
                        if (err.code === 'auth/unauthorized-domain') {
                            alert("❌ Tên miền/IP này chưa được cấp quyền trong Firebase! Vui lòng thêm vào Authorized Domains.");
                        } else {
                            alert("Lỗi đăng nhập: " + err.message);
                        }
                    }
                });
        }        function logoutStudent() { firebase.auth().signOut(); }

        // --- LIÊN KẾT & TẢI DATA ---
async function checkLinkedAccount(email) {
    try {
        const snap = await db.collection('yt_students').where('linkedEmail', '==', email).get();
        if (snap.empty) {
            document.getElementById('link-section').style.display = 'block';
            document.getElementById('dashboard-section').style.display = 'none';
        } else {
            document.getElementById('link-section').style.display = 'none';
            document.getElementById('dashboard-section').style.display = 'block';
            currentStudent = { id: snap.docs[0].id, ...snap.docs[0].data() };
            
            // Tránh gián đoạn tiến trình nếu khóa giải mã gặp lỗi
            try {
                await loadMasterCryptoKey();
            } catch (e) {
                console.warn("Không thể tải khóa giải mã:", e);
            }
            
            // Gọi tuần tự từng tác vụ khởi tạo độc lập
            try { renderTabInfo(); } catch(e) { console.error("Lỗi renderTabInfo:", e); }
            try { loadHistory(); } catch(e) { console.error("Lỗi loadHistory:", e); }
            try { loadTickets(); } catch(e) { console.error("Lỗi loadTickets:", e); }
            try { loadAttendance(); } catch(e) { console.error("Lỗi loadAttendance:", e); }
            try { listenToNotifications(); } catch(e) { console.error("Lỗi listenToNotifications:", e); }
            try { loadSchoolHealthStats(); } catch(e) { console.error("Lỗi loadSchoolHealthStats:", e); }
        }
    } catch (err) {
        console.error("Lỗi kiểm tra liên kết tài khoản:", err);
        alert("Lỗi kết nối cơ sở dữ liệu: " + err.message);
    }
}
        // --- RENDER TAB 1: THÔNG TIN & ĐỒ HỌA BMI ---
function renderTabInfo() {
            const studentName = currentStudent.name || "";
		document.getElementById('header-name').innerText = studentName ? studentName.split(' ').pop() : '--';
		document.getElementById('st-name').innerText = studentName || '--';
            document.getElementById('st-name').innerText = currentStudent.name;
            document.getElementById('st-class').innerText = currentStudent.class;
            document.getElementById('st-id').innerText = currentStudent.id;
            
            // Xử lý BMI
            const h = parseFloat(currentStudent.height); const w = parseFloat(currentStudent.weight);
            document.getElementById('st-height').innerText = h || '--';
            document.getElementById('st-weight').innerText = w || '--';

            if (h && w) {
                const bmi = (w / Math.pow(h/100, 2)).toFixed(1);
                document.getElementById('st-bmi').innerText = bmi;
                let status, color, percent;
                percent = ((bmi - 15) / (35 - 15)) * 100;
                if (percent < 0) percent = 0; if (percent > 100) percent = 100;

                if (bmi < 18.5) { status = "Thiếu cân"; color = "#38bdf8"; }
                else if (bmi < 24.9) { status = "Bình thường"; color = "#4ade80"; }
                else if (bmi < 29.9) { status = "Thừa cân"; color = "#facc15"; }
                else { status = "Béo phì"; color = "#ef4444"; }
                
                document.getElementById('st-bmi-status').innerText = status;
                document.getElementById('st-bmi-status').style.color = color;
                setTimeout(() => { document.getElementById('bmi-pointer').style.left = `calc(${percent}% - 3px)`; }, 500);
            } else {
                document.getElementById('st-bmi-status').innerText = "Chưa đo đủ chỉ số";
            }

            // CHÈN THÊM HTML THÔNG TIN HÀNH CHÍNH VÀO DƯỚI THANH BMI
            const tabInfo = document.getElementById('tab-info');
            // Xóa thẻ thông tin cũ nếu lỡ click load lại
            const oldAdminCard = document.getElementById('st-admin-info-card');
            if(oldAdminCard) oldAdminCard.remove();

            const dobFormat = currentStudent.dob ? safeParseDate(currentStudent.dob).toLocaleDateString('vi-VN') : 'Chưa cập nhật';
            const fullAddress = currentStudent.street ? `${currentStudent.street}, ${currentStudent.ward}, ${currentStudent.city}` : 'Chưa cập nhật';

            const adminInfoHTML = `
                <div id="st-admin-info-card" class="st-card" style="margin-top: 25px;">
                    <h3 style="margin: 0 0 20px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;"><i class="fas fa-address-book" style="color: var(--st-primary);"></i> Thông tin cá nhân & Hành chính</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 0.95rem; color: #334155;">
			<div style="background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
                            <div style="color: #64748b; font-size: 0.8rem; margin-bottom: 3px;">Mã Học Sinh</div>
                            <div style="font-weight: 500; color: #4f46e5;">
                                <i class="fas fa-id-badge" style="width:20px;"></i> 
                                ${currentStudent.studentCode || '<span style="color:#94a3b8; font-size:0.85rem;">Chưa cập nhật</span>'}
                            </div>
			</div>
                        <div style="background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
                            <div style="color: #64748b; font-size: 0.8rem; margin-bottom: 3px;">Ngày sinh</div>
                            <div style="font-weight: 500;"><i class="fas fa-birthday-cake" style="color:#f59e0b; width:20px;"></i> ${dobFormat}</div>
                        </div>
                        <div style="background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
                            <div style="color: #64748b; font-size: 0.8rem; margin-bottom: 3px;">Giới tính</div>
                            <div style="font-weight: 500;"><i class="fas fa-venus-mars" style="color:#8b5cf6; width:20px;"></i> ${currentStudent.gender || 'Chưa cập nhật'}</div>
                        </div>
                        <div style="background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
                            <div style="color: #64748b; font-size: 0.8rem; margin-bottom: 3px;">SĐT Học sinh</div>
                            <div style="font-weight: 500;"><i class="fas fa-mobile-alt" style="color:#0ea5e9; width:20px;"></i> ${decryptField(currentStudent.phone) || 'Chưa cập nhật'}</div>
                        </div>
                        <div style="background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
                            <div style="color: #64748b; font-size: 0.8rem; margin-bottom: 3px;">SĐT Phụ huynh</div>
                            <div style="font-weight: 500;"><i class="fas fa-phone-alt" style="color:#10b981; width:20px;"></i> ${decryptField(currentStudent.parentPhone) || 'Chưa cập nhật'}</div>
                        </div>
                        <div style="grid-column: span 2; background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
                            <div style="color: #64748b; font-size: 0.8rem; margin-bottom: 3px;">Địa chỉ thường trú</div>
                            <div style="font-weight: 500;"><i class="fas fa-map-marker-alt" style="color:#ef4444; width:20px;"></i> ${currentStudent.street ? `${decryptField(currentStudent.street)}, ${currentStudent.ward}, ${currentStudent.city}` : 'Chưa cập nhật'}</div>
                        </div>
                    </div>
                </div>
            `;
            tabInfo.insertAdjacentHTML('beforeend', adminInfoHTML);
        }
        // --- RENDER TAB 2: TIMELINE LỊCH SỬ ---
// --- RENDER TAB 2: TIMELINE LỊCH SỬ TIẾP NHẬN & KHÁM SỨC KHỎE ĐỊNH KỲ (MỚI NÂNG CẤP) ---
// --- RENDER TAB 2: TIMELINE LỊCH SỬ TIẾP NHẬN & KHÁM SỨC KHỎE ĐỊNH KỲ (ĐÃ SỬA LỖI SAFARI) ---
async function loadHistory() {
    const div = document.getElementById('st-history-list');
    div.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;"><i class="fas fa-spinner fa-spin fa-2x" style="margin-bottom:10px;"></i><br>Đang tải dòng thời gian sức khỏe...</div>';

    try {
        const visitsSnap = await db.collection('yt_visits').where('studentId', '==', currentStudent.id).get();
        const examsSnap = await db.collection('yt_exam_results').where('studentId', '==', currentStudent.id).get();
        
        const campaignsSnap = await db.collection('yt_exam_campaigns').get();
        let campaignsMap = {};
        campaignsSnap.forEach(doc => {
            campaignsMap[doc.id] = doc.data().name;
        });

        let timelineItems = [];

        // Nạp lịch sử tiếp nhận
        visitsSnap.forEach(doc => {
            const data = doc.data();
            timelineItems.push({
                type: 'visit',
                date: data.timestamp ? new Date(data.timestamp.seconds * 1000) : new Date(),
                timestamp: data.timestamp?.seconds || 0,
                ...data
            });
        });

        // Nạp lịch sử khám định kỳ sử dụng safeParseDate chống lỗi iOS
        examsSnap.forEach(doc => {
            const data = doc.data();
            let examDateObj = safeParseDate(data.examDate);
            timelineItems.push({
                id: doc.id,
                type: 'exam',
                date: examDateObj,
                timestamp: examDateObj.getTime() / 1000,
                campaignName: campaignsMap[data.campaignId] || data.campaignId || "Khám sức khỏe học sinh",
                ...data
            });
        });

        if (timelineItems.length === 0) {
            div.style.borderLeft = "none";
            return div.innerHTML = `
                <div style="text-align:center; color:#94a3b8; padding:30px;">
                    <i class="fas fa-file-medical fa-3x" style="margin-bottom:15px; opacity:0.5;"></i><br>
                    Hồ sơ sức khỏe trống! Bạn chưa có dữ liệu lịch sử nào trên hệ thống.
                </div>`;
        }

        // Sắp xếp thời gian giảm dần
        timelineItems.sort((a, b) => b.timestamp - a.timestamp);

        let html = '';
        timelineItems.forEach(item => {
            const formattedDate = item.date.toLocaleString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            if (item.type === 'visit') {
                html += `
                    <div class="timeline-item">
                        <div class="timeline-icon" style="background:#eff6ff; color:#2563eb;"><i class="fas fa-stethoscope"></i></div>
                        <div class="timeline-content" style="border: 1px solid #e2e8f0; background: white; padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                            <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 8px; font-weight: bold; text-transform: uppercase;">${formattedDate} - Tiếp nhận y tế</div>
                            <div style="margin-bottom: 5px;"><strong style="color: #334155;">Triệu chứng:</strong> ${item.symptom}</div>
                            <div style="margin-bottom: 5px;"><strong style="color: #10b981;">Xử lý:</strong> <span style="background: #f0fdf4; padding: 2px 8px; border-radius: 4px; color:#16a34a; font-weight:600;">${item.treatment}</span></div>
                            ${item.note ? `<div style="margin-top: 10px; font-size: 0.85rem; color: #64748b; background: #f8fafc; padding: 8px 12px; border-radius: 8px; border-left: 3px solid #cbd5e1;"><i class="fas fa-comment-medical"></i> ${item.note}</div>` : ''}
                        </div>
                    </div>`;
            } else if (item.type === 'exam') {
                const simpleDate = item.examDate ? safeParseDate(item.examDate).toLocaleDateString('vi-VN') : '--';
                html += `
                    <div class="timeline-item">
                        <div class="timeline-icon" style="background: #faf5ff; color: #8b5cf6;"><i class="fas fa-file-medical"></i></div>
                        <div class="timeline-content" style="border: 1.5px dashed #d8b4fe; background: #fdf4ff; padding: 18px; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(139, 92, 246, 0.05);">
                            <div style="font-size: 0.75rem; color: #a21caf; margin-bottom: 6px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">KHÁM SỨC KHỎE</div>
                            <h4 style="margin: 0 0 6px 0; font-size: 1.05rem; color: #1e1b4b; font-weight: bold;">${item.campaignName}</h4>
                            <div style="font-size: 0.85rem; color: #4c1d95; margin-bottom: 12px;">Ngày khám: <strong>${simpleDate}</strong></div>
                            <button onclick="openExamDetailModal('${item.id}')" class="btn-modern" style="background: white; border: 1.5px solid #d8b4fe; color: #8b5cf6; padding: 6px 12px; font-size: 0.8rem; font-weight: bold; width: auto; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; border-radius: 8px; box-shadow: 0 2px 4px rgba(139, 92, 246, 0.05);">
                                <i class="fas fa-search-plus"></i> Xem chi tiết kết quả
                            </button>
                        </div>
                    </div>`;
            }
        });
        div.innerHTML = html;
        div.style.borderLeft = "2px solid #e2e8f0";
    } catch (err) {
        console.error(err);
        div.innerHTML = `<div style="color:red; text-align:center; padding:20px;">Lỗi tải dữ liệu dòng thời gian: ${err.message}</div>`;
    }
}
// --- HÀM MỞ POPUP CHI TIẾT KHÁM SỨC KHỎE HỌC SINH ---
// --- HÀM MỞ POPUP CHI TIẾT KHÁM SỨC KHỎE HỌC SINH (ĐÃ BỌC TRY...CATCH PHÒNG VỆ) ---
async function openExamDetailModal(recordId) {
    try {
        const doc = await db.collection('yt_exam_results').doc(recordId).get();
        if (!doc.exists) return alert("Không tìm thấy kết quả khám sức khỏe!");
        const r = doc.data();

        let campName = "Khám sức khỏe học sinh";
        try {
            const campDoc = await db.collection('yt_exam_campaigns').doc(r.campaignId).get();
            if (campDoc.exists) campName = campDoc.data().name;
        } catch (e) {
            console.warn("Lỗi tải thông tin đợt khám từ máy chủ:", e);
        }

        let bmiVal = "--";
        let bmiClass = "Chưa rõ";
        if (r.height && r.weight) {
            let h = parseFloat(r.height) / 100;
            let w = parseFloat(r.weight);
            if (h > 0 && w > 0) {
                let bmi = w / (h * h);
                bmiVal = bmi.toFixed(1);
                if (bmi < 18.5) bmiClass = "Thiếu cân";
                else if (bmi < 24.9) bmiClass = "Bình thường";
                else if (bmi < 29.9) bmiClass = "Thừa cân";
                else bmiClass = "Béo phì";
            }
        }

        const div = document.getElementById('st-exam-detail-content');
        div.innerHTML = `
            <div style="border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px;">
                <span style="font-size: 0.75rem; color: #8b5cf6; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">KẾT QUẢ SỨC KHỎE</span>
                <h3 style="margin: 5px 0 0; color: #1e1b4b; font-size: 1.2rem; font-weight: 700;">${campName}</h3>
                <div style="font-size: 0.85rem; color: #64748b; margin-top: 5px;">Học sinh: <strong>${r.name}</strong> | Lớp: <strong>${r.class}</strong></div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 15px; font-size: 0.9rem;">
                <div style="background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; text-align: center;">
                    <div>
                        <div style="color: #64748b; font-size: 0.75rem; font-weight: bold; margin-bottom: 4px;">CHIỀU CAO</div>
                        <strong style="color: #1e293b; font-size: 1.1rem;">${r.height ? r.height + ' cm' : '--'}</strong>
                    </div>
                    <div>
                        <div style="color: #64748b; font-size: 0.75rem; font-weight: bold; margin-bottom: 4px;">CÂN NẶNG</div>
                        <strong style="color: #1e293b; font-size: 1.1rem;">${r.weight ? r.weight + ' kg' : '--'}</strong>
                    </div>
                    <div>
                        <div style="color: #64748b; font-size: 0.75rem; font-weight: bold; margin-bottom: 4px;">BMI KẾT LUẬN</div>
                        <strong style="color: #8b5cf6; font-size: 0.9rem;">${bmiVal} (${bmiClass})</strong>
                    </div>
                </div>

                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
                    <div style="background: #f1f5f9; padding: 8px 12px; font-weight: bold; color: #475569; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;">Kết quả chi tiết</div>
                    <div style="padding: 10px 15px; display: flex; flex-direction: column; gap: 8px; font-size: 0.9rem;">
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                            <span style="color: #64748b;">Mắt / Thị lực:</span>
                            <strong style="color: #1e293b;">${r.eyes || 'Bình thường'}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                            <span style="color: #64748b;">Răng Hàm Mắt:</span>
                            <strong style="color: #1e293b;">${r.dental || 'Bình thường'}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                            <span style="color: #64748b;">Tai Mũi Họng:</span>
                            <strong style="color: #1e293b;">${r.ent || 'Bình thường'}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                            <span style="color: #64748b;">Nội khoa:</span>
                            <strong style="color: #1e293b;">${r.internalMedicine || 'Bình thường'}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                            <span style="color: #64748b;">Ngoại khoa / Khớp:</span>
                            <strong style="color: #1e293b;">${r.surgery || 'Bình thường'}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #64748b;">Tâm lý / Tâm thần:</span>
                            <strong style="color: #1e293b;">${r.mentalHealth || 'Bình thường'}</strong>
                        </div>
                    </div>
                </div>

                <div style="background: #fffbeb; padding: 15px; border-radius: 10px; border: 1px solid #fde68a; display: flex; flex-direction: column; gap: 10px;">
    <div>
        <span style="color: #92400e; font-size: 0.75rem; font-weight: bold; display: block; text-transform: uppercase;">Phát triển thể chất:</span>
        <strong style="color: #1e293b;">${r.summary.physicalDev || 'Bình thường'}</strong>
    </div>
    <div>
        <span style="color: #92400e; font-size: 0.75rem; font-weight: bold; display: block; text-transform: uppercase;">Tâm thần vận động:</span>
        <strong style="color: #1e293b;">${r.summary.mentalDev || 'Bình thường'}</strong>
    </div>
    <div>
        <span style="color: #92400e; font-size: 0.75rem; font-weight: bold; display: block; text-transform: uppercase;">Sức khỏe chung:</span>
        <strong style="color: #1e293b;">${r.summary.healthStatus || 'Đủ sức khỏe học tập'}</strong>
    </div>
    <div>
        <span style="color: #b91c1c; font-size: 0.75rem; font-weight: bold; display: block; text-transform: uppercase;">Bệnh lý cần lưu ý:</span>
        <strong style="color: #b91c1c;">${r.summary.notes || 'Không phát hiện bất thường'}</strong>
    </div>
    <div>
        <span style="color: #92400e; font-size: 0.75rem; font-weight: bold; display: block; text-transform: uppercase;">Đề nghị điều trị / theo dõi:</span>
        <span style="color: #1e293b; font-style: italic;">${r.summary.advice || 'Tự theo dõi thêm tại nhà'}</span>
    </div>
</div>
            </div>

            <div style="margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: right; display: flex; justify-content: flex-end; gap: 10px;">
                <button onclick="printStudentExamFromModal('${recordId}')" class="btn-modern" style="background: #10b981; color: white; border: none; font-weight: bold; padding: 10px 20px; font-size: 0.9rem; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">
                    <i class="fas fa-print"></i> Tải kết quả (Lưu PDF)
                </button>
                <button onclick="closeStExamDetailModal()" class="btn-modern" style="background: #e2e8f0; color: #475569; padding: 10px 15px; font-size: 0.9rem; border-radius: 8px; border: none; cursor: pointer;">Đóng</button>
            </div>
        `;
        document.getElementById('st-exam-detail-modal').style.display = 'flex';
    } catch (err) {
        console.error(err);
        alert("Lỗi tải thông tin chi tiết khám: " + err.message);
    }
}

// --- HÀM IN PHIẾU KHÁM SỨC KHỎE KHỔ A5 CHUẨN ĐỒ HỌA (ĐÃ BỌC PHÒNG VỆ MẠNG) ---
async function printStudentExamFromModal(recordId) {
    try {
        const doc = await db.collection('yt_exam_results').doc(recordId).get();
        if (!doc.exists) return alert("Không tìm thấy kết quả!");
        const r = doc.data();

        let campName = "Khám sức khỏe học sinh";
        try {
            const campDoc = await db.collection('yt_exam_campaigns').doc(r.campaignId).get();
            if (campDoc.exists) campName = campDoc.data().name;
        } catch (e) {
            console.warn("Lỗi tải thông tin đợt khám:", e);
        }

        let age = "N/A";
        const dob = currentStudent.dob || r.dob || "";
        if (dob) {
            let birthYear = NaN;
            let parts = String(dob).split(/[\/\-]/);
            if (parts.length === 3) {
                birthYear = parts[0].length === 4 ? parseInt(parts[0]) : parseInt(parts[2]);
            }
            if (!isNaN(birthYear)) {
                age = new Date().getFullYear() - birthYear;
            }
        }

        let bmiVal = "--";
        let bmiClass = "Chưa rõ";
        if (r.height && r.weight) {
            let h = parseFloat(r.height) / 100;
            let w = parseFloat(r.weight);
            if (h > 0 && w > 0) {
                let bmi = w / (h * h);
                bmiVal = bmi.toFixed(1);
                if (bmi < 18.5) bmiClass = "Thiếu cân";
                else if (bmi < 24.9) bmiClass = "Bình thường";
                else if (bmi < 29.9) bmiClass = "Thừa cân";
                else bmiClass = "Béo phì";
            }
        }

        const htmlContent = `
            <div style="width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.35; box-sizing: border-box; background: white;">
                <div style="height: 4px; background: #2563eb; width: 100%; border-radius: 2px; margin-bottom: 12px;"></div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 6px;">
                    <div style="line-height: 1.3;">
                        <div style="font-size: 8pt; font-weight: 800; color: #1e293b; text-transform: uppercase; margin-top: 1px;">Trường THPT Võ Thị Sáu- Bà Rịa- Vũng Tàu</div>
                        <div style="font-size: 7pt; font-weight: 600; color: #64748b; text-transform: uppercase;">Phòng Y Tế</div>
                    </div>
                    <div style="text-align: right; line-height: 1.3;">
                        <div style="font-size: 8pt; font-weight: bold; color: #2563eb; font-family: monospace;">MÃ PHIẾU: ${doc.id}</div>
                        <img src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${doc.id}&scale=2&height=6&includetext=false" alt="Barcode" style="height: 18px; max-width: 150px; opacity: 0.85;">
                    </div>
                </div>
                <div style="text-align: center; margin-bottom: 15px; margin-top: 5px;">
                    <h1 style="margin: 0 0 3px 0; font-size: 13.5pt; font-weight: 800; color: #1e3a8a; letter-spacing: 0.5px;">PHIẾU KẾT QUẢ KHÁM SỨC KHỎE</h1>
                </div>
                <div style="margin-bottom: 10px;">
                    <div style="font-size: 8.5pt; font-weight: 800; color: #1e3a8a; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.3px;">1. Thông tin đợt khám</div>
                    <table style="width: 100%; font-size: 8pt; border-collapse: collapse;">
                        <tr>
                            <td style="width: 18%; color: #64748b; padding: 2.5px 0;">Đợt khám:</td>
                            <td style="width: 47%; font-weight: 600; color: #0f172a; padding: 2.5px 0;">${campName}</td>
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
                <div style="margin-bottom: 10px">
                    <div style="font-size: 8.5pt; font-weight: 800; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.3px;">2. Thông tin học sinh</div>
                    <table style="width: 100%; font-size: 8pt; border-collapse: collapse; margin-bottom: 4px;">
                        <tr>
                            <td style="width: 18%; color: #64748b; padding: 2.5px 0;">Họ và tên:</td>
                            <td style="width: 47%; font-weight: 700; font-size: 9.5pt; color: #1e3a8a; padding: 2.5px 0;">${r.name}</td>
                            <td style="width: 15%; color: #64748b; padding: 2.5px 0;">Lớp:</td>
                            <td style="width: 20%; font-weight: 700; color: #2563eb; padding: 2.5px 0;">${r.class}</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; padding: 2.5px 0;">Giới tính:</td>
                            <td style="font-weight: 600; color: #0f172a; padding: 2.5px 0;">${currentStudent.gender || 'Chưa xác định'}</td>
                            <td style="color: #64748b; padding: 2.5px 0;">Tuổi:</td>
                            <td style="font-weight: 600; color: #0f172a; padding: 2.5px 0;">${age}</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; padding: 2.5px 0;">Mã Y tế:</td>
                            <td style="font-weight: 600; color: #0f172a; padding: 2.5px 0; font-family: monospace;">${r.studentId}</td>
                            <td style="color: #64748b; padding: 2.5px 0;">Mã HS:</td>
                            <td style="font-weight: 600; color: #0f172a; padding: 2.5px 0;">${currentStudent.studentCode || '--'}</td>
                        </tr>
                    </table>
                </div>
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
                <div style="margin-bottom: 15px; background: #fffbeb; padding: 10px 12px; border-radius: 8px; border: 1px solid #fde68a;">
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
                <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1.5px solid #cbd5e1; padding-top: 6px; margin-top: 8px;">
                    <div style="font-size: 7pt; color: #64748b; font-style: italic; line-height: 1.35; width: 72%;">
                        Dữ liệu được trích xuất tự động từ Hệ thống Y tế số điện tử<br>
                        Trường THPT Võ Thị Sáu - BRVT
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; width: 28%; justify-content: flex-end;">
                        <span style="font-size: 6.5pt; color: #64748b; text-align: right; line-height: 1.1;">Quét mã tra cứu kết quả</span>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=https://yteso-thptvothisaubrvt.netlify.app/" alt="QR" style="width: 32px; height: 32px;">
                    </div>
                </div>
            </div>
        `;

        const iframeId = 'silent-print-iframe-student';
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

        const iframeDoc = iframe.contentWindow.document;
	iframeDoc.open();
	iframeDoc.write(`
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
        iframeDoc.close();

        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }, 1500);
    } catch (e) {
        alert("Lỗi khi kết nối máy in/tải PDF: " + e.message);
    }
}
        // --- RENDER TAB 3: TICKETS ---
// --- ĐIỀU KHIỂN POPUP TẠO YÊU CẦU ---
        function openTicketModal() {
            document.getElementById('ticket-modal').style.display = 'flex';
        }

        function closeTicketModal() {
            document.getElementById('ticket-modal').style.display = 'none';
            document.getElementById('req-content').value = ''; // Reset ô nhập
        }

        // --- XỬ LÝ GỬI YÊU CẦU ---
        function createTicket() {
            const content = document.getElementById('req-content').value.trim();
            if (!content) return alert("Vui lòng nhập nội dung!");

            const btn = document.getElementById('btn-send-req');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...'; 
            btn.disabled = true;

            const ticketId = "REQ-" + Math.floor(Math.random() * 90000 + 10000);

            db.collection('yt_tickets').add({
                ticketId: ticketId,
                studentId: currentStudent.id,
                name: currentStudent.name,
                class: currentStudent.class,
                content: content,
                adminReply: "",
                status: 'pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                closeTicketModal(); // Gửi xong thì tự động đóng Popup
                btn.innerHTML = 'Xác nhận gửi'; btn.disabled = false;
                alert("✅ Đã gửi yêu cầu thành công!");
            }).catch((err) => {
                btn.innerHTML = 'Xác nhận gửi'; btn.disabled = false;
                alert("Lỗi không thể gửi: " + err.message);
            });
        }

// --- TẢI & THEO DÕI YÊU CẦU (ĐÃ FIX LỖI INDEX FIREBASE) ---
        function loadTickets() {
            // Đã xóa .orderBy('timestamp', 'desc') để không bị lỗi Index Firebase
            db.collection('yt_tickets').where('studentId', '==', currentStudent.id)
              .onSnapshot(snap => {
                const div = document.getElementById('st-tickets-list');
                
                if (snap.empty) {
                    return div.innerHTML = `
                        <div style="text-align:center; padding: 40px; color: #94a3b8; background: white; border-radius: 16px; border: 1px dashed #cbd5e1;">
                            <i class="fas fa-box-open fa-3x" style="margin-bottom:15px; opacity:0.5;"></i>
                            <br>Bạn chưa có yêu cầu hỗ trợ nào.
                        </div>`;
                }

                // Chuyển dữ liệu Firebase thành mảng Javascript
                let tickets = [];
                snap.forEach(doc => tickets.push(doc.data()));

                // Dùng Javascript để tự sắp xếp thời gian Mới nhất lên đầu
                tickets.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

                let html = '';
                tickets.forEach(t => {
                    const date = t.timestamp ? new Date(t.timestamp.seconds * 1000).toLocaleString('vi-VN', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'}) : 'Đang xử lý...';

                    // Cấu hình nhãn trạng thái
                    let statusColor = '';
                    let statusText = '';
                    let statusIcon = '';

                    if(t.status === 'pending') {
                        statusColor = '#f59e0b'; // Màu Vàng
                        statusText = 'Chờ tiếp nhận';
                        statusIcon = 'fa-clock';
                    } else if(t.status === 'processing') {
                        statusColor = '#3b82f6'; // Màu Xanh dương
                        statusText = 'Phòng Y Tế đang xử lý';
                        statusIcon = 'fa-spinner fa-spin';
                    } else {
                        statusColor = '#10b981'; // Màu Xanh lá
                        statusText = 'Đã hoàn tất';
                        statusIcon = 'fa-check-circle';
                    }

                    html += `
                        <div class="st-card" style="padding: 20px; border-left: 4px solid ${statusColor}; margin-bottom: 15px; border-radius: 12px;">
                            <!-- Tiêu đề: ID, Ngày & Trạng thái -->
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                                <div>
                                    <span style="font-weight: bold; color: var(--st-text); font-size: 0.95rem;">Mã YC: ${t.ticketId}</span>
                                    <div style="font-size: 0.75rem; color: #94a3b8;"><i class="far fa-calendar-alt"></i> ${date}</div>
                                </div>
                                <span style="background: ${statusColor}15; color: ${statusColor}; padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold;">
                                    <i class="fas ${statusIcon}"></i> ${statusText}
                                </span>
                            </div>
                            
                            <!-- Nội dung học sinh hỏi -->
                            <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; color: #334155; font-size: 0.95rem; margin-bottom: 15px;">
                                <strong>Yêu cầu:</strong> ${t.content}
                            </div>
                            
                            <!-- Phản hồi của Admin (Nếu có) -->
                            ${t.adminReply ? `
                                <div style="border-top: 1px dashed #cbd5e1; padding-top: 15px;">
                                    <div style="font-weight: bold; font-size: 0.85rem; color: #059669; margin-bottom: 5px;">
                                        <i class="fas fa-user-nurse"></i> Phản hồi từ Phòng Y Tế:
                                    </div>
                                    <div style="font-size: 0.95rem; color: #1e293b; line-height: 1.5;">
                                        ${t.adminReply}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                });
                div.innerHTML = html;
            });
        }
// --- RENDER TAB 4: LỊCH SỬ NGHỈ HỌC (ĐIỂM DANH) ---
        async function loadAttendance() {
            const div = document.getElementById('st-attendance-list');
            const snap = await db.collection('yt_attendance').where('studentId', '==', currentStudent.id).get();

            if (snap.empty) {
                return div.innerHTML = `
                    <div style="text-align:center; padding: 40px; color: #94a3b8; background: #f8fafc; border-radius: 16px; border: 1px dashed #cbd5e1;">
                        <i class="fas fa-calendar-check fa-3x" style="margin-bottom:15px; opacity:0.5;"></i>
                        <br>Tuyệt vời! Bạn chưa nghỉ học ngày nào.
                    </div>`;
            }

            let attendance = [];
            snap.forEach(d => attendance.push(d.data()));

            // Sắp xếp ngày nghỉ mới nhất lên đầu
            attendance.sort((a, b) => new Date(b.date) - new Date(a.date));

            let html = '';
            attendance.forEach(a => {
                const dateStr = new Date(a.date).toLocaleDateString('vi-VN');
                
                let reasonTag = '';
                let extraInfo = '';

                // Định dạng tag màu theo lý do
                if (a.reason === 'P') {
                    reasonTag = '<span style="background:#eff6ff; color:#3b82f6; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:bold;">Có phép</span>';
                } else if (a.reason === 'KP') {
                    reasonTag = '<span style="background:#fef2f2; color:#ef4444; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:bold;">Không phép</span>';
                } else if (a.reason === 'B') {
                    reasonTag = '<span style="background:#fef3c7; color:#d97706; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:bold;">Nghỉ bệnh</span>';
                    // Nếu là nghỉ bệnh, show thêm chẩn đoán và triệu chứng
                    extraInfo = `
                        <div style="margin-top: 10px; font-size: 0.85rem; color: #334155; background: #fffbeb; padding: 12px; border-radius: 8px; border-left: 3px solid #f59e0b;">
                            <div style="margin-bottom: 4px;"><strong style="color: #d97706;">Bệnh:</strong> ${a.diagnosis}</div>
                            <div><strong style="color: #d97706;">Triệu chứng:</strong> ${a.symptom}</div>
                        </div>`;
                }

                html += `
                    <div style="border: 1px solid #e2e8f0; padding: 15px; margin-bottom: 15px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="font-weight:bold; color:#1e293b; font-size:1rem;">
                                <i class="far fa-calendar-alt" style="color:#64748b; margin-right:5px;"></i> ${dateStr}
                            </div>
                            <div>${reasonTag}</div>
                        </div>
                        ${extraInfo}
                    </div>
                `;
            });
            div.innerHTML = html;
        }


// --- HỆ THỐNG NHẬN THÔNG BÁO (ĐÃ NÂNG CẤP) ---
        function toggleStudentNotiModal() {
            const modal = document.getElementById('student-noti-modal');
            modal.style.display = modal.style.display === 'none' || modal.style.display === '' ? 'flex' : 'none';
            document.getElementById('noti-badge').style.display = 'none';
        }

function listenToNotifications() {
            if (!currentStudent) return;
            const listDiv = document.getElementById('st-notifications-list');
            
            const gradeMatch = currentStudent.class.match(/^(\d+)/);
            const grade = gradeMatch ? gradeMatch[1] : '';

            db.collection('yt_notifications').orderBy('timestamp', 'desc').onSnapshot(snap => {
                let html = '';
                allNotificationsCache = []; // Reset bộ nhớ tạm
                
                // Lấy danh sách các thông báo học sinh đã bấm "Bỏ qua"
                let hiddenNotis = currentStudent.hiddenNotifications || []; 

                snap.forEach(doc => {
                    const d = doc.data();
                    const notiId = doc.id;
                    allNotificationsCache.push({id: notiId, ...d});

                    // Nếu thông báo này đã được học sinh đọc -> Bỏ qua không hiển thị nữa
                    if (hiddenNotis.includes(notiId)) return;

                    let isForMe = false;
                    if (d.targetType === 'all') isForMe = true;
                    if (d.targetType === 'grade' && d.targetValue === grade) isForMe = true;
                    if (d.targetType === 'class' && d.targetValue === currentStudent.class) isForMe = true;
                    if (d.targetType === 'student') {
                        if (Array.isArray(d.targetValue)) {
                            if (d.targetValue.includes(currentStudent.id)) isForMe = true;
                        } else {
                            if (d.targetValue === currentStudent.id) isForMe = true;
                        }
                    }

                    if (isForMe) {
                        const time = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString('vi-VN') : '';
                        
                        // 👉 BƯỚC QUAN TRỌNG: Lọc sạch thẻ HTML để làm nội dung tóm tắt (Preview)
                        let rawText = d.content ? d.content.replace(/<[^>]*>?/gm, '') : '';
                        let previewText = rawText.length > 70 ? rawText.substring(0, 70) + '...' : rawText;
                        
                        // Giao diện thẻ thông báo (Đã đổi thành thẻ <a> dẫn link)
                        html += `
                            <div style="background: #f8fafc; padding: 12px; border-radius: 10px; border-left: 4px solid #0ea5e9; position: relative; transition: 0.2s; margin-bottom: 10px;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">
                                
                                <!-- CLICK VÀO ĐÂY ĐỂ CHUYỂN SANG TRANG ĐỌC CHI TIẾT -->
                                <a href="view_noti.html?id=${notiId}" target="_blank" style="display: block; padding-right: 30px; text-decoration: none; color: inherit;">
                                    <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 5px;">Từ: ${d.sender} - ${time}</div>
                                    <div style="font-weight: bold; color: #0ea5e9; margin-bottom: 5px; font-size: 1.05rem;">${d.title}</div>
                                    <div style="font-size: 0.9rem; color: #334155; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${previewText}</div>
                                </a>
                                
                                <!-- Nút tick xanh để Đánh dấu đã đọc (Ẩn đi) -->
                                <button onclick="markNotiAsRead('${notiId}')" style="position: absolute; top: 12px; right: 10px; background: none; border: none; color: #cbd5e1; cursor: pointer; font-size: 1.2rem; transition: 0.2s;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#cbd5e1'" title="Đánh dấu đã đọc">
                                    <i class="fas fa-check-circle"></i>
                                </button>
                            </div>
                        `;
                    }
                });

                if (html === '') {
                    listDiv.innerHTML = '<div style="text-align:center; color:#94a3b8; padding: 30px;"><i class="fas fa-envelope-open fa-3x" style="opacity:0.3; margin-bottom:15px;"></i><br>Hộp thư trống.<br>Bạn đã đọc hết thông báo!</div>';
                } else {
                    listDiv.innerHTML = html;
                    document.getElementById('noti-badge').style.display = 'block';
                    document.getElementById('bell-icon').style.color = '#0ea5e9';
                }
            });
        }
        // --- ĐÁNH DẤU ĐÃ ĐỌC (LƯU VÀO FIREBASE) ---
        async function markNotiAsRead(notiId) {
            if(!currentStudent) return;
            try {
                // Cập nhật lên CSDL: Thêm ID thông báo này vào mảng "hiddenNotifications" của học sinh
                await db.collection('yt_students').doc(currentStudent.id).update({
                    hiddenNotifications: firebase.firestore.FieldValue.arrayUnion(notiId)
                });
                
                // Cập nhật biến Local ngay lập tức để giao diện tự biến mất mà không cần tải lại trang
                if(!currentStudent.hiddenNotifications) currentStudent.hiddenNotifications = [];
                currentStudent.hiddenNotifications.push(notiId);
                
                // Gọi render lại danh sách
                listenToNotifications(); 
            } catch(e) {
                console.error("Lỗi ẩn thông báo:", e);
            }
        }
        function openCardModal() {
            if(!currentStudent) return;
            document.getElementById('card-modal').style.display = 'flex';
            document.getElementById('modal-st-name').innerText = currentStudent.name;
            
            // Lấy mã YT làm mã quét
            const scanData = currentStudent.id; 

            // Vẽ QR Code
            document.getElementById('st-qrcode').innerHTML = "";
            new QRCode(document.getElementById('st-qrcode'), { text: scanData, width: 150, height: 150 });
            
            // Vẽ Barcode
            JsBarcode("#st-barcode", scanData, { format: "CODE128", width: 2, height: 50, displayValue: true });
        }
// --- RENDER THỐNG KÊ Y TẾ HỌC ĐƯỜNG (TRONG 1 THÁNG QUA) ---
// --- RENDER THỐNG KÊ Y TẾ HỌC ĐƯỜNG (DỮ LIỆU CHỐT SỔ ĐẾN HÔM QUA) ---
async function loadSchoolHealthStats() {
    try {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        const monthId = `${currentMonth.toString().padStart(2, '0')}-${currentYear}`; // VD: "05-2024"

        // Đổi tiêu đề hiển thị tháng hiện tại
        document.getElementById('st-stat-title').innerHTML = `<i class="fas fa-chart-pie" style="color: #8b5cf6;"></i> Bản tin Y tế tháng ${currentMonth}/${currentYear}`;

        // Chỉ đọc ĐÚNG 1 DOCUMENT thống kê của tháng này
        const docRef = await db.collection('yt_stats').doc(monthId).get();

        if (!docRef.exists) {
            document.getElementById('st-trending-symptoms').innerHTML = '<div style="font-size:0.9rem; color:#64748b;">Chưa có dữ liệu thống kê cho tháng này.</div>';
            document.getElementById('st-my-visits').innerText = "0";
            document.getElementById('st-my-rank').innerText = "N/A";
            document.getElementById('st-rank-message').innerHTML = '<span style="color:#10b981;">Chưa có dữ liệu xét hạng tháng này.</span>';
            return;
        }

        const data = docRef.data();
        
        // 1. RENDER BỆNH ĐANG HOT
        let sympHTML = '';
        let colors = ['#ef4444', '#f97316', '#f59e0b']; 
        
        if (data.topSymptoms && data.topSymptoms.length > 0) {
            data.topSymptoms.slice(0, 3).forEach((item, index) => {
                sympHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 8px 12px; border-radius: 8px; margin-bottom: 8px;">
                        <span style="font-size: 0.95rem; color: #1e293b; font-weight: 500;">
                            <i class="fas fa-virus" style="color: ${colors[index] || '#94a3b8'}; margin-right: 5px;"></i> ${item.name}
                        </span>
                        <span style="background: #fff1f2; color: #e11d48; padding: 2px 8px; border-radius: 20px; font-size: 0.8rem; font-weight: bold;">
                            ${item.count} ca
                        </span>
                    </div>
                `;
            });
        } else {
            sympHTML = '<div style="font-size:0.9rem; color:#64748b;">Chưa có thống kê</div>';
        }
        document.getElementById('st-trending-symptoms').innerHTML = sympHTML;

        // 2. RENDER XẾP HẠNG CÁ NHÂN
        let studentVisits = data.studentVisits || {};
        let myVisitCount = studentVisits[currentStudent.id] || 0;
        
        // Chuyển Object thành Array để sắp xếp tìm thứ hạng
        let sortedStudents = Object.keys(studentVisits).map(k => ({id: k, count: studentVisits[k]}));
        sortedStudents.sort((a, b) => b.count - a.count);

        let myRankIndex = sortedStudents.findIndex(s => s.id === currentStudent.id);
        let myRank = myRankIndex !== -1 ? myRankIndex + 1 : 0;

        document.getElementById('st-my-visits').innerText = myVisitCount;
        const rankText = document.getElementById('st-my-rank');
        const rankMsg = document.getElementById('st-rank-message');

        if (myVisitCount === 0) {
            rankText.innerText = "N/A";
            rankMsg.innerHTML = '<span style="color:#10b981;">🎉 Tháng này bạn chưa phải xuống phòng Y tế lần nào!</span>';
        } else {
            rankText.innerText = "TOP " + myRank;
            if (myRank === 1) {
                rankMsg.innerHTML = '<span style="color:#dc2626;"><i class="fas fa-exclamation-triangle"></i> Bạn bị bệnh nhiều nhất tháng. Hãy chú ý sức khỏe nhé!</span>';
            } else if (myRank <= 2) {
                rankMsg.innerHTML = '<span style="color:#ea580c;">Bạn lọt top 2 học sinh đến phòng y tế nhiều nhất tháng. Hãy chú ý sức khỏe, đừng để leo lên top 1 bạn nhé</span>';
            } else if (myRank <= 5) {
                rankMsg.innerHTML = '<span style="color:#f97316;">Bạn lọt top 5 học sinh đến phòng y tế nhiều nhất tháng. Hãy chú ý sức khỏe, đừng để leo lên top 1 bạn nhé</span>';
            } else if (myRank <= 10) {
                rankMsg.innerHTML = '<span style="color:#f59e0b;">Tháng này bạn ốm hơi nhiều đấy nhé!</span>';
            } else {
                rankMsg.innerHTML = '<span style="color:#10b981;">Sức khỏe của bạn đang ở mức ổn định.</span>';
            }
        }

        // Hiển thị ngày và giờ cập nhật cuối cùng
const lastUpdatedDateTime = data.lastUpdated.toDate().toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric'
});
rankMsg.innerHTML += `<div style="margin-top: 8px; font-size: 0.75rem; color: #94a3b8;"><i class="fas fa-clock"></i> Cập nhật đến: ${lastUpdatedDateTime}</div>`;

    } catch (error) {
        console.error("Lỗi lấy dữ liệu thống kê: ", error);
        document.getElementById('st-trending-symptoms').innerHTML = '<div style="color:red; font-size:0.85rem;">Lỗi tải dữ liệu.</div>';
    }
}
// Hàm đóng popup chi tiết khám sức khỏe học sinh
function closeStExamDetailModal() {
    const modal = document.getElementById('st-exam-detail-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}