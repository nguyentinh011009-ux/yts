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
// =========================================================================
// AI DỰ ĐOÁN NGUY CƠ DỊCH BỆNH HỌC ĐƯỜNG (BẢN BÁO LỖI CHI TIẾT & CHỐNG KẸT)
// =========================================================================

// Hàm hỗ trợ thông báo an toàn (Dùng sysAlert nếu có, không có thì dùng alert chuẩn)
function safeAlert(message, type = "error") {
    console.log(`[AI Predict Alert - ${type}]:`, message);
    if (typeof sysAlert === 'function') {
        sysAlert(message, type);
    } else {
        alert((type === 'error' ? '❌ ' : '✅ ') + message);
    }
}

// 1. Hàm chính: Chạy phân tích AI
window.runAIPrediction = async function() {
    console.log("=== [1/5] BẮT ĐẦU TIẾN TRÌNH DỰ ĐOÁN AI ===");

    // Kiểm tra nút bấm và hiệu ứng
    const btn = document.getElementById('btn-run-ai-predict');
    const loadingBox = document.getElementById('ai-predict-loading');
    
    if (!btn) {
        alert("❌ Lỗi HTML: Không tìm thấy nút #btn-run-ai-predict trên trang!");
        return;
    }

    const originalBtnText = btn.innerHTML;

    // Lấy thông tin ngày từ ô nhập liệu
    let startInput = document.getElementById('stat-start')?.value;
    let endInput = document.getElementById('stat-end')?.value;

    // TỰ ĐỘNG XỬ LÝ: Nếu chưa chọn ngày, tự lấy 30 ngày gần nhất để không làm kẹt ứng dụng
    if (!startInput || !endInput) {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        endInput = today.toISOString().split('T')[0];
        startInput = thirtyDaysAgo.toISOString().split('T')[0];

        // Tự điền vào ô ngày nếu có ô
        if (document.getElementById('stat-start')) document.getElementById('stat-start').value = startInput;
        if (document.getElementById('stat-end')) document.getElementById('stat-end').value = endInput;

        safeAlert(`Tự động chọn khoảng thời gian 30 ngày gần đây (${startInput} đến ${endInput}) để phân tích.`, "warning");
    }

    const startDate = new Date(startInput + "T00:00:00");
    const endDate = new Date(endInput + "T23:59:59");

    // Bật hiệu ứng Loading
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang kết nối dữ liệu...';
    btn.disabled = true;
    if (loadingBox) loadingBox.style.display = 'block';

    try {
        // BƯỚC 1: TRUY VẤN FIRESTORE
        console.log(`=== [2/5] ĐANG TRUY VẤN FIRESTORE (Từ ${startInput} đến ${endInput}) ===`);
        
        let snap;
        try {
            snap = await db.collection('yt_visits')
                .where('timestamp', '>=', startDate)
                .where('timestamp', '<=', endDate)
                .get();
        } catch (dbErr) {
            console.error("Lỗi Firestore Query:", dbErr);
            throw new Error("Lỗi truy vấn Database: " + dbErr.message + "\n(Nếu do thiếu Index, hãy nhấn F12 mở Console để bấm vào link tạo Index của Firebase)");
        }

        console.log(`-> Tìm thấy ${snap.size} lượt khám trong Database.`);

        if (snap.empty) {
            throw new Error(`Không có dữ liệu lượt khám nào từ ngày ${startInput} đến ${endInput}. Hãy chọn khoảng thời gian khác có dữ liệu khám!`);
        }

        // BƯỚC 2: GOM NHÓM TRIỆU CHỨNG TRÊN RAM
        console.log("=== [3/5] ĐANG TỔNG HỢP TRIỆU CHỨNG ===");
        let symptomCounts = {};
        let totalVisits = snap.size;

        snap.forEach(doc => {
            const v = doc.data();
            if (v.symptom) {
                let symps = v.symptom.toLowerCase().split(/[,+\/]+|\s+và\s+/g);
                symps.forEach(s => {
                    let clean = s.trim();
                    if (clean.length > 0) {
                        symptomCounts[clean] = (symptomCounts[clean] || 0) + 1;
                    }
                });
            }
        });

        let symptomSummaryText = Object.keys(symptomCounts)
            .map(k => `${k}: ${symptomCounts[k]} ca`)
            .join(", ");

        if (!symptomSummaryText) symptomSummaryText = "Không có mô tả triệu chứng chi tiết";

        // BƯỚC 3: GỬI REQUEST SANG AI SERVER (CLOUDFLARE WORKER)
        console.log("=== [4/5] ĐANG GỬI DỮ LIỆU SANG AI SERVER ===");
        
        const systemPrompt = `Bạn là chuyên gia Dịch tễ học học đường của THPT Võ Thị Sáu.
Dữ liệu lượt khám Y tế từ ${startInput} đến ${endInput}:
- Tổng số lượt khám: ${totalVisits} ca.
- Triệu chứng thống kê: ${symptomSummaryText}.

Nhiệm vụ: Phân tích nguy cơ bùng phát dịch bệnh tại trường học và trả về nội dung theo ĐÚNG định dạng HTML ngắn gọn (KHÔNG dùng markdown code block \`\`\`html, chỉ trả về code HTML thuần túy bọc trong <div class="ai-report-body">):

<div class="ai-report-body">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 15px;">
        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border-left: 4px solid [MÀU_HEX];">
            <strong style="color: #38bdf8;">1. Sốt xuất huyết:</strong> <br>
            Nguy cơ: <span style="font-weight:bold; color:[MÀU_HEX]">[Thấp/Trung bình/Cao]</span>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border-left: 4px solid [MÀU_HEX];">
            <strong style="color: #38bdf8;">2. Cúm & Hô hấp:</strong> <br>
            Nguy cơ: <span style="font-weight:bold; color:[MÀU_HEX]">[Thấp/Trung bình/Cao]</span>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border-left: 4px solid [MÀU_HEX];">
            <strong style="color: #38bdf8;">3. Đau mắt đỏ:</strong> <br>
            Nguy cơ: <span style="font-weight:bold; color:[MÀU_HEX]">[Thấp/Trung bình/Cao]</span>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border-left: 4px solid [MÀU_HEX];">
            <strong style="color: #38bdf8;">4. Các bệnh khác:</strong> <br>
            Nguy cơ: <span style="font-weight:bold; color:[MÀU_HEX]">[Thấp/Trung bình/Cao]</span>
        </div>
    </div>
    <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; font-size: 0.9rem; line-height: 1.6;">
        <strong style="color: #f59e0b;"><i class="fas fa-exclamation-triangle"></i> Đánh giá & Đề xuất:</strong>
        <p style="margin: 5px 0 0 0; color: #e2e8f0;">[Nhận xét ngắn gọn 2-3 câu và 3 hành động phòng ngừa cho Phòng Y Tế]</p>
    </div>
</div>

Lưu ý MÀU_HEX: Thấp = #10b981 (Xanh), Trung bình = #f59e0b (Vàng), Cao = #ef4444 (Đỏ).`;

        const AI_SERVER_URL = "https://vts-health-ai.yte-thptvothisaubrvt.workers.dev";
        let response;
        try {
            response = await fetch(AI_SERVER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt }] }]
                })
            });
        } catch (netErr) {
            throw new Error("Không thể kết nối đến AI Server Worker (" + AI_SERVER_URL + "). Kiểm tra kết nối mạng hoặc Cloudflare Worker!");
        }

        if (!response.ok) {
            throw new Error(`AI Server trả về lỗi HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("-> AI Response Raw Data:", data);

        if (data.error) {
            throw new Error("Lỗi từ AI API: " + (data.error.message || JSON.stringify(data.error)));
        }

        let aiHTML = "";
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            aiHTML = data.candidates[0].content.parts[0].text;
        } else if (data.choices && data.choices[0]) {
            aiHTML = data.choices[0].message.content;
        } else {
            throw new Error("Dữ liệu AI trả về không đúng cấu trúc mong đợi!");
        }

        // Lọc sạch thẻ markdown bọc
        aiHTML = aiHTML.replace(/```html/g, '').replace(/```/g, '').trim();

        // BƯỚC 4: LƯU VÀO FIRESTORE
        console.log("=== [5/5] ĐANG LƯU KẾT QUẢ VÀO FIRESTORE ===");
        const activeUser = firebase.auth().currentUser;
        
        try {
            await db.collection('yt_ai_predictions').add({
                rangeText: `${startInput} đến ${endInput}`,
                totalVisits: totalVisits,
                symptomSummary: symptomSummaryText,
                aiResultHTML: aiHTML,
                createdByName: activeUser ? (activeUser.displayName || activeUser.email) : 'Admin',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (saveErr) {
            throw new Error("Lỗi lưu vào bộ nhớ Firestore ('yt_ai_predictions'): " + saveErr.message + "\n(Vui lòng kiểm tra Firebase Security Rules)");
        }

        safeAlert("Đã phân tích và lưu dự đoán AI thành công!", "success");
        window.loadSavedAIPredictions(); // Tải lại danh sách

    } catch (err) {
        console.error("❌ LỖI TIẾN TRÌNH DỰ ĐOÁN AI:", err);
        alert("❌ LỖI PHÂN TÍCH AI:\n\n" + err.message);
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
        if (loadingBox) loadingBox.style.display = 'none';
    }
};

// 2. Hàm tải danh sách đã lưu
window.loadSavedAIPredictions = function() {
    const container = document.getElementById('ai-predictions-history-container');
    if (!container) return;

    db.collection('yt_ai_predictions')
        .orderBy('timestamp', 'desc')
        .limit(5)
        .onSnapshot(snap => {
            if (snap.empty) {
                container.innerHTML = `<p style="color: #94a3b8; text-align: center; margin: 20px 0;">Chưa có bản dự đoán nào được lưu. Bấm nút "Phân tích & Dự đoán bằng AI" để tạo mới.</p>`;
                return;
            }

            let html = '';
            snap.forEach(doc => {
                const d = doc.data();
                const timeStr = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString('vi-VN') : 'Mới tạo';

                html += `
                    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 18px; margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                            <div>
                                <span style="color: #38bdf8; font-weight: bold; font-size: 0.95rem;">📅 Dữ liệu: ${d.rangeText}</span>
                                <span style="color: #94a3b8; font-size: 0.8rem; margin-left: 8px;">(${d.totalVisits} lượt khám)</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="color: #64748b; font-size: 0.75rem;"><i class="far fa-clock"></i> ${timeStr}</span>
                                <button onclick="deleteAIPrediction('${doc.id}')" title="Xóa bản dự đoán này" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 0.8rem;">
                                    <i class="fas fa-trash"></i> Xóa
                                </button>
                            </div>
                        </div>
                        <div>${d.aiResultHTML}</div>
                    </div>
                `;
            });

            container.innerHTML = html;
        }, err => {
            console.error("Lỗi nạp danh sách dự đoán AI:", err);
        });
};

// 3. Hàm xóa dự đoán AI
window.deleteAIPrediction = async function(docId) {
    const isOk = confirm("Bạn có chắc chắn muốn xóa bản dự đoán nguy cơ dịch bệnh này?");
    if (isOk) {
        try {
            await db.collection('yt_ai_predictions').doc(docId).delete();
            safeAlert("Đã xóa bản dự đoán!", "success");
        } catch (e) {
            safeAlert("Lỗi khi xóa: " + e.message, "error");
        }
    }
};

// 4. Lắng nghe tự động nạp lịch sử dự đoán khi vào trang
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        if (document.getElementById('ai-predictions-history-container')) {
            window.loadSavedAIPredictions();
        }
    }, 1000);
});
