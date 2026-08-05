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
// AI DỰ ĐOÁN NGUY CƠ DỊCH BỆNH HỌC ĐƯỜNG (SỐT XUẤT HUYẾT, CÚM, ĐAU MẮT ĐỎ...)
// =========================================================================

// 1. Chạy phân tích AI dựa trên khoảng thời gian đang chọn
async function runAIPrediction() {
    const startInput = document.getElementById('stat-start').value;
    const endInput = document.getElementById('stat-end').value;

    if (!startInput || !endInput) {
        return sysAlert("Vui lòng chọn Từ ngày và Đến ngày ở bộ lọc trên trước khi bấm dự đoán!", "warning");
    }

    const startDate = new Date(startInput + "T00:00:00");
    const endDate = new Date(endInput + "T23:59:59");

    const btn = document.getElementById('btn-run-ai-predict');
    const loadingBox = document.getElementById('ai-predict-loading');
    const originalBtnText = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang thu thập dữ liệu...';
    btn.disabled = true;
    loadingBox.style.display = 'block';

    try {
        // Bước 1: Quét danh sách lượt khám trong khoảng thời gian
        const snap = await db.collection('yt_visits')
            .where('timestamp', '>=', startDate)
            .where('timestamp', '<=', endDate)
            .get();

        if (snap.empty) {
            sysAlert("Không có dữ liệu lượt khám nào trong khoảng thời gian này để AI phân tích!", "warning");
            return;
        }

        // Bước 2: Gom nhóm triệu chứng siêu gọn trên RAM để tiết kiệm Token gửi cho AI
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

        // Chuyển danh sách triệu chứng thành dạng text tóm tắt gọn gàng
        let symptomSummaryText = Object.keys(symptomCounts)
            .map(k => `${k}: ${symptomCounts[k]} ca`)
            .join(", ");

        // Bước 3: Tạo Prompt tối ưu cho AI Gemini
        const systemPrompt = `Bạn là chuyên gia Dịch tễ học học đường của Trường THPT Võ Thị Sáu.
Dựa trên dữ liệu tổng hợp lượt khám Y tế từ ${startInput} đến ${endInput}:
- Tổng số lượt khám: ${totalVisits} ca.
- Triệu chứng thống kê: ${symptomSummaryText}.

Nhiệm vụ: Phân tích nguy cơ bùng phát dịch bệnh tại trường học và trả về nội dung theo ĐÚNG định dạng HTML ngắn gọn (KHÔNG dùng markdown code block ```html, chỉ trả về code HTML thuần túy bọc trong <div class="ai-report-body">):

<div class="ai-report-body">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 15px;">
        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border-left: 4px solid [MÀU_HEX];">
            <strong style="color: #38bdf8;">1. Sốt xuất huyết:</strong> <br>
            Nguy cơ: <span style="font-weight:bold; color:[MÀU_HEX]">[Thấp/Trung bình/Cao]</span>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border-left: 4px solid [MÀU_HEX];">
            <strong style="color: #38bdf8;">2. Cúm & Bệnh hô hấp:</strong> <br>
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
        <strong style="color: #f59e0b;"><i class="fas fa-exclamation-triangle"></i> Đánh giá & Đề xuất hành động:</strong>
        <p style="margin: 5px 0 0 0; color: #e2e8f0;">[Nhận xét ngắn gọn 2-3 câu về tình hình dịch bệnh và 3 hành động phòng ngừa khuyến nghị cho Phòng Y Tế/Nhà trường]</p>
    </div>
</div>

Lưu ý: MÀU_HEX chọn theo mức độ nguy cơ: Thấp = #10b981 (Xanh), Trung bình = #f59e0b (Vàng), Cao = #ef4444 (Đỏ).`;

        // Bước 4: Gọi Cloudflare Worker AI Proxy
        const AI_SERVER_URL = "https://vts-health-ai.yte-thptvothisaubrvt.workers.dev";
        const response = await fetch(AI_SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message || "Lỗi phản hồi từ AI");

        let aiHTML = "";
        if (data.candidates && data.candidates[0]) {
            aiHTML = data.candidates[0].content.parts[0].text;
        } else if (data.choices && data.choices[0]) {
            aiHTML = data.choices[0].message.content;
        }

        // Lọc bỏ markdown bọc nếu AI lỡ viết
        aiHTML = aiHTML.replace(/```html/g, '').replace(/```/g, '').trim();

        // Bước 5: LƯU KẾT QUẢ DỰ ĐOÁN VÀO FIRESTORE
        const activeUser = firebase.auth().currentUser;
        await db.collection('yt_ai_predictions').add({
            rangeText: `${startInput} đến ${endInput}`,
            totalVisits: totalVisits,
            symptomSummary: symptomSummaryText,
            aiResultHTML: aiHTML,
            createdByName: activeUser ? (activeUser.displayName || activeUser.email) : 'Admin',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        sysAlert("AI đã phân tích và lưu kết quả dự đoán thành công!", "success");
        loadSavedAIPredictions(); // Tải lại danh sách dự đoán

    } catch (err) {
        console.error("Lỗi dự đoán AI:", err);
        sysAlert("Lỗi phân tích AI: " + err.message, "error");
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
        loadingBox.style.display = 'none';
    }
}

// 2. Tải và hiển thị danh sách dự đoán đã lưu từ Firestore
function loadSavedAIPredictions() {
    const container = document.getElementById('ai-predictions-history-container');
    if (!container) return;

    db.collection('yt_ai_predictions')
        .orderBy('timestamp', 'desc')
        .limit(5) // Tối đa 5 bản ghi mới nhất để tiết kiệm diện tích
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
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 12px;">
                            <div>
                                <span style="color: #38bdf8; font-weight: bold; font-size: 0.95rem;">📅 Dữ liệu từ: ${d.rangeText}</span>
                                <span style="color: #94a3b8; font-size: 0.8rem; margin-left: 10px;">(${d.totalVisits} lượt khám)</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="color: #64748b; font-size: 0.75rem;"><i class="far fa-clock"></i> ${timeStr}</span>
                                <button onclick="deleteAIPrediction('${doc.id}')" title="Xóa bản dự đoán này" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 0.8rem;">
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
            console.error("Lỗi tải lịch sử dự đoán:", err);
        });
}

// 3. Xóa bản dự đoán AI
async function deleteAIPrediction(docId) {
    const isOk = await sysConfirm("Bạn có chắc chắn muốn xóa bản dự đoán nguy cơ dịch bệnh này?", "Xóa dự đoán AI", true);
    if (isOk) {
        try {
            await db.collection('yt_ai_predictions').doc(docId).delete();
            sysAlert("Đã xóa bản dự đoán!", "success");
        } catch (e) {
            sysAlert("Lỗi khi xóa: " + e.message, "error");
        }
    }
}

// 4. Kích hoạt tải tự động khi chuyển sang Tab Thống Kê
const originalSwitchTabFunc = window.switchTab;
window.switchTab = function(tabId, btn) {
    if (typeof originalSwitchTabFunc === 'function') {
        originalSwitchTabFunc(tabId, btn);
    }
    if (tabId === 'tab-yte-thongke') {
        loadSavedAIPredictions();
    }
};
