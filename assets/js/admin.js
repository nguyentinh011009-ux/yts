// ========================================================
// HỆ THỐNG POPUP UI CONTROL
// ========================================================

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
