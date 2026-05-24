        // 👉 1. BẢO MẬT & LOAD TÀI KHOẢN ADMIN
        firebase.auth().onAuthStateChanged((user) => {
            if (user && ALLOWED_ADMIN_EMAILS.includes(user.email)) {
                // Hiển thị Profile
                document.getElementById('admin-name').innerText = user.displayName || "Quản trị viên";
                document.getElementById('admin-email').innerText = user.email;
                if(user.photoURL) document.getElementById('admin-avatar').src = user.photoURL;

                loadOverviewStats();
                loadTestList();
            } else {
                alert("❌ Từ chối truy cập! Yêu cầu quyền Admin.");
                window.location.href = "../admin/admin.html";
            }
        });

        function logoutAdmin() { firebase.auth().signOut().then(() => window.location.href = "../index.html"); }

        // 👉 2. ĐỒNG HỒ THỜI GIAN THỰC
        setInterval(() => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
            const dateStr = now.toLocaleDateString('vi-VN');
            document.getElementById('live-clock').innerHTML = `<i class="far fa-clock"></i> ${timeStr} <span style="font-size:0.7rem; color:#64748b; margin-left:5px;">${dateStr}</span>`;
        }, 1000);

        // 👉 3. CHUYỂN ĐỔI TAB (OVERVIEW & TEST MANAGER)
        function switchMainView(view) {
            document.getElementById('view-overview').style.display = view === 'overview' ? 'block' : 'none';
            document.getElementById('view-test-manager').style.display = view === 'test-manager' ? 'block' : 'none';
            document.getElementById('sb-overview').className = view === 'overview' ? 'admin-tab-btn active' : 'admin-tab-btn';
            document.getElementById('sb-tests').className = view === 'test-manager' ? 'admin-tab-btn active' : 'admin-tab-btn';
        }

        function switchTestTab(tab) {
            document.getElementById('tab-dashboard').style.display = tab === 'dashboard' ? 'block' : 'none';
            document.getElementById('tab-builder').style.display = tab === 'builder' ? 'block' : 'none';
            document.getElementById('btn-dashboard').className = tab === 'dashboard' ? 'top-tab-btn active' : 'top-tab-btn';
            document.getElementById('btn-builder').className = tab === 'builder' ? 'top-tab-btn active' : 'top-tab-btn';
        }

        // 👉 4. TẢI DỮ LIỆU TỔNG QUAN
        async function loadOverviewStats() {
            db.collection('yt_tests').onSnapshot(snap => {
                document.getElementById('stat-total-tests').innerText = snap.size;
                let activeCount = 0;
                snap.forEach(doc => { if(doc.data().isActive) activeCount++; });
                document.getElementById('stat-active-tests').innerText = activeCount;
            });
            // Giả lập hoặc lấy từ Collection kết quả (sẽ tạo ở phần Client sau)
            db.collection('yt_test_results').onSnapshot(snap => {
                document.getElementById('stat-total-results').innerText = snap.size || 0;
            });
        }

        // 👉 5. LOGIC WIZARD 7 BƯỚC
        let currentStep = 1;
        const totalSteps = 7;

        function changeStep(dir) {
            if (dir === 1 && !validateStep(currentStep)) return;

            document.getElementById(`step${currentStep}`).classList.remove('active');
            document.getElementById(`p-step${currentStep}`).classList.remove('active');
            if(dir === 1) document.getElementById(`p-step${currentStep}`).classList.add('completed');

            currentStep += dir;

            document.getElementById(`step${currentStep}`).classList.add('active');
            document.getElementById(`p-step${currentStep}`).classList.add('active');
            document.getElementById(`p-step${currentStep}`).classList.remove('completed');

            document.getElementById('btn-prev').style.display = currentStep === 1 ? 'none' : 'flex';
            document.getElementById('btn-next').style.display = currentStep === totalSteps ? 'none' : 'flex';
        }

        function validateStep(step) {
            if (step === 1) {
                if (!document.getElementById('t-id').value) return alert("Vui lòng nhập Mã bài test!"), false;
                if (!document.getElementById('t-title').value) return alert("Vui lòng nhập Tên bài test!"), false;
            }
            if (step === 4) if (document.querySelectorAll('.opt-row').length === 0) return alert("Phải có ít nhất 1 đáp án chung!"), false;
            if (step === 5) if (document.querySelectorAll('.q-row').length === 0) return alert("Phải có ít nhất 1 câu hỏi!"), false;
            if (step === 6) if (document.querySelectorAll('.r-row').length === 0) return alert("Phải thiết lập ít nhất 1 thang điểm!"), false;
            return true;
        }

        // 👉 6. THÊM ĐÁP ÁN CHUNG
        function addGlobalOption() {
            const container = document.getElementById('global-options-container');
            const html = `
                <div class="dynamic-box opt-row">
                    <input type="text" class="opt-text" placeholder="Nội dung đáp án (VD: Rất đồng ý)" style="flex:1; padding:10px; border-radius:8px; border:1px solid #cbd5e1;">
                    <input type="number" class="opt-point" placeholder="Số điểm" style="width:100px; padding:10px; border-radius:8px; border:1px solid #cbd5e1;">
                    <button class="btn-remove" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        }

        // 👉 7. THÊM CÂU HỎI (CHỈ TEXT)
        let qIndex = 0;
        function addQuestion() {
            qIndex++;
            const container = document.getElementById('questions-container');
            const html = `
                <div class="dynamic-box q-row">
                    <div style="font-weight:bold; color:var(--primary); width:40px;">Q${qIndex}.</div>
                    <input type="text" class="q-text" placeholder="Nhập nội dung câu hỏi..." style="flex:1; padding:10px; border-radius:8px; border:1px solid #cbd5e1;">
                    <button class="btn-remove" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        }

        // 👉 8. THÊM THANG ĐIỂM KẾT QUẢ
        function addRule() {
            const container = document.getElementById('rules-container');
            const html = `
                <div class="dynamic-box r-row" style="flex-direction:column; align-items:stretch;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; gap:10px;">
                            <input type="number" class="r-min" placeholder="Từ điểm" style="width:100px; padding:10px;">
                            <input type="number" class="r-max" placeholder="Đến điểm" style="width:100px; padding:10px;">
                        </div>
                        <button class="btn-remove" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
                    </div>
                    <input type="text" class="r-title" placeholder="Tiêu đề kết quả (VD: Trạng thái bình thường)" style="padding:10px; margin-top:10px;">
                    <textarea class="r-advice" placeholder="Lời khuyên tương ứng..." rows="2" style="padding:10px; margin-top:10px;"></textarea>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        }

        // 👉 9. XUẤT BẢN LÊN FIREBASE
        async function publishTest() {
            const btn = document.getElementById('btn-publish');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải lên...'; btn.disabled = true;

            const testId = document.getElementById('t-id').value;

            // 1. Thu thập Bộ đáp án chung
            let globalOptions = [];
            document.querySelectorAll('.opt-row').forEach(row => {
                globalOptions.push({
                    text: row.querySelector('.opt-text').value,
                    points: Number(row.querySelector('.opt-point').value || 0)
                });
            });

            // 2. Thu thập Câu hỏi
            let questions = [];
            document.querySelectorAll('.q-row').forEach((row, index) => {
                questions.push({
                    id: "q" + (index + 1),
                    text: row.querySelector('.q-text').value
                });
            });

            // 3. Thu thập Luật điểm
            let resultRules = [];
            document.querySelectorAll('.r-row').forEach(row => {
                resultRules.push({
                    minScore: Number(row.querySelector('.r-min').value),
                    maxScore: Number(row.querySelector('.r-max').value),
                    title: row.querySelector('.r-title').value,
                    advice: row.querySelector('.r-advice').value
                });
            });

            // GÓI JSON
            const testData = {
                testId: testId,
                title: document.getElementById('t-title').value,
                description: document.getElementById('t-desc').value,
                timeLimit: Number(document.getElementById('t-time').value || 0),
                expiresAt: document.getElementById('t-expire').value || null,
                isActive: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                globalOptions: globalOptions,
                questions: questions,
                resultRules: resultRules
            };

            try {
                await db.collection('yt_tests').doc(testId).set(testData);
                alert("🎉 XUẤT BẢN THÀNH CÔNG!");
                window.location.reload();
            } catch (error) {
                alert("Lỗi tải lên: " + error.message);
                btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Xuất bản Bài Test'; btn.disabled = false;
            }
        }

        // 👉 10. LOAD DANH SÁCH BÀI TEST
        function loadTestList() {
            db.collection('yt_tests').orderBy('createdAt', 'desc').onSnapshot(snap => {
                const tbody = document.getElementById('test-list-table');
                if (snap.empty) return tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Chưa có bài test nào.</td></tr>';

                let html = '';
                snap.forEach(doc => {
                    const data = doc.data();
                    const statusBadge = data.isActive ? `<span class="badge badge-active">Đang mở</span>` : `<span class="badge badge-inactive">Đã khóa</span>`;
                    const testLink = `${window.location.origin}/do_zone.html?id=${data.testId}`;

                    html += `
                        <tr>
                            <td style="font-weight:bold; color:var(--primary);">${data.testId}</td>
                            <td>${data.title}</td>
                            <td>${data.questions ? data.questions.length : 0} câu</td>
                            <td>${statusBadge}</td>
                            <td>
    <button onclick="viewTestStats('${doc.id}', '${data.title.replace(/'/g, "\\'")}')" class="btn" style="padding:5px 10px; background:#10b981; color:white;" title="Thống kê"><i class="fas fa-chart-bar"></i></button>
    <button onclick="editTest('${doc.id}')" class="btn" style="padding:5px 10px; background:#f59e0b; color:white;" title="Sửa"><i class="fas fa-edit"></i></button>
    <button onclick="db.collection('yt_tests').doc('${doc.id}').update({isActive: ${!data.isActive}})" class="btn btn-primary" style="padding:5px 10px;" title="Mở/Khóa">${data.isActive ? '<i class="fas fa-lock"></i>' : '<i class="fas fa-unlock"></i>'}</button>
    <button onclick="deleteTest('${doc.id}')" class="btn btn-danger" style="padding:5px 10px;" title="Xóa"><i class="fas fa-trash"></i></button>
</td>
                        </tr>
                    `;
                });
                tbody.innerHTML = html;
            });
        }

        // Khởi tạo dòng đầu tiên cho Builder
        addGlobalOption(); addGlobalOption(); addQuestion(); addRule();
// --- 1. CHỨC NĂNG XÓA ---
async function deleteTest(id) {
    if(confirm("⚠️ Bạn có chắc chắn muốn XÓA VĨNH VIỄN bài test này?\nLưu ý: Các dữ liệu kết quả học sinh đã làm sẽ không bị ảnh hưởng, nhưng bài test sẽ biến mất khỏi hệ thống.")) {
        try {
            await db.collection('yt_tests').doc(id).delete();
            alert("Đã xóa thành công!");
        } catch(e) { alert("Lỗi xóa: " + e.message); }
    }
}

// --- 2. CHỨC NĂNG THỐNG KÊ ---
// Biến toàn cục lưu dữ liệu học sinh tạm thời để hiện Modal chi tiết
let currentStudentResults = []; 

// --- 1. HÀM THỐNG KÊ & LOAD DANH SÁCH HỌC SINH ---
async function viewTestStats(testId, title) {
    document.getElementById('stats-title').innerText = "Thống kê: " + title;
    document.getElementById('stats-total').innerText = "Đang tải...";
    document.getElementById('stats-students-list').innerHTML = `<tr><td colspan="6" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</td></tr>`;
    document.getElementById('stats-modal').style.display = 'flex';

    // Lấy dữ liệu từ Firebase
    const snap = await db.collection('yt_test_results').where('testId', '==', testId).get();
    currentStudentResults = [];
    
    if(snap.empty) {
        document.getElementById('stats-total').innerText = "0";
        document.getElementById('stats-avg').innerText = "0";
        document.getElementById('stats-breakdown').innerHTML = "<li>Chưa có ai thực hiện bài test này.</li>";
        document.getElementById('stats-students-list').innerHTML = `<tr><td colspan="6" style="text-align:center;">Chưa có dữ liệu.</td></tr>`;
        return;
    }

    let totalScore = 0;
    let counts = {};

    // Gom data vào mảng
    snap.forEach(doc => {
        let data = doc.data();
        data.docId = doc.id; // Lưu ID để xóa
        currentStudentResults.push(data);
        
        totalScore += (data.score || 0);
        counts[data.resultTitle] = (counts[data.resultTitle] || 0) + 1;
    });

    // Sắp xếp mảng trên JS (Mới nhất lên đầu) để khỏi phải tạo Index trên Firebase
    currentStudentResults.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

    // Hiển thị phần Biểu đồ tóm tắt
    document.getElementById('stats-total').innerText = snap.size;
    document.getElementById('stats-avg').innerText = (totalScore / snap.size).toFixed(1);

    let breakdownHtml = '';
    for(let [result, count] of Object.entries(counts)) {
        let percent = Math.round((count / snap.size) * 100);
        breakdownHtml += `
            <li style="margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:5px;">
                    <strong>${result}</strong> <span>${count} học sinh (${percent}%)</span>
                </div>
                <div style="background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
                    <div style="background:var(--primary-grad); height:100%; width:${percent}%;"></div>
                </div>
            </li>`;
    }
    document.getElementById('stats-breakdown').innerHTML = breakdownHtml;

    // Hiển thị Bảng danh sách học sinh
    let tbodyHtml = '';
    currentStudentResults.forEach((r, index) => {
        let timeStr = r.timestamp ? r.timestamp.toDate().toLocaleString('vi-VN') : "N/A";
        // Truyền index để mở Modal Chi tiết, truyền docId để xóa
        tbodyHtml += `
            <tr>
                <td><strong>${r.studentName || "Khách"}</strong><br><small style="color:#64748b;">${r.studentEmail}</small></td>
                <td><span class="badge badge-active" style="background:#f1f5f9; color:#475569;">${r.studentClass || "?"}</span></td>
                <td style="font-size: 0.9rem;">${timeStr}</td>
                <td style="color:#10b981; font-weight:900; font-size:1.1rem;">${r.score}</td>
                <td style="font-size: 0.9rem;">${r.resultTitle}</td>
                <td style="text-align: center;">
                    <button onclick="openStudentResultDetail(${index})" class="btn" style="padding:6px 10px; background:#3b82f6; color:white; border-radius:6px;" title="Xem chi tiết"><i class="fas fa-eye"></i></button>
                    <button onclick="deleteStudentResult('${r.docId}', '${testId}', '${title.replace(/'/g, "\\'")}')" class="btn btn-danger" style="padding:6px 10px; border-radius:6px;" title="Xóa kết quả này"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    document.getElementById('stats-students-list').innerHTML = tbodyHtml;
}

// --- 2. HÀM MỞ MODAL XEM CHI TIẾT 1 HỌC SINH ---
function openStudentResultDetail(index) {
    const data = currentStudentResults[index];
    document.getElementById('sd-name').innerText = data.studentName || "Khách";
    document.getElementById('sd-email').innerText = data.studentEmail || "--";
    document.getElementById('sd-class').innerText = data.studentClass || "--";
    document.getElementById('sd-score').innerText = data.score || 0;
    document.getElementById('sd-result-title').innerText = data.resultTitle || "--";
    
    // Nếu có lưu trường advice trên Firebase thì gọi ra
    document.getElementById('sd-advice').innerText = data.advice || "Hệ thống đã ghi nhận kết quả thành công.";
    
    document.getElementById('student-detail-modal').style.display = 'flex';
}

// --- 3. HÀM XÓA KẾT QUẢ CỦA 1 HỌC SINH ---
async function deleteStudentResult(resultDocId, testId, testTitle) {
    if(confirm("⚠️ Xác nhận xóa kết quả làm bài của học sinh này?\nHành động này không thể hoàn tác!")) {
        try {
            await db.collection('yt_test_results').doc(resultDocId).delete();
            alert("Đã xóa kết quả thành công!");
            // Gọi lại hàm viewTestStats để tự động làm mới lại bảng danh sách
            viewTestStats(testId, testTitle); 
        } catch(error) {
            alert("Lỗi khi xóa: " + error.message);
        }
    }
}
// --- 3. CHỨC NĂNG CHỈNH SỬA (Đưa data ngược vào Builder) ---
async function editTest(testId) {
    const doc = await db.collection('yt_tests').doc(testId).get();
    if(!doc.exists) return alert("Không tìm thấy bài test!");
    
    const data = doc.data();

    // Điền Bước 1, 2, 3
    document.getElementById('t-id').value = testId;
    document.getElementById('t-id').disabled = true; // Không cho sửa ID
    document.getElementById('t-title').value = data.title;
    document.getElementById('t-desc').value = data.description || '';
    document.getElementById('t-time').value = data.timeLimit || '';
    document.getElementById('t-expire').value = data.expiresAt || '';

    // Điền Bước 4: Đáp án chung
    document.getElementById('global-options-container').innerHTML = '';
    data.globalOptions.forEach(opt => {
        document.getElementById('global-options-container').insertAdjacentHTML('beforeend', `
            <div class="dynamic-box opt-row">
                <input type="text" class="opt-text" value="${opt.text}" style="flex:1; padding:10px; border-radius:8px; border:1px solid #cbd5e1;">
                <input type="number" class="opt-point" value="${opt.points}" style="width:100px; padding:10px; border-radius:8px; border:1px solid #cbd5e1;">
                <button class="btn-remove" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
            </div>
        `);
    });

    // Điền Bước 5: Câu hỏi
    document.getElementById('questions-container').innerHTML = '';
    qIndex = 0;
    data.questions.forEach(q => {
        qIndex++;
        document.getElementById('questions-container').insertAdjacentHTML('beforeend', `
            <div class="dynamic-box q-row">
                <div style="font-weight:bold; color:var(--primary); width:40px;">Q${qIndex}.</div>
                <input type="text" class="q-text" value="${q.text}" style="flex:1; padding:10px; border-radius:8px; border:1px solid #cbd5e1;">
                <button class="btn-remove" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
            </div>
        `);
    });

    // Điền Bước 6: Thang điểm
    document.getElementById('rules-container').innerHTML = '';
    data.resultRules.forEach(r => {
        document.getElementById('rules-container').insertAdjacentHTML('beforeend', `
            <div class="dynamic-box r-row" style="flex-direction:column; align-items:stretch;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:10px;">
                        <input type="number" class="r-min" value="${r.minScore}" style="width:100px; padding:10px;">
                        <input type="number" class="r-max" value="${r.maxScore}" style="width:100px; padding:10px;">
                    </div>
                    <button class="btn-remove" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
                </div>
                <input type="text" class="r-title" value="${r.title}" style="padding:10px; margin-top:10px;">
                <textarea class="r-advice" rows="2" style="padding:10px; margin-top:10px;">${r.advice}</textarea>
            </div>
        `);
    });

    // Chuyển sang Tab Builder
    switchTestTab('builder');
    
    // Reset wizard về Bước 1
    currentStep = 1;
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.progress-step').forEach(el => { el.classList.remove('active'); el.classList.remove('completed'); });
    document.getElementById('step1').classList.add('active');
    document.getElementById('p-step1').classList.add('active');
    document.getElementById('btn-prev').style.display = 'none';
    document.getElementById('btn-next').style.display = 'flex';
}