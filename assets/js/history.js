let currentAdmin = null;

// 1. KIỂM TRA QUYỀN TRUY CẬP & TẢI KHÓA GIẢI MÃ SĐT
firebase.auth().onAuthStateChanged(async (user) => {
    const loader = document.getElementById('hist-auth-loading');
    const container = document.getElementById('hist-main-container');

    if (user && ALLOWED_ADMIN_EMAILS.includes(user.email)) {
        currentAdmin = user;
        loader.style.display = 'none';
        container.style.display = 'block';

        // 👉 Tải khóa giải mã E2EE trước khi kết xuất thông tin
        await loadMasterCryptoKey();

        // Khởi chạy các trình lắng nghe thời gian thực
        listenBedsStatus();
        listenTodayVisits();
    } else {
        alert("⛔ Bạn không có quyền truy cập trang giám sát này!");
        window.location.href = "index.html";
    }
});

// 2. LẮNG NGHE TRẠNG THÁI GIƯỜNG BỆNH THỜI GIAN THỰC
function listenBedsStatus() {
    const bedsRender = document.getElementById('mobile-beds-render');
    if (!bedsRender) return;

    db.collection('yt_beds').onSnapshot(snap => {
        let bedsData = {};
        snap.forEach(doc => { bedsData[doc.id] = doc.data(); });

        bedsRender.innerHTML = '';
        for (let i = 1; i <= 3; i++) {
            const bedId = `bed_${i}`;
            const b = bedsData[bedId];

            if (b) {
                // Giường đang có học sinh nằm
                bedsRender.innerHTML += `
                    <div class="mobile-bed-card occupied">
                        <div>
                            <div style="font-weight: bold; color: #ef4444; font-size: 1.05rem;"><i class="fas fa-bed"></i> Giường số ${i}</div>
                            <div style="font-size: 0.95rem; margin-top: 4px; color: #1e293b;">👤 <strong>${b.name}</strong> - Lớp: ${b.class}</div>
                        </div>
                        <button onclick="clearMobileBed(${i})" class="btn" style="background: #ef4444; color: white; padding: 6px 12px; font-size: 0.85rem; border-radius: 8px;">Trả giường</button>
                    </div>`;
            } else {
                // Giường trống
                bedsRender.innerHTML += `
                    <div class="mobile-bed-card empty">
                        <div>
                            <div style="font-weight: bold; color: #10b981; font-size: 1.05rem;"><i class="fas fa-check-circle"></i> Giường số ${i}</div>
                            <div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">Hiện tại đang trống</div>
                        </div>
                    </div>`;
            }
        }
    });
}

// Giải phóng giường bệnh di động
async function clearMobileBed(bedNum) {
    if (confirm(`Xác nhận giải phóng và trả giường số ${bedNum}?`)) {
        try {
            await db.collection('yt_beds').doc('bed_' + bedNum).delete();
        } catch (e) {
            alert("Lỗi trả giường: " + e.message);
        }
    }
}

// 3. LẮNG NGHE DANH SÁCH KHÁM HÔM NAY
function listenTodayVisits() {
    const visitsRender = document.getElementById('today-visits-render');
    if (!visitsRender) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Lọc từ 00:00 sáng nay

    db.collection('yt_visits').where('timestamp', '>=', todayStart).onSnapshot(snap => {
        visitsRender.innerHTML = '';
        if (snap.empty) {
            visitsRender.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;">Hôm nay chưa có học sinh nào khám bệnh.</div>';
            return;
        }

        let list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        // Sắp xếp thời gian mới nhất lên đầu
        list.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        list.forEach(v => {
            const time = v.timestamp ? new Date(v.timestamp.seconds * 1000).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '';
            
            // Xử lý nút báo phụ huynh
            let btnPH = `<button onclick="notifyParentMobile('${v.id}', '${v.studentId}')" class="btn" style="background:#fef3c7; color:#d97706; padding: 6px 12px; font-size: 0.85rem; font-weight: bold; border: 1px solid #fde68a;"><i class="fas fa-phone-alt"></i> Báo PH</button>`;
            if (v.notifiedParentAt) {
                const notiTime = new Date(v.notifiedParentAt.seconds * 1000).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
                btnPH = `<span style="color:#10b981; font-weight:bold; font-size:0.85rem;"><i class="fas fa-check-circle"></i> Đã báo ${notiTime}</span>`;
            }

            visitsRender.innerHTML += `
                <div style="background: white; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                    <div style="padding-right: 15px; flex: 1;">
                        <div style="font-size: 0.8rem; color: #64748b; font-weight: bold; margin-bottom: 5px;">📅 lúc ${time}</div>
                        <div style="font-size: 0.95rem; font-weight: bold; color: #1e293b;">${v.name} (${v.class})</div>
                        <div style="font-size: 0.85rem; color: #475569; margin-top: 4px;"><strong>Triệu chứng:</strong> ${v.symptom}</div>
                        <div style="font-size: 0.85rem; color: #059669; margin-top: 2px;"><strong>Xử lý:</strong> ${v.treatment}</div>
                    </div>
                    <div style="flex-shrink: 0;">
                        ${btnPH}
                    </div>
                </div>`;
        });
    });
}

// 4. CHỨC NĂNG BÁO PHỤ HUYNH TRÊN DI ĐỘNG (CÓ GIẢI MÃ SĐT E2EE)
async function notifyParentMobile(visitId, studentId) {
    let parentPhone = "Chưa cập nhật SĐT";
    let studentName = "Học sinh";

    if (studentId) {
        try {
            const studentDoc = await db.collection('yt_students').doc(studentId).get();
            if (studentDoc.exists) {
                const data = studentDoc.data();
                studentName = data.name || studentName;
                // 👉 GIẢI MÃ SĐT PHỤ HUYNH TRƯỚC KHI HIỂN THỊ LÊN MOBILE DI ĐỘNG
                if (data.parentPhone) parentPhone = decryptField(data.parentPhone);
            }
        } catch (err) {
            console.error("Lỗi lấy hồ sơ học sinh di động: ", err);
        }
    }

    const confirmMessage = `📞 SỐ ĐIỆN THOẠI PHỤ HUYNH:\n👤 Học sinh: ${studentName}\n👉 Số điện thoại: ${parentPhone}\n\nSau khi gọi điện xong, nhấn "OK" để xác nhận đã báo cho Phụ huynh học sinh!`;

    if (confirm(confirmMessage)) {
        try {
            await db.collection('yt_visits').doc(visitId).update({
                notifiedParentAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Tự động đẩy thông báo báo gọi PH lên app của học sinh
            try {
                const now = new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                await db.collection('yt_notifications').add({
                    title: "Xác nhận Liên lạc Phụ huynh",
                    content: `Phòng Y tế đã liên lạc với Phụ huynh của bạn lúc ${now} trên điện thoại để thông báo về tình hình sức khỏe.`,
                    targetType: "student",
                    targetValue: studentId,
                    sender: "Phòng Y Tế",
                    relatedVisitId: visitId,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (err) {
                console.error("Lỗi gửi thông báo gọi PH di động:", err);
            }
        } catch (err) {
            alert("❌ Lỗi cập nhật trạng thái: " + err.message);
        }
    }
}
// 👉 BỘ LỌC CHẶN VĂNG SAFARI TRÊN DI ĐỘNG (GIỮ APP LUÔN CHẠY TRONG PWA)
if (("standalone" in window.navigator) && window.navigator.standalone) {
    document.addEventListener('click', function(e) {
        let target = e.target;
        while (target && target.nodeName !== 'A') {
            target = target.parentNode;
        }
        if (target && target.href && !target.target && target.hostname === window.location.hostname) {
            e.preventDefault();
            window.location.href = target.href; // Quay về ngầm bên trong App
        }
    }, false);
}