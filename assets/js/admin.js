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
        sysLoading(true, "Đang dọn dẹp bộ nhớ đệm & Làm mới dữ liệu...");
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
