/* APP CORE LOGIC - YTESO
   Xử lý: Firebase, CRUD, Slider, Auth, Search
*/
// --- CẤU HÌNH CLOUDINARY & CKEDITOR ---
const CLOUDINARY_CONFIG = {
    cloudName: 'uq7hr3wp', // Điền Cloud Name của bạn (Ví dụ lấy từ Cloudinary hiện tại)
    uploadPreset: 'yte_thptvothisau' // Tên Unsigned Upload Preset tạo trên Cloudinary Dashboard
};

// --- 1. KHỞI TẠO BIẾN TOÀN CỤC ---
let sliderInterval = null;
let allPosts = [];
let currentNotiFilter = 'all';
let cachedNotifications = [];
let notiFirebaseListener = null;
// --- 2. HỆ THỐNG ĐĂNG NHẬP & BẢO MẬT ---
// Hàm chuyển đổi tiếng Việt có dấu thành không dấu để tìm kiếm
function removeVietnameseTones(str) {
    if (!str) return "";
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str.toLowerCase();
}
// ==========================================
// PHẦN. HỆ THỐNG XÁC THỰC (FIREBASE AUTH)
// ==========================================
window.currentUserRole = 'none'; // Biến lưu vai trò hiện tại: 'admin' | 'collaborator' | 'none'
window.userAllowedTabs = [];      // Danh sách các Tab được cấp quyền

firebase.auth().onAuthStateChanged(async (user) => {
    
    // 1. LOGIC XỬ LÝ THANH HEADER (Áp dụng cho mọi trang có dùng chung Header)
    const topProfileBox = document.getElementById('top-user-profile');
    if (topProfileBox) {
        if (user) {
            topProfileBox.style.display = 'flex';
            const topUserName = document.getElementById('top-user-name');
            const topUserAvatar = document.getElementById('top-user-avatar');
            
            if (topUserName) {
                topUserName.innerText = user.displayName || user.email.split('@')[0];
            }
            if (topUserAvatar && user.photoURL) {
                topUserAvatar.src = user.photoURL;
            }
        } else {
            topProfileBox.style.display = 'none';
        }
    }

    // 2. LOGIC BẢO MẬT & PHÂN QUYỀN (Áp dụng khi ở trang Admin)
    const loginOverlay = document.getElementById('login-overlay');
    const dashboard = document.getElementById('admin-dashboard');
    
    if (loginOverlay || dashboard) {
        if (user) {
            const userEmail = user.email.toLowerCase();

            // LỚP 1: KIỂM TRA XEM CÓ PHẢI SUPER ADMIN KHÔNG
            const isSuperAdmin = ALLOWED_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(userEmail);

            if (isSuperAdmin) {
                // --- TRƯỜNG HỢP A: SUPER ADMIN (TOÀN QUYỀN) ---
                window.currentUserRole = 'admin';
                window.userAllowedTabs = ['ALL'];

                await loadMasterCryptoKey();
                checkAndExecuteAutoBackup();

                if (loginOverlay) loginOverlay.style.display = 'none';
                if (dashboard) {
                    dashboard.style.display = 'grid'; 
                    
                    // Hiển thị đầy đủ tất cả các tab trên Sidebar
                    showAllSidebarTabs();

                    loadAdminPosts();
                    loadPharmacyForReception();
					loadDashboardData();
                    loadAdminAnnouncements();
                    loadFusoftxNotis();
                    runDailyStatisticAggregation();

                    updateAdminDisplayInfo(user, "Admin");
                }
            } else {
					// --- TRƯỜNG HỢP B: KIỂM TRA QUYỀN CỘNG TÁC VIÊN ---
					try {
					    sysLoading(true, "Đang xác thực quyền...");
					    
					    const collabSnap = await db.collection("yt_collaborators")
					        .where("email", "==", userEmail)
					        .get();
					
					    if (!collabSnap.empty) {
					        const collabData = collabSnap.docs[0].data();
					        const todayStr = new Date().toISOString().split('T')[0];
					
					        // 1. Kiểm tra trạng thái Khóa tài khoản
					        if (collabData.status !== 'active') {
					            sysLoading(false);
					            sysAlert("⛔ Tài khoản của bạn đã bị TẠM KHÓA!", "error");
					            firebase.auth().signOut();
					            return;
					        }
					
					        // 2. Kiểm tra Hạn sử dụng
					        if (collabData.expiryDate && collabData.expiryDate < todayStr) {
					            sysLoading(false);
					            sysAlert(`⛔ Tài khoản đã HẾT HẠN vào ngày ${collabData.expiryDate}!`, "error");
					            firebase.auth().signOut();
					            return;
					        }
					
					        // 3. NẾU LÀ GVCN HOẶC QUẢN SINH: TỪ CHỐI TRUY CẬP TRANG ADMIN (VÌ ĐÃ CÓ APP RIÊNG)
					        const role = collabData.role || 'collaborator';
					        if (role === 'quansinh' || role === 'gvcn') {
					            sysLoading(false);
					            sysAlert("⛔ Tài khoản này dành cho GVCN/Quản sinh trên App Điểm danh (Không có quyền vào trang Admin)!", "error");
					            firebase.auth().signOut();
					            if (loginOverlay) loginOverlay.style.display = 'flex';
					            if (dashboard) dashboard.style.display = 'none';
					            return;
					        }
					
					        // 4. NẾU LÀ CỘNG TÁC VIÊN QUẢN TRỊ ADMIN (Thao tác trên trang Admin)
					        window.currentUserRole = 'collaborator';
					        window.userAllowedTabs = collabData.allowedTabs || [];
					
					        await loadMasterCryptoKey();
					
					        if (loginOverlay) loginOverlay.style.display = 'none';
					        if (dashboard) {
					            dashboard.style.display = 'grid';
					            applyCollaboratorPermissions(window.userAllowedTabs);
					            loadAdminPosts();
					            loadPharmacyForReception();
								loadDashboardData();
					            loadAdminAnnouncements();
					            loadFusoftxNotis();
					            runDailyStatisticAggregation();
					            updateAdminDisplayInfo(user, `CTV: ${collabData.name}`);
					        }
					        sysLoading(false);
					    } else {
					        // Email không thuộc Admin lẫn Cộng tác viên -> Đăng xuất và báo lỗi
					        sysLoading(false);
					        sysAlert(`⛔ BẢO MẬT HỆ THỐNG:\n\nTài khoản (${user.email}) không có quyền truy cập trang Quản trị!`, "error");
					        firebase.auth().signOut();
					        if (loginOverlay) loginOverlay.style.display = 'flex';
					        if (dashboard) dashboard.style.display = 'none';
					    }
					} catch (err) {
					    sysLoading(false);
					    sysAlert("Lỗi kiểm tra quyền truy cập: " + err.message, "error");
					    firebase.auth().signOut();
					    if (loginOverlay) loginOverlay.style.display = 'flex';
					    if (dashboard) dashboard.style.display = 'none';
					}
			}
        } else {
            // Chưa đăng nhập -> Hiện form Đăng nhập
            if (loginOverlay) loginOverlay.style.display = 'flex';
            if (dashboard) dashboard.style.display = 'none';
        }
    }
});

// Hàm phụ trợ cập nhật tên & avatar hiển thị góc trái Sidebar
function updateAdminDisplayInfo(user, roleTitle) {
    const nameDisplay = document.getElementById('display-admin-name');
    const emailDisplay = document.getElementById('display-admin-email');
    const avatarDisplay = document.getElementById('display-admin-avatar');

    if (emailDisplay) emailDisplay.innerText = user.email;
    if (nameDisplay) nameDisplay.innerText = `${user.displayName || user.email.split('@')[0]} (${roleTitle})`;
    
    if (avatarDisplay) {
        if (user.photoURL) {
            avatarDisplay.src = user.photoURL.replace("s96-c", "s120-c"); 
        } else {
            avatarDisplay.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || roleTitle)}&background=0062ff&color=fff&bold=true`;
        }
    }
}
// Hàm hỗ trợ nạp dữ liệu chung khi vào Dashboard thành công
function initAdminDashboardView(user, roleTitle) {
    loadAdminPosts();
    loadPharmacyForReception();
    loadAdminAnnouncements();
    loadFusoftxNotis();
    runDailyStatisticAggregation();

    const nameDisplay = document.getElementById('display-admin-name');
    const emailDisplay = document.getElementById('display-admin-email');
    if (emailDisplay) emailDisplay.innerText = user.email;
    if (nameDisplay) nameDisplay.innerText = `${user.displayName || user.email.split('@')[0]} (${roleTitle})`;
}

// Hàm hiển thị lại toàn bộ Menu cho Super Admin
function showAllSidebarTabs() {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.style.display = 'flex');
}

// Hàm ẩn hoàn toàn các Tab và Nút Sidebar mà Cộng tác viên không được cấp quyền
function applyCollaboratorPermissions(allowedTabs) {
    // Lặp qua tất cả các nút/thẻ liên kết trong sidebar
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick') || '';
        const hrefAttr = btn.getAttribute('href') || '';
        
        // Nếu là nút kích hoạt Tab
        const match = onclickAttr.match(/switchTab\('([^']+)'/);
        if (match) {
            const matchedTab = match[1];
            // Luôn ẩn tab Quản lý CTV và Cài đặt tài khoản khỏi CTV trừ khi được Admin cho phép
            if (matchedTab === 'tab-collaborators') {
                btn.style.display = 'none';
            } else if (allowedTabs.includes(matchedTab)) {
                btn.style.display = 'flex';
            } else {
                btn.style.display = 'none';
            }
        } 
        // Nếu là đường link chuyển trang độc lập (Kho dược, Điểm danh, Hệ thống...)
        else if (hrefAttr && !hrefAttr.includes('javascript:')) {
            // Khóa các trang hệ thống quan trọng đối với CTV
            if (hrefAttr.includes('system.html') || hrefAttr.includes('ai_memory.html')) {
                btn.style.display = 'none';
            } else {
                btn.style.display = 'flex';
            }
        }
    });

    // Tự động mở Tab đầu tiên mà Cộng tác viên có quyền
    if (allowedTabs.length > 0) {
        switchTab(allowedTabs[0]);
    }
}
// Hàm 1: handleEmailLogin
function handleEmailLogin() {
    const email = document.getElementById('admin-email-input').value.trim();
    const password = document.getElementById('admin-pass-input').value;

    if (!email || !password) return sysAlert("Vui lòng nhập đầy đủ Email và Mật khẩu!", "error");

    sysLoading(true, "Đang kiểm tra thông tin..."); // Bật loading
    
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            writeAuditLog("LOGIN", "yt_auth", userCredential.user.uid, `Tài khoản ${email} đăng nhập hệ thống.`);
            sysLoading(false); // Tắt loading
            sysAlert("Đăng nhập thành công!", "success");
        })
        .catch((error) => {
            sysLoading(false);
            if(error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                sysAlert("Sai Email hoặc Mật khẩu!", "error");
            } else if (error.code === 'auth/invalid-email') {
                sysAlert("Định dạng Email không hợp lệ!", "error");
            } else {
                sysAlert("Lỗi đăng nhập: " + error.message, "error");
            }
        });
}

// --- Hàm 2: Đăng nhập bằng Google ---
function handleGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const btn = document.getElementById('btn-login-google');
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang kết nối...';
    btn.disabled = true;

    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            // Để onAuthStateChanged tự động kiểm tra Admin / CTV và xử lý đăng nhập
            writeAuditLog("LOGIN", "yt_auth", result.user.uid, `Đăng nhập Google thành công: ${result.user.email}`);
        })
        .catch((error) => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            sysAlert("❌ Lỗi đăng nhập Google: " + error.message, "error");
        });
}
// --- Hàm 3: Đăng xuất ---
async function handleLogout() {
    const isConfirm = await sysConfirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?", "Đăng xuất", true);
    if (isConfirm) {
        sysLoading(true, "Đang đăng xuất...");
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            await writeAuditLog("LOGOUT", "yt_auth", currentUser.uid, `Tài khoản Admin ${currentUser.email} đăng xuất.`);
        }
        sessionStorage.removeItem('vts_session_logged');
        firebase.auth().signOut().then(() => {
            document.getElementById('admin-email-input').value = '';
            document.getElementById('admin-pass-input').value = '';
            sysLoading(false);
        });
    }
}
// Các biến bổ sung cho bộ lọc danh sách bài viết
let cachedAdminPosts = [];
let currentPostFilter = 'all';

// Hàm thay đổi trạng thái bộ lọc (Yêu cầu 3)
function changePostFilter(filterType) {
    currentPostFilter = filterType;
    
    const filters = ['all', 'pinned', 'regular'];
    filters.forEach(f => {
        const btn = document.getElementById(`btn-post-flt-${f}`);
        if (btn) {
            if (f === filterType) {
                btn.style.background = '#0062ff';
                btn.style.color = 'white';
                btn.style.borderColor = '#0062ff';
            } else {
                btn.style.background = 'white';
                btn.style.color = '#64748b';
                btn.style.borderColor = '#cbd5e1';
            }
        }
    });
    
    renderAdminPostsTable();
}
// Hàm tạo sẵn Mẫu bài viết kèm CSS chuyên nghiệp
function getDefaultArticleTemplate(themeColor = '#0062ff', title = 'TIÊU ĐỀ BÀI VIẾT TẠI ĐÂY') {
    return `<div class="vts-article-container">
<style>
.vts-article-container {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.8;
    color: #2c3e50;
    max-width: 1000px;
    margin: 0 auto;
    padding: 10px;
}
.vts-article-container h1 {
    color: ${themeColor}; /* 🎨 MÀU CHỦ ĐỀ CHÍNH */
    font-size: clamp(20px, 4vw, 28px);
    border-bottom: 2px solid ${themeColor};
    padding-bottom: 8px;
    margin-bottom: 15px;
    font-weight: bold;
}
.vts-article-container h2 {
    color: #1e293b;
    font-size: clamp(17px, 3vw, 22px);
    margin-top: 25px;
    margin-bottom: 10px;
}
.vts-article-container p, .vts-article-container li {
    font-size: 16px;
    margin: 10px 0;
}
.vts-article-container .highlight-box {
    background-color: #f0f7ff;
    border-left: 5px solid ${themeColor};
    padding: 14px 18px;
    border-radius: 6px;
    margin: 18px 0;
    font-weight: 500;
}
.vts-article-container .important-box {
    background-color: #fff1f2;
    border-left: 5px solid #ef4444;
    padding: 14px 18px;
    border-radius: 6px;
    margin: 18px 0;
    color: #991b1b;
}

/* 🎨 BỔ SUNG CSS HIỆU ỨNG BẤM VÀO ẢNH ĐỂ PHÓNG TO */
.vts-article-container a.vts-img-zoom-link {
    display: block;
    width: 100%;
    text-align: center;
    text-decoration: none;
    transition: transform 0.25s ease, filter 0.25s ease;
    margin: 15px 0;
}
.vts-article-container a.vts-img-zoom-link:hover {
    transform: scale(1.015);
    filter: brightness(1.03);
}
.vts-article-container img {
    width: 100%;
    max-width: 1000px;
    border-radius: 10px;
    margin: 15px auto;
    display: block;
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}
</style>

<h1>${title}</h1>

<div class="highlight-box">
    📌 <strong>Tóm tắt / Thông điệp chính:</strong> Nhập nội dung tóm tắt quan trọng của bài viết vào đây...
</div>

<h2>1. Mục đầu tiên của bài viết</h2>
<p>Nhập nội dung chi tiết bài viết ở đây...</p>

<div class="important-box">
    ⚠️ <strong>Lưu ý quan trọng:</strong> Nội dung cảnh báo hoặc thông tin đặc biệt cần chú ý.
</div>

<h2>2. Mục tiếp theo</h2>
<p>Tiếp tục nhập nội dung bài viết...</p>
</div>`;
}
// --- 3. QUẢN LÝ BÀI VIẾT (CRUD) ---
function showPostEditor(postId = null) {
    switchTab('tab-post-editor');
    
    const startInit = window.initCKEditor || (typeof initCKEditor === 'function' ? initCKEditor : null);

    if (startInit) {
        startInit(() => {
            if (!postId) {
                // TRƯỜNG HỢP: THÊM BÀI VIẾT MỚI
                const modeTitle = document.getElementById('editor-mode-title');
                if (modeTitle) modeTitle.innerText = "Thêm bài viết mới";
                
                const editId = document.getElementById('edit-post-id');
                if (editId) editId.value = "";
                
                const pTitle = document.getElementById('p-title');
                if (pTitle) pTitle.value = "";
                
                const pCover = document.getElementById('p-cover');
                if (pCover) pCover.value = "";
                
                // 👉 TỰ ĐỘNG NẠP MẪU BÀI VIẾT CHUẨN CÓ SẴN CSS
                if (typeof setEditorContent === 'function') {
                    setEditorContent(getDefaultArticleTemplate('#0062ff', 'TIÊU ĐỀ BÀI VIẾT MỚI'));
                }

                const pPin = document.getElementById('p-pin');
                if (pPin) pPin.checked = false;

                const pUpdateTime = document.getElementById('p-update-time');
                if (pUpdateTime) pUpdateTime.checked = true;

                const lblUpdateTime = document.getElementById('lbl-update-time');
                if (lblUpdateTime) lblUpdateTime.style.display = 'none';
            }
        });
    } else {
        setTimeout(() => showPostEditor(postId), 200);
    }
}

function hidePostEditor() {
    switchTab('tab-posts');
}

async function savePost() {
    const contentData = getEditorContent(); // Lấy dữ liệu từ Tiptap
    const id = document.getElementById('edit-post-id').value;
    const data = {
        title: document.getElementById('p-title').value,
        cover: document.getElementById('p-cover').value,
        content: contentData,
        isPinned: document.getElementById('p-pin').checked
    };

    if (!data.title || !data.content) return sysAlert("Vui lòng nhập đủ Tiêu đề và Nội dung!", "warning");

    sysLoading(true, "Đang lưu bài viết...");
    try {
        if (id) {
            const shouldUpdateTime = document.getElementById('p-update-time').checked;
            if (shouldUpdateTime) data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("posts").doc(id).update(data);
            sysAlert("Đã cập nhật bài viết!", "success");
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("posts").add(data);
            sysAlert("Đã đăng bài mới thành công!", "success");
        }
        hidePostEditor();
    } catch (e) { 
        sysAlert("Lỗi khi lưu: " + e.message, "error"); 
    } finally {
        sysLoading(false);
    }
}

let adminPostsListener = null;

function loadAdminPosts() {
    const body = document.getElementById('admin-post-list-body');
    if (!body) return;
    
    // Hủy listener cũ nếu đã tồn tại trước khi tạo listener mới
    if (adminPostsListener) adminPostsListener();

    adminPostsListener = db.collection("posts").orderBy("createdAt", "desc").onSnapshot(snap => {
        cachedAdminPosts = [];
        snap.forEach(doc => {
            cachedAdminPosts.push({ id: doc.id, ...doc.data() });
        });
        renderAdminPostsTable();
    });
}

function renderAdminPostsTable() {
    const body = document.getElementById('admin-post-list-body');
    if (!body) return;
    body.innerHTML = '';
    
    // Lọc dữ liệu hiển thị (Yêu cầu 3)
    let filtered = cachedAdminPosts;
    if (currentPostFilter === 'pinned') {
        filtered = cachedAdminPosts.filter(p => p.isPinned);
    } else if (currentPostFilter === 'regular') {
        filtered = cachedAdminPosts.filter(p => !p.isPinned);
    }
    
    if (filtered.length === 0) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:#94a3b8;">Không có bài viết nào trong mục này.</td></tr>';
        return;
    }

    filtered.forEach(p => {
	const dateStr = (p.createdAt && p.createdAt.seconds) 
    ? new Date(p.createdAt.seconds * 1000).toLocaleDateString('vi-VN') 
    : 'Vừa xong';
        body.innerHTML += `
            <tr>
                <td>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <img src="${p.cover}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;">
                        <strong>${p.title}</strong>
                    </div>
                </td>
                <td>${p.isPinned ? '<span style="color:#f59e0b">📌 Đã ghim</span>' : '<span style="color:#94a3b8">Thường</span>'}</td>
                <td>${dateStr}</td>
                <td style="text-align:right;">
                    <button onclick="editPost('${p.id}')" class="btn" style="padding:8px; background:#f1f5f9; color:#0062ff;"><i class="fas fa-edit"></i></button>
                    <button onclick="deletePost('${p.id}')" class="btn" style="padding:8px; background:#fef2f2; color:#ef4444;"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

async function editPost(id) {
    showPostEditor(id);
    
    sysLoading(true, "Đang tải nội dung bài viết...");
    try {
        const doc = await db.collection("posts").doc(id).get();
        if (doc.exists) {
            const p = doc.data();
            
            // Gán thông tin cơ bản an toàn
            const modeTitle = document.getElementById('editor-mode-title');
            if (modeTitle) modeTitle.innerText = "Chỉnh sửa bài viết";
            
            const editId = document.getElementById('edit-post-id');
            if (editId) editId.value = id;
            
            const pTitle = document.getElementById('p-title');
            if (pTitle) pTitle.value = p.title || "";
            
            const pCover = document.getElementById('p-cover');
            if (pCover) pCover.value = p.cover || "";
            
            // Bơm nội dung vào Tiptap Editor
            if (typeof setEditorContent === 'function') {
                setEditorContent(p.content || "");
            }

            // KIỂM TRA AN TOÀN TRƯỚC KHÍ GÁN .checked (CHỐNG LỖI NULL)
            const pPin = document.getElementById('p-pin');
            if (pPin) pPin.checked = p.isPinned || false;

            const pUpdateTime = document.getElementById('p-update-time');
            if (pUpdateTime) pUpdateTime.checked = true;

            const lblUpdateTime = document.getElementById('lbl-update-time');
            if (lblUpdateTime) lblUpdateTime.style.display = 'flex';
        }
    } catch (e) {
        sysAlert("Lỗi tải bài viết: " + e.message, "error");
    } finally {
        sysLoading(false);
    }
}

async function deletePost(id) {
    // Dùng await sysConfirm để đợi người dùng bấm nút
    const isOk = await sysConfirm("Bạn có chắc chắn muốn xóa bài viết này không?", "Xóa bài viết", true);
    if (isOk) {
        sysLoading(true, "Đang xóa..."); // Bật Loading
        await db.collection("posts").doc(id).delete();
        sysLoading(false); // Tắt Loading
        sysAlert("Đã xóa bài viết!", "success"); // Báo thành công
    }
}

// --- 4. QUẢN LÝ THÔNG BÁO SLIDER ---
async function loadAdminAnnouncements() {
    const container = document.getElementById('announce-list-admin');
    if(!container) return;
    
    container.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>';
    
    // Đọc 1 lần lấy toàn bộ 4 slots thay vì gọi 4 lần riêng biệt
    const snap = await db.collection("announcements").get();
    let slotsData = {};
    snap.forEach(doc => slotsData[doc.id] = doc.data());

    container.innerHTML = '';
    for (let i = 1; i <= 4; i++) {
        const data = slotsData[`slot_${i}`] || { text: "", image: "", link: "" };
        container.innerHTML += `
            <div class="form-card">
                <h3>Thông báo #${i}</h3>
                <div class="input-group">
                    <label>Ảnh nền</label>
                    <input type="text" id="ann-img-${i}" value="${data.image || ''}" placeholder="Link ảnh...">
                </div>
                <div class="input-group">
                    <label>Tiêu đề ngắn</label>
                    <input type="text" id="ann-txt-${i}" value="${data.text || ''}" placeholder="Nội dung...">
                </div>
                <div class="input-group">
                    <label>Link liên kết</label>
                    <input type="text" id="ann-lnk-${i}" value="${data.link || ''}" placeholder="Khi bấm vào sẽ đi đâu?">
                </div>
                <button onclick="saveAnnouncement(${i})" class="btn btn-primary" style="width:100%; justify-content:center;">Cập nhật slot ${i}</button>
            </div>
        `;
    }
}

async function saveAnnouncement(slot) {
    const data = {
        image: document.getElementById(`ann-img-${slot}`).value,
        text: document.getElementById(`ann-txt-${slot}`).value,
        link: document.getElementById(`ann-lnk-${slot}`).value
    };
    await db.collection("announcements").doc(`slot_${slot}`).set(data);
    alert(`Đã cập nhật thông báo ${slot}!`);
}

// --- 5. HIỂN THỊ TRANG CHỦ & SLIDER (Đã chuyển sang index.js)

function switchTab(tabId, btn) {
    // BẢO MẬT: Chống Cộng tác viên tự gọi hàm switchTab mở tab cấm
    if (window.currentUserRole === 'collaborator' && window.userAllowedTabs.length > 0) {
        // Cho phép tab soạn thảo bài viết nếu có quyền tab-posts
        const isEditorAllowed = tabId === 'tab-post-editor' && window.userAllowedTabs.includes('tab-posts');
        
        if (!window.userAllowedTabs.includes(tabId) && !isEditorAllowed) {
            sysAlert("⛔ Bạn không có quyền truy cập vào chức năng này!", "error");
            return;
        }
    }

    // Ẩn tất cả các tab
    document.querySelectorAll('.tab-pane').forEach(tab => tab.style.display = 'none');
    // Bỏ trạng thái active của tất cả nút
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));

    // Hiện tab được chọn
    const target = document.getElementById(tabId);
    if (target) {
        target.style.display = 'block';
        if (btn) btn.classList.add('active');
    }

    window.scrollTo({ top: 0 }); 
    const mainContent = document.querySelector('.admin-main');
    if (mainContent) mainContent.scrollTop = 0;

    if (tabId === 'tab-yte-tracuu-admin') {
        adminLookupCache = null; 
        const lookupInput = document.getElementById('admin-lookup-input');
        if (lookupInput) lookupInput.value = '';
        const lookupResult = document.getElementById('admin-lookup-result');
        if (lookupResult) lookupResult.style.display = 'none';
    }

    // Tự động load dữ liệu khi vào tab tương ứng
    if (tabId === 'tab-posts') loadAdminPosts();
    if (tabId === 'tab-announce') loadAdminAnnouncements();
    if (tabId === 'tab-yte-giuong') loadBeds();
    if (tabId === 'tab-yte-dulieu') loadStudentData(); 
    if (tabId === 'tab-yte-yeucau') loadStudentTickets();
    if (tabId === 'tab-fusoftx') loadFusoftxTickets();
    if (tabId === 'tab-send-noti') loadAdminNotifications();
    if (tabId === 'tab-collaborators') loadCollaborators();
	if (tabId === 'tab-dashboard') loadDashboardData();
}
// --- 6. XỬ LÝ TRANG CHI TIẾT BÀI VIẾT LẺ ---
async function loadSinglePost() {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');
    
    const container = document.getElementById('post-detail-container');
    if(!postId || !container) return;

    try {
        const doc = await db.collection("posts").doc(postId).get();
        if (doc.exists) {
            const post = doc.data();
            // Đổi tiêu đề tab theo tên bài viết
            document.title = post.title; 
            
            const dateStr = post.createdAt ? new Date(post.createdAt.seconds*1000).toLocaleDateString('vi-VN') : 'Mới cập nhật';
            
            container.innerHTML = `
                <div class="fade-in" style="background:white; padding:40px; border-radius:var(--radius-lg); box-shadow:var(--shadow-md);">
                    <img src="${post.cover}" style="width:100%; max-height:400px; object-fit:cover; border-radius:10px; margin-bottom:30px;">
                    <h1 style="color:var(--primary); margin-bottom:10px; font-size: 2rem;">${post.title}</h1>
                    <div style="color:var(--text-gray); margin-bottom:30px; font-size:0.9rem;">
                        <i class="far fa-clock"></i> Đăng ngày: ${dateStr}
                    </div>
                    <div style="font-size:1.1rem; line-height:1.8; color:var(--text-dark);">
                        ${post.content}
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `<div style="text-align:center; padding:50px;"><h2>Bài viết không tồn tại hoặc đã bị xóa.</h2><a href="index.html" class="btn btn-primary" style="margin-top:20px;">Về trang chủ</a></div>`;
        }
    } catch (error) {
        console.error("Lỗi khi tải bài viết:", error);
    }
}

// Kích hoạt hàm nếu đang ở trang post.html
if(window.location.pathname.includes('post.html')) {
    loadSinglePost();
}
// --- Y TẾ SỐ LOGIC ---
let signatureListener = null;

// Chuyển nhanh bằng Enter
function moveToNext(event, nextId) {
    if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById(nextId).focus();
    }
}

// ==================================================
// 1. TÌM KIẾM HỌC SINH CÓ SẴN (BẢN NÂNG CẤP THÔNG MINH)
// ==================================================
let ytStudentsCache = null;           
let currentSuggestIndex = -1;         
let selectedReceptionStudentId = null;

async function searchStudentSuggest(val) {
    const box = document.getElementById('yt-suggest-box');
    if (!val || val.trim().length < 2) { 
        box.style.display = 'none'; 
        selectedReceptionStudentId = null; 
        return; 
    }

    const students = await getStudentsList();

    const queryRaw = removeVietnameseTones(val.trim());
    const searchTerms = queryRaw.split(/\s+/);

    const matched = students.filter(st => {
        const dobFormatted = st.dob ? new Date(st.dob).toLocaleDateString('vi-VN') : '';
        const dobRaw = st.dob || '';
        const code = (st.studentCode || '').toLowerCase();

        const dataString = `${st.name_search} ${st.class.toLowerCase()} ${st.id.toLowerCase()} ${code} ${dobRaw} ${dobFormatted}`.toLowerCase();
        return searchTerms.every(term => dataString.includes(term));
    });

    box.innerHTML = '';
    currentSuggestIndex = -1;

    if (matched.length === 0) { 
        box.innerHTML = '<div style="padding:10px; color:#ef4444; font-size:0.85rem; text-align:center;">Không tìm thấy học sinh!</div>';
        box.style.display = 'block'; 
        return; 
    }

    const results = matched.slice(0, 10);
    results.forEach((d, index) => {
        const item = document.createElement('div');
        item.className = 'suggest-item';
        item.style.padding = '10px 15px';
        item.style.borderBottom = '1px solid #f1f5f9';
        item.style.cursor = 'pointer';
        item.style.transition = '0.15s';

        const dobDisplay = d.dob ? new Date(d.dob).toLocaleDateString('vi-VN') : 'Chưa có NS';
        const codeDisplay = d.studentCode ? ` | Mã HS: ${d.studentCode}` : '';

        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color:#0f172a; font-size:0.95rem;">${d.name}</strong> 
                <span style="color:#0062ff; font-weight:bold; font-size:0.85rem;">Lớp: ${d.class}</span>
            </div>
            <div style="font-size:0.8rem; color:#64748b; margin-top:3px; display:flex; justify-content:space-between;">
                <span><i class="fa-solid fa-calendar-days"></i> ${dobDisplay}${codeDisplay}</span>
                <span style="color:#059669; font-weight:600;">Mã Y tế: ${d.id}</span>
            </div>
        `;

        item.onmouseover = () => { currentSuggestIndex = index; updateSuggestHighlight(); };
        item.onclick = () => { selectSuggestedStudent(d); };
        box.appendChild(item);
    });
    box.style.display = 'block';
}

// 🔥 CẬP NHẬT LUÔN HÀM CHỌN HỌC SINH (NẰM NGAY BÊN DƯỚI):
function selectSuggestedStudent(student) {
    selectedReceptionStudentId = student.id;
    
    document.getElementById('yt-name').value = student.name;
    document.getElementById('yt-class').value = student.class;
    
    document.getElementById('yt-suggest-box').style.display = 'none';
    currentSuggestIndex = -1;
    
    checkStudentHistory();
    
    document.getElementById('yt-symptom').focus();
}
// 3. Hàm xử lý Sự kiện Bàn phím (Lên, Xuống, Enter)
function handleNameInputKeydown(event) {
    const box = document.getElementById('yt-suggest-box');
    const items = box.querySelectorAll('.suggest-item');

    // Nếu hộp gợi ý đang ẩn -> Hành vi Enter sẽ nhảy sang ô nhập Lớp như cũ
    if (box.style.display === 'none' || items.length === 0) {
        if (event.key === "Enter") {
            event.preventDefault();
            document.getElementById('yt-class').focus();
        }
        return;
    }

    // Bấm mũi tên XUỐNG
    if (event.key === "ArrowDown") {
        event.preventDefault();
        currentSuggestIndex++;
        if (currentSuggestIndex >= items.length) currentSuggestIndex = 0; // Kịch khung thì quay về đầu
        updateSuggestHighlight();
    }
    // Bấm mũi tên LÊN
    else if (event.key === "ArrowUp") {
        event.preventDefault();
        currentSuggestIndex--;
        if (currentSuggestIndex < 0) currentSuggestIndex = items.length - 1; // Lên kịch trần thì vòng xuống cuối
        updateSuggestHighlight();
    }
    // Bấm phím ENTER
    else if (event.key === "Enter") {
        event.preventDefault();
        if (currentSuggestIndex > -1 && currentSuggestIndex < items.length) {
            // Chọn đúng item đang được highlight
            items[currentSuggestIndex].click();
        } else {
            // Nếu chưa bấm mũi tên lên/xuống mà ấn Enter -> Tự động chọn luôn thằng ĐẦU TIÊN
            items[0].click();
        }
    }
}

// Hàm đổi màu thẻ đang được focus bằng bàn phím
function updateSuggestHighlight() {
    const box = document.getElementById('yt-suggest-box');
    const items = box.querySelectorAll('.suggest-item');
    items.forEach((item, index) => {
        if (index === currentSuggestIndex) {
            item.style.background = '#e0e7ff'; // Màu nền xanh nhạt khi highlight
        } else {
            item.style.background = 'white';
        }
    });
}

// 2. TẠO MÃ QR VÀ ĐỢI CHỮ KÝ (REALTIME)
async function startSignatureProcess() {
    const token = "SIGN_" + Date.now();
    const qrArea = document.getElementById('qr-area');
    const qrcodeDiv = document.getElementById('qrcode');
    const linkInput = document.getElementById('qr-link-input'); // Nơi hiển thị link
    
    qrcodeDiv.innerHTML = "";
    // Link tới trang ký tên (bạn sẽ tạo file sign.html riêng cho học sinh)
    const signUrl = `${window.location.origin}/sign.html?token=${token}`;
    if (linkInput) linkInput.value = signUrl;
    new QRCode(qrcodeDiv, { text: signUrl, width: 150, height: 150 });
    qrArea.style.display = 'block';

    // Lắng nghe chữ ký từ Firebase
    if (signatureListener) signatureListener();
    signatureListener = db.collection('temp_signatures').doc(token)
        .onSnapshot((doc) => {
            if (doc.exists && doc.data().status === 'done') {
                document.getElementById('signature-result').src = doc.data().img;
                document.getElementById('signature-result').style.display = 'block';
                document.getElementById('btn-final-save').style.display = 'block';
                document.getElementById('qr-status').innerText = "✅ Đã nhận được chữ ký!";
                document.getElementById('qrcode').style.opacity = "0.3";
            }
        });
}
// Hàm hỗ trợ Copy Link Ký Tên
function copySignLink() {
    const linkInput = document.getElementById('qr-link-input');
    linkInput.select();
    document.execCommand("copy");
    alert("✅ Sao chép thành công");
}
// LƯU LƯỢT TIẾP NHẬN & KIỂM TRA GIƯỜNG TRỐNG
// ==========================================
async function saveVisit(withSign) {
    const name = document.getElementById('yt-name').value.trim();
    const className = document.getElementById('yt-class').value.trim();
    const symptom = document.getElementById('yt-symptom').value.trim();
    const treatment = document.getElementById('yt-treatment').value.trim();
    const note = document.getElementById('yt-note').value.trim(); 
    const bed = document.getElementById('yt-bed').value;
    const signImg = withSign ? document.getElementById('signature-result').src : "";
    
    if(!name) return alert("❌ Cảnh báo: Vui lòng nhập Họ và Tên học sinh!");
    if(!className) return alert("❌ Cảnh báo: Vui lòng nhập Lớp!");
    if(!symptom) return alert("❌ Cảnh báo: Vui lòng nhập Triệu chứng của học sinh!");
    if(!treatment) return alert("❌ Cảnh báo: Vui lòng nhập Cách xử lý / Cấp thuốc!");

    sysLoading(true, "Đang lưu lượt tiếp nhận...");

    try {
        // KIỂM TRA TRẠNG THÁI GIƯỜNG
        if (bed) {
            const bedDoc = await db.collection('yt_beds').doc('bed_' + bed).get();
            if (bedDoc.exists) {
                const occupant = bedDoc.data();
                const allBedsSnap = await db.collection('yt_beds').get();
                let occupiedBeds = [];
                allBedsSnap.forEach(doc => occupiedBeds.push(doc.id.replace('bed_', '')));
                const emptyBeds = ['1', '2', '3'].filter(b => !occupiedBeds.includes(b));
                let suggestionMsg = emptyBeds.length > 0 ? `💡 Gợi ý: Các giường TRỐNG là: ${emptyBeds.join(', ')}.` : `⚠️ Hiện tại TẤT CẢ các giường đều đã kín chỗ.`;
                return alert(`❌ TỪ CHỐI TIẾP NHẬN:\n\nGiường số ${bed} hiện đang có học sinh ${occupant.name} sử dụng.\n\n${suggestionMsg}`);
            }
        }

        const mainBatch = db.batch();

        // ==============================================================
        // 1. TẠO HOẶC LẤY ID HỌC SINH (ĐÃ ĐƯỢC NÂNG CẤP CHỐNG TRÙNG TÊN)
        // ==============================================================
        let studentId = selectedReceptionStudentId; // 🔥 Ưu tiên dùng ID chính xác đã chọn từ gợi ý/máy quét

        if (!studentId) {
            // Nếu người dùng gõ tay hoàn toàn (không chọn từ gợi ý), kiểm tra database
            const hsSnap = await db.collection('yt_students')
                .where('name', '==', name)
                .where('class', '==', className)
                .get();

            if (hsSnap.empty) {
                // Chưa có học sinh nào -> Tạo mới hoàn toàn
               studentId = generateStudentId();
                const newHSRef = db.collection('yt_students').doc(studentId);
                mainBatch.set(newHSRef, {
                    id: studentId, 
                    name: encryptField(name), 
                    class: encryptField(className), 
                    name_search: encryptField(removeVietnameseTones(name)),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else if (hsSnap.size === 1) {
                // Chỉ có đúng 1 học sinh trùng tên + lớp -> Lấy luôn
                studentId = hsSnap.docs[0].id;
            } else {
                // Có TỪ 2 HỌC SINH TRỞ LÊN trùng tên + lớp -> Cảnh báo yêu cầu chọn đúng người
                sysLoading(false);
                return alert(`⚠️ CẢNH BÁO: Trong lớp ${className} có ${hsSnap.size} học sinh cùng tên "${name}".\n\nVui lòng chọn đúng học sinh từ danh sách gợi ý (dựa vào Ngày sinh / Mã HS) trước khi lưu!`);
            }
        }

        // 2. LƯU LƯỢT TIẾP NHẬN (VISIT)
        const visitRef = db.collection('yt_visits').doc();
        mainBatch.set(visitRef, {
            studentId: studentId, 
            name: encryptField(name), 
            class: encryptField(className), 
            symptom: encryptField(symptom), 
            treatment: encryptField(treatment), 
            note: encryptField(note), 
            sign: signImg ? encryptField(signImg) : "", 
            bed: bed || null, 
            status: bed ? "staying" : "completed",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. XỬ LÝ TRỪ KHO THUỐC (NẾU CÓ CẤP PHÁT)
        if (pendingMedicineDeductions.length > 0) {
            let batchUpdates = {}; 
            pendingMedicineDeductions.forEach(med => {
                const item = ytPharmacyCache.find(i => i.id === med.itemId);
                if(!batchUpdates[med.itemId]) batchUpdates[med.itemId] = JSON.parse(JSON.stringify(item.batches));
                batchUpdates[med.itemId][med.batchIndex].qty -= med.qty;
            });

            for (const [iId, newBatches] of Object.entries(batchUpdates)) {
                mainBatch.update(db.collection('yt_pharmacy_items').doc(iId), { batches: newBatches });
            }

            const txId = "XK-" + Date.now().toString().slice(-6);
            const txRef = db.collection('yt_pharmacy_transactions').doc(txId);
            const activeUser = firebase.auth().currentUser;
            
            mainBatch.set(txRef, {
                id: txId, 
                type: 'export', 
                receiver: `${name} (${className})`, 
                reason: "Cấp phát y tế tại phòng", 
                notes: `Kèm theo Lượt khám Y tế số ${visitRef.id}`, 
                items: pendingMedicineDeductions,
                user: activeUser ? (activeUser.displayName || activeUser.email) : 'Hệ thống',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // 4. LƯU THÔNG TIN GIƯỜNG
        if (bed) {
            const bedRef = db.collection('yt_beds').doc('bed_' + bed);
            mainBatch.set(bedRef, {
                name: name, class: className, visitId: visitRef.id, startTime: new Date()
            });
        }

        // 5. THỰC THI TOÀN BỘ DATA LÊN CLOUD
        await mainBatch.commit();

        // Gửi thông báo cho App học sinh
        try {
            await db.collection('yt_notifications').add({
                title: "Thông báo Lượt khám Y tế",
                content: `Bạn vừa được ghi nhận một lượt khám tại phòng Y tế.\n- Triệu chứng: ${symptom}\n- Xử lý: ${treatment}`,
                targetType: "student", 
                targetValue: studentId, 
                sender: "Phòng Y Tế", 
                relatedVisitId: visitRef.id,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch(e) { console.error("Lỗi gửi thông báo:", e); }

        sysAlert("Tiếp nhận thành công! " + (pendingMedicineDeductions.length > 0 ? "(Đã trừ kho thuốc)" : ""), "success");
        resetReceptionForm(); 
    } catch(err) {
        sysAlert("Lỗi khi lưu: " + err.message, "error");
    } finally {
        sysLoading(false);
    }
}
// ==========================================
// HÀM DỌN DẸP MÀN HÌNH SAU KHI TIẾP NHẬN XONG
function resetReceptionForm() {
	selectedReceptionStudentId = null;
    document.getElementById('yt-name').value = "";
    document.getElementById('yt-class').value = "";
    document.getElementById('yt-symptom').value = "";
    document.getElementById('yt-treatment').value = "";
    document.getElementById('yt-note').value = "";
    document.getElementById('yt-bed').value = "";

    document.getElementById('btn-quick-edit').style.display = 'none';
    currentReceptionStudent = null;
    const previewBox = document.getElementById('yt-history-preview');
    if (previewBox) previewBox.innerHTML = "Nhập tên và lớp để hệ thống kiểm tra...";

    document.getElementById('qr-area').style.display = 'none';
    document.getElementById('qrcode').innerHTML = "";
    document.getElementById('qr-link-input').value = "";
    const sigResult = document.getElementById('signature-result');
    if (sigResult) { sigResult.src = ""; sigResult.style.display = 'none'; }
    const btnFinal = document.getElementById('btn-final-save');
    if (btnFinal) btnFinal.style.display = 'none';
    if (signatureListener) { signatureListener(); signatureListener = null; }

    // RESET PHẦN CẤP THUỐC
    document.getElementById('chk-cap-thuoc').checked = false;
    document.getElementById('medicine-section').style.display = 'none';
    document.getElementById('med-search-input').value = '';
    document.getElementById('med-batch-select').innerHTML = '<option value="">-- Trống --</option>';
    pendingMedicineDeductions = [];
    renderPendingMedicines();
    
    document.getElementById('yt-name').focus();
}
// 4. XUẤT FILE A3
// XUẤT BÁO CÁO (Đã hợp nhất và sửa lỗi xử lý ngày tháng)
async function exportMedicalData() {
    const startInput = document.getElementById('export-start').value;
    const endInput = document.getElementById('export-end').value;
    const year = document.getElementById('export-year').value;
    const classFilter = document.getElementById('export-class').value;

    if (!startInput || !endInput) return alert("Vui lòng chọn khoảng thời gian Từ ngày - Đến ngày!");

    const startDate = new Date(startInput + "T00:00:00");
    const endDate = new Date(endInput + "T23:59:59");

    try {
        const snapshot = await db.collection('yt_visits')
            .where('timestamp', '>=', startDate)
            .where('timestamp', '<=', endDate)
            .orderBy('timestamp', 'asc').get();

        let rows = "";
        snapshot.forEach(doc => {
            const v = doc.data();
            if (classFilter && v.class !== classFilter) return;
            
            let dateStr = "";
            if(v.timestamp) {
                // Xử lý cả 2 trường hợp timestamp của Firebase hoặc JS Date
                const dateObj = v.timestamp.toDate ? v.timestamp.toDate() : new Date(v.timestamp);
                dateStr = dateObj.toLocaleString('vi-VN');
            }
            
            rows += `
                <tr>
                    <td>${dateStr}</td>
                    <td>${v.name}</td>
                    <td>${v.class}</td>
                    <td>${v.symptom}</td>
                    <td>${v.treatment}</td>
                    <td style="text-align:center">${v.sign ? `<img src="${v.sign}" height="35">` : ''}</td>
                </tr>`;
        });

        const printArea = document.getElementById('print-section');
        printArea.style.display = 'block'; // Hiện tạm để in
        printArea.innerHTML = `
            <div class="print-header" style="text-align:center; margin-bottom:20px;">
                <h1 style="font-size: 20pt; text-transform:uppercase;">SỔ THEO DÕI SỨC KHỎE HỌC SINH NĂM HỌC ${year}</h1>
                <p>Từ ngày ${startDate.toLocaleDateString('vi-VN')} đến ngày ${endDate.toLocaleDateString('vi-VN')}</p>
            </div>
            <table class="print-table">
                <thead>
                    <tr>
                        <th>Thời gian</th><th>Họ và tên</th><th>Lớp</th><th>Triệu chứng</th><th>Xử lý</th><th>Ký tên</th>
                    </tr>
                </thead>
                <tbody>${rows || '<tr><td colspan="6" style="text-align:center;">Không có dữ liệu trong khoảng thời gian này</td></tr>'}</tbody>
            </table>
            <div class="print-footer" style="margin-top:20px; font-style:italic;">Dữ liệu xuất tự động từ hệ thống Y tế số | THPT Võ Thị Sáu.</div>
        `;
        
        window.print();
        
        // Ẩn lại sau khi in xong
        setTimeout(() => {
            printArea.style.display = 'none';
        }, 1000);
        
    } catch(e) {
        alert("Lỗi truy xuất dữ liệu in: " + e.message);
    }
}
// 1. Định nghĩa bộ nhớ đệm tập trung và biến phân trang trên RAM
window.allStudents = []; 
let displayedStudentCount = 50; // Số lượng hiển thị mặc định ban đầu
let currentFilteredStudents = [];
let isBulkMode = false;
//2. HÀM TẢI DỮ LIỆU TẬP TRUNG TÍCH HỢP BỘ NHỚ ĐỆM SIÊU TỐC (0MS)
async function getStudentsList() {
    // 1. Nếu đã có sẵn trong bộ nhớ RAM, trả về ngay lập tức
    if (window.allStudents && window.allStudents.length > 0) {
        return window.allStudents;
    }
    
    // 2. Thử đọc từ Bộ nhớ đệm của Trình duyệt (Session Storage)
    const cachedData = sessionStorage.getItem('vts_students_cache');
    if (cachedData) {
        window.allStudents = JSON.parse(cachedData);
        return window.allStudents;
    }

    // 3. Nếu chưa có đệm, tiến hành truy xuất từ Firestore (Chỉ chạy 1 lần đầu)
    const snapshot = await db.collection('yt_students').get();
    window.allStudents = [];
    snapshot.forEach(doc => {
        const d = doc.data();
        const decryptedName = d.name ? decryptField(d.name) : '';
        const decryptedClass = d.class ? decryptField(d.class) : '';
        window.allStudents.push({
            id: doc.id,
            ...d,
            name: decryptedName,
            class: decryptedClass,
            dob: d.dob ? decryptField(d.dob) : '',
            gender: d.gender ? decryptField(d.gender) : '',
            height: d.height ? decryptField(d.height) : '',
            weight: d.weight ? decryptField(d.weight) : '',
            phone: d.phone ? decryptField(d.phone) : '',
            parentPhone: d.parentPhone ? decryptField(d.parentPhone) : '',
            street: d.street ? decryptField(d.street) : '',
            linkedEmail: d.linkedEmail || '',
            name_search: removeVietnameseTones(decryptedName)
        });
    });

    // 4. Lưu dữ liệu vào Bộ nhớ đệm để các lần truy cập tiếp theo tải tức thì (0ms)
    sessionStorage.setItem('vts_students_cache', JSON.stringify(window.allStudents));
    return window.allStudents;
}
// 3. Hàm tải danh sách học sinh (Nạp mượt mà)
async function loadStudentData() {
    const list = document.getElementById('student-data-list');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Đang kết nối cơ sở dữ liệu y tế...</td></tr>';

    try {
        // Nạp từ cache dùng chung
        currentFilteredStudents = await getStudentsList(); 
        displayedStudentCount = 50; // Reset số lượng hiển thị về mặc định
        renderStudentTablePage();
    } catch (err) {
        list.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
    }
}

// 4. Hàm kết xuất dữ liệu theo trang sử dụng chuỗi đệm (HTML Buffer)
function renderStudentTablePage() {
    const list = document.getElementById('student-data-list');
    if (!list) return;

    const sliceData = currentFilteredStudents.slice(0, displayedStudentCount);
    let htmlBuffer = ''; // Dùng chuỗi tạm để ghi nhận HTML trong bộ nhớ

    sliceData.forEach(hs => {
        const maHocSinh = hs.studentCode ? hs.studentCode : '<span style="color:#cbd5e1; font-size:0.85rem;">Chưa có</span>';
        htmlBuffer += `
            <tr style="transition:0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td class="col-checkbox" style="display: ${isBulkMode ? 'table-cell' : 'none'};">
                    <input type="checkbox" class="student-checkbox" value="${hs.id}" data-class="${hs.class}" style="width: 18px; height: 18px; cursor: pointer;">
                </td>
                <td style="font-weight:bold; color:#0062ff;">${hs.id}</td>
                <td style="font-weight:600; color:#475569;">${maHocSinh}</td>
                <td>${hs.name}</td>
                <td>${hs.class}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <button class="btn-sm" onclick="viewHistory('${hs.id}', '${hs.name}')" style="background:#e0e7ff; color:#4338ca; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight: 500; white-space: nowrap;">
                            <i class="fas fa-history"></i> Lịch sử
                        </button>
                        <i class="fas fa-edit" style="color:#059669; cursor:pointer; font-size: 1.2rem;" onclick="editStudent('${hs.id}', '${hs.name}', '${hs.class}')"></i>
                        <i class="fas fa-trash-alt" style="color:#ef4444; cursor:pointer; font-size: 1.2rem;" onclick="deleteStudent('${hs.id}', '${hs.name}')"></i>
                    </div>
                </td>
            </tr>`;
    });

    // Chỉ gán vào DOM một lần duy nhất sau khi chạy xong vòng lặp
    list.innerHTML = htmlBuffer;

    // Xử lý hiển thị nút "Xem thêm"
    const loadMoreBox = document.getElementById('student-load-more-box');
    if (loadMoreBox) {
        if (displayedStudentCount < currentFilteredStudents.length) {
            loadMoreBox.style.display = 'block';
        } else {
            loadMoreBox.style.display = 'none';
        }
    }
}

// 5. Hàm xử lý khi người dùng nhấn "Xem thêm"
function loadMoreStudents() {
    displayedStudentCount += 50; 
    renderStudentTablePage();
}

// 6. Cập nhật lại bộ lọc tìm kiếm tương thích với cấu trúc phân trang mới
// 1. HÀM TƯƠNG THÍCH NGƯỢC (BACKWARD COMPATIBILITY WRAPPER)
// Giải quyết triệt để lỗi sập trang khi các tính năng khác gọi hàm hiển thị cũ
function renderStudentTable(data) {
    currentFilteredStudents = data || [];
    displayedStudentCount = 50; // Reset số lượng phân trang về 50
    renderStudentTablePage();
}

// 2. HÀM LỌC TÌM KIẾM HỌC SINH TÍCH HỢP HIỆU ỨNG XOAY TRÒN (LOADING SPINNER)
function filterStudentTable() {
    const btn = document.getElementById('btn-search-student');
    let originalHTML = '';

    // Tạo hiệu ứng xoay tròn trên nút bấm
    if (btn) {
        originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tìm...';
        btn.disabled = true;
    }

    // Trì hoãn nhẹ 250ms để tạo phản hồi thị giác tốt nhất và tránh treo trình duyệt
    setTimeout(() => {
        const keyword = removeVietnameseTones(document.getElementById('search-student-input').value);
        
        currentFilteredStudents = window.allStudents.filter(hs => 
            hs.name_search.includes(keyword) || 
            hs.class.toLowerCase().includes(keyword) || 
            hs.id.toLowerCase().includes(keyword) ||
            (hs.studentCode || '').toLowerCase().includes(keyword)
        );
        
        displayedStudentCount = 50; // Reset về trang đầu tiên
        renderStudentTablePage(); // Xuất kết quả ra bảng

        // Trả lại trạng thái ban đầu của nút bấm sau khi tìm xong
        if (btn) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    }, 250);
}
// ==========================================
// HỆ THỐNG XÓA HỒ SƠ (XÓA LẺ & XÓA TẬN GỐC)
// ==========================================

// 1. Hàm lõi: Quét và Xóa sạch "tận gốc" mọi dữ liệu liên quan đến học sinh
async function deleteStudentCompletely(sid) {
    // Dùng batch của Firebase để thực thi tất cả các lệnh xóa cùng 1 lúc (Nhanh và An toàn)
    const batch = db.batch();
    
    // --- BƯỚC 1: TÌM VÀ XÓA LỊCH SỬ KHÁM BỆNH ---
    const visitsSnap = await db.collection('yt_visits').where('studentId', '==', sid).get();
    visitsSnap.forEach(doc => batch.delete(doc.ref));

    // --- BƯỚC 2: TÌM VÀ XÓA LỊCH SỬ ĐIỂM DANH (NGHỈ HỌC) ---
    const attendanceSnap = await db.collection('yt_attendance').where('studentId', '==', sid).get();
    attendanceSnap.forEach(doc => batch.delete(doc.ref));

    // --- BƯỚC 3: TÌM VÀ XÓA YÊU CẦU HỖ TRỢ (TICKETS/HÒM THƯ) ---
    const ticketsSnap = await db.collection('yt_tickets').where('studentId', '==', sid).get();
    ticketsSnap.forEach(doc => batch.delete(doc.ref));
    // --- BƯỚC THÊM MỚI: TÌM VÀ XÓA HỒ SƠ KHÁM SỨC KHỎE ĐỊNH KỲ ---
    // (Nếu hệ thống của bạn sử dụng tên collection khác như 'yt_exam_results', vui lòng đổi tên cho khớp)
    const physicalExamsSnap = await db.collection('yt_physical_exams').where('studentId', '==', sid).get();
    physicalExamsSnap.forEach(doc => batch.delete(doc.ref));
    // --- BƯỚC 4: TÌM VÀ XÓA THÔNG BÁO ĐƯỢC GỬI CHO HỌC SINH NÀY ---
    // 4.1 - Xóa thông báo gửi RIÊNG cho 1 mình học sinh này
    const notiSingleSnap = await db.collection('yt_notifications').where('targetValue', '==', sid).get();
    notiSingleSnap.forEach(doc => batch.delete(doc.ref));

    // 4.2 - Xử lý thông báo gửi NHÓM (Nhiều người, trong đó có học sinh này)
    const notiArraySnap = await db.collection('yt_notifications').where('targetValue', 'array-contains', sid).get();
    notiArraySnap.forEach(doc => {
        // Không xóa cả bài thông báo (vì sẽ ảnh hưởng bạn khác), chỉ rút tên học sinh này ra khỏi danh sách nhận
        batch.update(doc.ref, {
            targetValue: firebase.firestore.FieldValue.arrayRemove(sid)
        });
    });

    // --- BƯỚC 5: GIẢI PHÓNG GIƯỜNG BỆNH (NẾU ĐANG NẰM) ---
    const bedsSnap = await db.collection('yt_beds').get();
    bedsSnap.forEach(doc => {
        // Nếu giường đang lưu trữ visitId của học sinh này (thông qua việc quét lại visitsSnap ở bước 1)
        const bedData = doc.data();
        if (bedData.visitId) {
            visitsSnap.forEach(visitDoc => {
                if (visitDoc.id === bedData.visitId) {
                    batch.delete(doc.ref); // Xóa giường trống
                }
            });
        }
    });

    // --- BƯỚC 6: XÓA HỒ SƠ GỐC CỦA HỌC SINH ---
    const studentRef = db.collection('yt_students').doc(sid);
    batch.delete(studentRef);

    // THỰC THI TOÀN BỘ CÁC LỆNH TRÊN TRONG 1 TÍCH TẮC
    await batch.commit();
    sessionStorage.removeItem('vts_students_cache');
    window.allStudents = [];
}
// 2. Hàm kích hoạt khi bấm nút THÙNG RÁC MÀU ĐỎ (Xóa 1 người)
async function deleteStudent(sid, name) {
    const displayName = name && name !== 'undefined' ? name : sid; 
    const isConfirm = await sysConfirm(`CẢNH BÁO: Xóa học sinh ${displayName} cùng toàn bộ LỊCH SỬ KHÁM. Hành động không thể hoàn tác.`, "Xóa dữ liệu vĩnh viễn", true);
    
    if (isConfirm) {
        sysLoading(true, "Đang xóa sạch dữ liệu...");
        try {
            await deleteStudentCompletely(sid);
            sysAlert("Đã xóa hoàn toàn hồ sơ học sinh!", "success");
            loadStudentData(); 
        } catch(e) {
            sysAlert("Lỗi khi xóa: " + e.message, "error");
        } finally {
            sysLoading(false);
        }
    }
}

// --- TÍNH NĂNG CHỌN NHIỀU (XÓA / LÊN LỚP HÀNG LOẠT) ---

// 1. Bật/Tắt chế độ hiển thị ô Checkbox và 2 nút chức năng
function toggleBulkMode() {
    isBulkMode = !isBulkMode;
    const toggleBtn = document.getElementById('btn-toggle-bulk');
    const deleteBtn = document.getElementById('btn-confirm-bulk-delete');
    const upgradeBtn = document.getElementById('btn-confirm-bulk-upgrade');
    const checkboxes = document.querySelectorAll('.col-checkbox');

    if (isBulkMode) {
        // Bật chế độ
        toggleBtn.innerHTML = '<i class="fas fa-times"></i> Hủy chọn';
        toggleBtn.style.background = '#fef2f2';
        toggleBtn.style.color = '#ef4444';
        deleteBtn.style.display = 'inline-flex';
        upgradeBtn.style.display = 'inline-flex';
        checkboxes.forEach(el => el.style.display = 'table-cell');
    } else {
        // Tắt chế độ
        toggleBtn.innerHTML = '<i class="fas fa-check-square"></i> Chọn nhiều';
        toggleBtn.style.background = '#e2e8f0';
        toggleBtn.style.color = '#475569';
        deleteBtn.style.display = 'none';
        upgradeBtn.style.display = 'none';
        checkboxes.forEach(el => el.style.display = 'none');
        
        // Bỏ tick toàn bộ
        document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = false);
        document.getElementById('check-all-students').checked = false;
    }
}

// 2. Checkbox: Chọn tất cả
function toggleCheckAllStudents(source) {
    const checkboxes = document.querySelectorAll('.student-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

// 3. THỰC THI: Xóa hàng loạt
async function executeBulkDelete() {
    const checkedBoxes = document.querySelectorAll('.student-checkbox:checked');
    if (checkedBoxes.length === 0) return sysAlert("Vui lòng tick chọn ít nhất 1 học sinh để xóa!", "warning");

    const studentIds = Array.from(checkedBoxes).map(cb => cb.value);
    const count = studentIds.length;

    const isConfirm = await sysConfirm(
        `⚠️ CẢNH BÁO: \n\nBạn sắp XÓA VĨNH VIỄN ${count} học sinh cùng toàn bộ lịch sử y tế liên quan.\nHành động này KHÔNG THỂ HOÀN TÁC. Bạn có chắc chắn thực hiện?`,
        "Xóa hàng loạt vĩnh viễn",
        true
    );

    if (!isConfirm) return;

    sysLoading(true, `Đang xử lý xóa ${count} hồ sơ...`);

    try {
        let batch = db.batch();
        let opCount = 0;

        // Hàm phụ trợ tự động commit khi batch đủ 400 lệnh (Giới hạn tối đa của Firestore là 500)
        const commitIfNeeded = async (force = false) => {
            if (opCount > 0 && (opCount >= 400 || force)) {
                await batch.commit();
                batch = db.batch();
                opCount = 0;
            }
        };

        // 1. TẢI TOÀN BỘ GIƯỜNG BỆNH NẰM 1 LẦN DUY NHẤT VÀO RAM
        const bedsSnap = await db.collection('yt_beds').get();
        const allBeds = [];
        bedsSnap.forEach(doc => allBeds.push({ id: doc.id, ...doc.data() }));

        let processedVisits = new Set();

        // 2. CHIA HỌC SINH THÀNH CÁC KHỐI NHỎ (MỖI KHỐI TỐI ĐA 10 HỌC SINH ĐỂ ĐÁP ỨNG QUY ĐỊNH FIRESTORE)
        const chunkSize = 10; 
        const chunks = [];
        for (let i = 0; i < studentIds.length; i += chunkSize) {
            chunks.push(studentIds.slice(i, i + chunkSize));
        }

        // 3. QUÉT THEO KHỐI VÀ CHẠY SONG SONG BẰNG PROMISE.ALL
        for (let idx = 0; idx < chunks.length; idx++) {
            const chunk = chunks[idx];
            
            // Chạy đồng thời 5 truy vấn gom nhóm cho 10 học sinh cùng lúc
            const [visitsSnap, attSnap, ticketsSnap, examsSnap, notiSnap] = await Promise.all([
                db.collection('yt_visits').where('studentId', 'in', chunk).get(),
                db.collection('yt_attendance').where('studentId', 'in', chunk).get(),
                db.collection('yt_tickets').where('studentId', 'in', chunk).get(),
                db.collection('yt_physical_exams').where('studentId', 'in', chunk).get(),
                db.collection('yt_notifications').where('targetValue', 'in', chunk).get()
            ]);

            // Gom lệnh xóa Visits
            visitsSnap.forEach(doc => {
                processedVisits.add(doc.id);
                batch.delete(doc.ref); opCount++;
            });

            // Gom lệnh xóa Attendance
            attSnap.forEach(doc => { batch.delete(doc.ref); opCount++; });

            // Gom lệnh xóa Tickets
            ticketsSnap.forEach(doc => { batch.delete(doc.ref); opCount++; });

            // Gom lệnh xóa Exams
            examsSnap.forEach(doc => { batch.delete(doc.ref); opCount++; });

            // Gom lệnh xóa Notifications
            notiSnap.forEach(doc => { batch.delete(doc.ref); opCount++; });

            // Gom lệnh xóa Hồ sơ gốc Học sinh
            chunk.forEach(sid => {
                batch.delete(db.collection('yt_students').doc(sid));
                opCount++;
            });

            // Kiểm tra và commit nếu đầy batch
            await commitIfNeeded();
        }

        // 4. GIẢI PHÓNG GIƯỜNG BỆNH (NẾU HỌC SINH ĐANG NẰM TRÊN CÁC VISITS BỊ XÓA)
        allBeds.forEach(bed => {
            if (bed.visitId && processedVisits.has(bed.visitId)) {
                batch.delete(db.collection('yt_beds').doc(bed.id));
                opCount++;
            }
        });

        // 5. COMMIT LẦN CUỐI CÙNG CHO CÁC LỆNH CÒN LẠI
        await commitIfNeeded(true);

        // Xóa đệm bộ nhớ RAM & Trình duyệt
        sessionStorage.removeItem('vts_students_cache');
        window.allStudents = [];

        sysAlert(`Hoàn tất! Đã xóa ${count} hồ sơ!`, "success");
        toggleBulkMode();
        loadStudentData();

    } catch (e) {
        console.error("Bulk Delete Error:", e);
        sysAlert("Lỗi khi xóa hàng loạt: " + e.message, "error");
    } finally {
        sysLoading(false);
    }
}

// 4. THỰC THI: Lên lớp hàng loạt (TÍNH NĂNG MỚI)
async function executeBulkUpgrade() {
    const checkedBoxes = document.querySelectorAll('.student-checkbox:checked');
    if (checkedBoxes.length === 0) return alert("Vui lòng tick chọn ít nhất 1 học sinh để lên lớp!");

    if (confirm(`🌟 XÁC NHẬN LÊN LỚP:\n\nHệ thống sẽ tự động tăng 1 khối cho ${checkedBoxes.length} học sinh đã chọn (VD: 10A4 -> 11A4).\n(Học sinh khối 12 sẽ được hệ thống tự động giữ nguyên).\n\nBạn có chắc chắn muốn thực hiện?`)) {
        
        const btn = document.getElementById('btn-confirm-bulk-upgrade');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
        btn.disabled = true;

        const batch = db.batch();
        let upgradedCount = 0;

        checkedBoxes.forEach(box => {
            const sid = box.value;
            const oldClass = box.getAttribute('data-class').trim();

            // Dùng Regex tách số ở đầu và chuỗi ở sau (VD: "10A6" -> "10" và "A6")
            const match = oldClass.match(/^(\d+)(.*)$/);
            
            if (match) {
                let grade = parseInt(match[1]); // Lấy khối hiện tại (VD: 10)
                let suffix = match[2]; // Lấy phần đuôi lớp (VD: A6)

                // Chỉ tăng lớp nếu đang nhỏ hơn khối 12
                if (grade < 12) {
                    let newClass = (grade + 1) + suffix; // Ghép lại thành 11A6
                    let ref = db.collection('yt_students').doc(sid);
                    
                    batch.update(ref, { class: newClass });
                    upgradedCount++;
                }
            }
        });

        if (upgradedCount === 0) {
            alert("ℹ️ Không có thay đổi nào. Các học sinh đã chọn đều là khối 12 (đã tốt nghiệp) hoặc sai định dạng tên lớp.");
            btn.innerHTML = originalText;
            btn.disabled = false;
            toggleBulkMode();
            return;
        }

        try {
            await batch.commit(); // Gửi toàn bộ cập nhật lên database cùng lúc
            alert(`✅ Cập nhật thành công! Đã lên lớp cho ${upgradedCount} học sinh.`);
            toggleBulkMode();
            loadStudentData(); // Tải lại danh sách
        } catch (e) {
            alert("Lỗi khi cập nhật lớp: " + e.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}
// Hàm bắt sự kiện nhấn Enter trên ô tìm kiếm học sinh
function handleStudentSearchEnter(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        filterStudentTable();
    }
}
function generateStudentId() {
    // Tạo 5 số ngẫu nhiên từ 10000 đến 99999
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `YT-${randomNum}`;
}
// 1. XEM LỊCH SỬ (Và Xóa Lượt Khám)
async function viewHistory(sid, name) {
    const modal = document.getElementById('history-student-modal');
    const title = document.getElementById('history-modal-title');
    const body = document.getElementById('history-modal-body');

    title.innerText = `Lịch sử y tế: ${name.toUpperCase()}`;
    body.innerHTML = '<div style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Đang tải dữ liệu...</div>';
    modal.style.display = 'flex'; 

    try {
        const snap = await db.collection('yt_visits').where('studentId', '==', sid).get();
        
        if (snap.empty) {
            body.innerHTML = "<p style='text-align:center; color:var(--text-gray); margin-top:20px;'>Học sinh chưa có lịch sử khám bệnh.</p>";
        } else {
            let visits = [];
            snap.forEach(doc => {
                const d = doc.data();
                visits.push({ 
                    id: doc.id, 
                    ...d,
                    symptom: d.symptom ? decryptField(d.symptom) : '',
                    treatment: d.treatment ? decryptField(d.treatment) : '',
                    note: d.note ? decryptField(d.note) : '',
                    sign: d.sign ? decryptField(d.sign) : ''
                });
            });
            visits.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

            let html = '<ul style="list-style:none; padding:0; margin:0;">';
            visits.forEach(d => {
                const time = d.timestamp ? new Date(d.timestamp.seconds*1000).toLocaleString('vi-VN') : 'N/A';
                const noteHtml = d.note ? `<div style="margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; font-size:0.85rem; color:#64748b;"><i class="fas fa-pen"></i> Ghi chú: ${d.note}</div>` : '';
                
                html += `
                    <li style="background:#f8fafc; padding:15px 20px; border-radius:10px; margin-bottom:15px; border-left:4px solid #0062ff; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <div style="font-weight:bold; color:#1e293b;">📅 ${time}</div>
                            <!-- THÊM NÚT XÓA LƯỢT KHÁM -->
                            <button onclick="deleteSingleVisit('${d.id}', '${sid}', '${name}')" title="Xóa lượt khám này" style="background:#fee2e2; color:#ef4444; border:none; padding:4px 8px; border-radius:6px; cursor:pointer; font-size:0.8rem;"><i class="fas fa-trash"></i> Xóa</button>
                        </div>
                        <div style="color:#334155; line-height: 1.5;">
                            <strong>Triệu chứng:</strong> ${d.symptom} <br>
                            <strong>Xử lý:</strong> <span style="color:#059669; font-weight:500;">${d.treatment}</span>
                            ${noteHtml}
                        </div>
                    </li>`;
            });
            html += '</ul>';
            body.innerHTML = html;
        }
    } catch (err) {
        body.innerHTML = `<p style="color:red; text-align:center;">Lỗi tải dữ liệu: ${err.message}</p>`;
    }
}
// Hàm Xóa 1 Lượt Khám Cụ Thể và thu hồi Thông Báo
async function deleteSingleVisit(visitId, studentId, studentName) {
    if(confirm("Bạn có chắc chắn muốn xóa Lượt Khám này?\n(Các thông báo đã gửi cho học sinh liên quan đến lượt khám này cũng sẽ bị thu hồi).")) {
        try {
            // 1. Xóa Lượt khám
            await db.collection('yt_visits').doc(visitId).delete();
            
            // 2. Xóa các Thông báo liên quan đến lượt khám này
            const notiSnap = await db.collection('yt_notifications').where('relatedVisitId', '==', visitId).get();
            const batch = db.batch();
            notiSnap.forEach(doc => batch.delete(doc.ref));
            
            // 3. Giải phóng Giường nếu lượt khám này đang nằm giường
            const bedsSnap = await db.collection('yt_beds').where('visitId', '==', visitId).get();
            bedsSnap.forEach(doc => batch.delete(doc.ref));
            
            await batch.commit();

            // Làm mới lại bảng Lịch sử
            viewHistory(studentId, studentName);
            loadBeds(); // Làm mới danh sách giường
            
        } catch(e) {
            alert("Lỗi khi xóa: " + e.message);
        }
    }
}
function closeHistoryModal() {
    document.getElementById('history-student-modal').style.display = 'none';
}

// ============================================
// POPUP: CHỈNH SỬA THÔNG TIN (TÊN, LỚP, CAO, NẶNG)
// 1. Nút bấm ở Tab Tiếp nhận gọi Popup sửa
function openQuickEdit() {
    if (currentReceptionStudent) {
        editStudent(currentReceptionStudent.id, currentReceptionStudent.name, currentReceptionStudent.class);
    } else {
        alert("Chưa có thông tin học sinh để sửa!");
    }
}
// Hàm đóng Popup Cập nhật hồ sơ
function closeEditModal() { 
    const modal = document.getElementById('edit-student-modal');
    if (modal) {
        modal.style.display = 'none'; 
    }
}
// ============================================
// 2. Hàm Tải và Mở Popup Chỉnh Sửa Hồ Sơ (Đã thêm cơ chế bọc lỗi)
async function editStudent(sid, oldName, oldClass) {
    const modal = document.getElementById('edit-student-modal');
    if (!modal) return alert("Lỗi: Không tìm thấy giao diện Popup trong HTML!");
    
    // Mở Popup lên trước
    modal.style.display = 'flex';
    
    // Hàm phụ trợ gán giá trị an toàn (Chống lỗi ngầm làm đứng trình duyệt)
    const setSafeValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    };

    // Gán thông tin cơ bản
    setSafeValue('edit-hs-id', sid);
    setSafeValue('edit-hs-name', oldName);
    setSafeValue('edit-hs-class', oldClass);
    
    // Xóa rỗng các ô trước khi tải dữ liệu mới
    const fields = ['dob', 'gender', 'phone', 'parent-phone', 'street', 'ward', 'height', 'weight', 'medical-note'];
    fields.forEach(f => setSafeValue(`edit-hs-${f}`, ''));
    
    setSafeValue('edit-hs-city', 'Thành phố Hồ Chí Minh');
    
try {
        const doc = await db.collection('yt_students').doc(sid).get();
        if(doc.exists) {
            const d = doc.data();
            
            if(d.name) document.getElementById('edit-hs-name').value = decryptField(d.name);
            if(d.class) document.getElementById('edit-hs-class').value = decryptField(d.class);
            if(d.studentCode) document.getElementById('edit-hs-code').value = d.studentCode; 
            
            if(d.dob) document.getElementById('edit-hs-dob').value = decryptField(d.dob);
            if(d.gender) document.getElementById('edit-hs-gender').value = decryptField(d.gender);
            if(d.height) document.getElementById('edit-hs-height').value = decryptField(d.height);
            if(d.weight) document.getElementById('edit-hs-weight').value = decryptField(d.weight);

            if(d.phone) document.getElementById('edit-hs-phone').value = decryptField(d.phone);
            if(d.parentPhone) document.getElementById('edit-hs-parent-phone').value = decryptField(d.parentPhone);
            if(d.street) document.getElementById('edit-hs-street').value = decryptField(d.street);
            
            if(d.ward) document.getElementById('edit-hs-ward').value = d.ward || '';
            if(d.medicalNote) document.getElementById('edit-hs-medical-note').value = d.medicalNote || '';
        }
    } catch(e) { 
        console.error("Lỗi lấy dữ liệu:", e); 
    }
}
async function saveStudentEdit() {
    const sid = document.getElementById('edit-hs-id').value;
    
// --- CODE MỚI ---
const rawName = document.getElementById('edit-hs-name').value.trim();
const rawDob = document.getElementById('edit-hs-dob').value;
const dataToSave = {
    studentCode: document.getElementById('edit-hs-code').value.trim(), 
    name: encryptField(rawName),
    class: encryptField(document.getElementById('edit-hs-class').value.trim()),
    dob: rawDob ? encryptField(rawDob) : '',
    gender: encryptField(document.getElementById('edit-hs-gender').value),
    phone: encryptField(document.getElementById('edit-hs-phone').value.trim()),
    parentPhone: encryptField(document.getElementById('edit-hs-parent-phone').value.trim()),
    street: encryptField(document.getElementById('edit-hs-street').value.trim()),
    ward: document.getElementById('edit-hs-ward').value.trim(),
    city: document.getElementById('edit-hs-city').value,
    height: encryptField(document.getElementById('edit-hs-height').value.trim()),
    weight: encryptField(document.getElementById('edit-hs-weight').value.trim()),
    medicalNote: document.getElementById('edit-hs-medical-note').value.trim(),
    name_search: encryptField(removeVietnameseTones(rawName))
};
    if (!dataToSave.name || !dataToSave.class) return sysAlert("Tên và lớp không được để trống!", "error");

    try {
        await db.collection('yt_students').doc(sid).update(dataToSave);
	sessionStorage.removeItem('vts_students_cache');
        window.allStudents = []; 
        ytStudentsCache = null;
        sysAlert("Cập nhật thông tin thành công!", "success");
        closeEditModal();
        
        // Nếu đang ở tab Tiếp Nhận thì gọi tải lại khung Lịch sử
        const tiepNhanTab = document.getElementById('tab-yte-tiepnhan');
        if (tiepNhanTab && tiepNhanTab.style.display !== 'none') {
            checkStudentHistory(); 
        } else {
            loadStudentData(); // Đang ở tab Quản lý thì load lại bảng
        }
        
        // Reset toàn bộ bộ nhớ đệm
        adminLookupCache = null;
        allStudentsForNotiCache = [];
    } catch (e) { 
        sysAlert("Lỗi cập nhật: " + e.message, "error"); 
    }
}
// Hàm hiển thị toàn bộ lịch sử & Mã Y Tế khi gõ tên học sinh
// ==========================================
// KIỂM TRA LỊCH SỬ & THỂ TRẠNG KHI TIẾP NHẬN
// ==========================================
let currentReceptionStudent = null; // Lưu tạm thông tin để truyền sang Popup sửa

async function checkStudentHistory() {
    const name = document.getElementById('yt-name').value.trim();
    const className = document.getElementById('yt-class').value.trim();
    const previewBox = document.getElementById('yt-history-preview');
    const btnQuickEdit = document.getElementById('btn-quick-edit');
    
    if (!name || !className) return;

    previewBox.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Đang tải dữ liệu...";
    btnQuickEdit.style.display = 'none';
    currentReceptionStudent = null;
    
    try {
        let studentIdStr = "<span style='color: #ef4444; font-weight: bold;'><i class='fas fa-user-plus'></i> Học sinh mới (Chưa có mã)</span><br><span style='font-size:0.85rem; color:#64748b;'>Vui lòng nhập thông tin khám, hệ thống sẽ tự động tạo hồ sơ mới.</span>";

        let st = null;
        let sid = selectedReceptionStudentId;

        // 1. Nếu đã có ID được chọn từ gợi ý -> Lấy trực tiếp theo ID
        if (sid) {
            const doc = await db.collection('yt_students').doc(sid).get();
            if (doc.exists) st = doc.data();
        } else {
            // Nếu gõ tay -> Thử tìm theo Tên + Lớp
            const hsSnap = await db.collection('yt_students').where('name', '==', name).where('class', '==', className).get();
            if (!hsSnap.empty) {
                st = hsSnap.docs[0].data();
                sid = hsSnap.docs[0].id;
            }
        }

        if (st && sid) {
            // Hiện nút sửa hồ sơ gốc
            currentReceptionStudent = { id: sid, ...st };
            btnQuickEdit.style.display = 'inline-flex';

            let adminInfoHTML = `
                <div style="background: white; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 10px; font-size: 0.85rem;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>Ngày sinh: <strong>${st.dob ? new Date(st.dob).toLocaleDateString('vi-VN') : '--'}</strong></div>
                        <div>Giới tính: <strong>${st.gender || '--'}</strong></div>
                        <div>SĐT Học sinh: <strong>${decryptField(st.phone) || '--'}</strong></div>
                        <div>SĐT Phụ huynh: <strong>${decryptField(st.parentPhone) || '--'}</strong></div>
                        <div style="grid-column: span 2;">Địa chỉ: <strong>${st.street ? `${decryptField(st.street)}, ${st.ward || ''}, ${st.city || ''}` : '--'}</strong></div>
                    </div>
                </div>
            `;

            let warningHTML = st.medicalNote ? `<div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 8px; margin-top: 10px; color: #991b1b; font-size: 0.85rem; border-radius: 4px;"><strong style="color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> CẢNH BÁO:</strong> ${st.medicalNote}</div>` : '';

            let physicalInfoHTML = "";
            if (st.height && st.weight) {
                const h = parseFloat(st.height); const w = parseFloat(st.weight);
                const bmi = (w / Math.pow(h/100, 2)).toFixed(1);
                let bmiColor = bmi < 18.5 ? "#f59e0b" : (bmi >= 25 ? "#ef4444" : "#10b981");
                physicalInfoHTML = `<div style="margin-top: 10px; padding: 8px; background: #f0fdf4; border: 1px solid #10b981; border-radius: 6px; display: flex; justify-content: space-between; font-size: 0.85rem; color: #065f46;"><div>🧍 Cao: <strong>${h} cm</strong></div><div>⚖️ Nặng: <strong>${w} kg</strong></div><div>📊 BMI: <strong style="color: ${bmiColor};">${bmi}</strong></div></div>`;
            }
            studentIdStr = `<span style="color: #0062ff; font-weight: bold; font-size:1.1rem;"><i class='fas fa-id-card'></i> Mã YT: ${sid}</span> ${adminInfoHTML} ${physicalInfoHTML} ${warningHTML}`;
        }

        // 🔥 Truy vấn lịch sử khám chính xác theo studentId
        let visitsSnap;
        if (sid) {
            visitsSnap = await db.collection('yt_visits').where('studentId', '==', sid).get();
        } else {
            visitsSnap = await db.collection('yt_visits').where('name', '==', name).where('class', '==', className).get();
        }

        if (visitsSnap.empty) {
            previewBox.innerHTML = `${studentIdStr}<br><div style="margin-top:15px; color:var(--text-gray); font-size: 0.85rem; text-align:center;">Chưa có lịch sử khám bệnh.</div>`;
        } else {
            let visits = []; 
            visitsSnap.forEach(doc => visits.push(doc.data()));
            visits.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

            let historyHTML = `${studentIdStr}<hr style="margin: 15px 0; border: 0; border-top: 1px dashed #cbd5e1;">`;
            historyHTML += `<div style="font-weight:bold; color:#1e293b; margin-bottom:10px; font-size:0.9rem;">TOÀN BỘ LỊCH SỬ KHÁM BỆNH:</div><ul style="padding-left: 15px; margin: 0; color: #334155; font-size: 0.85rem;">`;
            
            visits.forEach(v => { 
                const date = v.timestamp ? new Date(v.timestamp.seconds * 1000).toLocaleDateString('vi-VN') : 'N/A';
                historyHTML += `<li style="margin-bottom: 8px;"><strong style="color: #0f172a;">${date}</strong>: ${v.symptom} <i class="fas fa-arrow-right" style="font-size:0.8em; color:#94a3b8; margin: 0 5px;"></i> <span style="color: #059669;">${v.treatment}</span></li>`;
            });
            
            historyHTML += `</ul>`;
            previewBox.innerHTML = historyHTML;
        }
    } catch (err) { 
        previewBox.innerHTML = "<span style='color:red;'>Lỗi tải dữ liệu: " + err.message + "</span>"; 
    }
}
// ==========================================
// QUẢN LÝ GIƯỜNG & DANH SÁCH TRONG NGÀY
// ==========================================
async function loadBeds() {
    // 1. Load Giường
    const container = document.getElementById('bed-container');
    if(container) {
        container.innerHTML = '';
        for(let i=1; i<=3; i++) {
            const doc = await db.collection('yt_beds').doc('bed_'+i).get();
            if(doc.exists) {
                const d = doc.data();
                container.innerHTML += `<div class="form-card" style="border-left: 5px solid #ef4444; background: #fff1f2; margin-bottom:0; padding: 20px;"><h3 style="color:#ef4444; margin:0 0 10px;">🛏️ Giường ${i}</h3><p><strong>${d.name}</strong> (${d.class})</p><button onclick="clearBed(${i})" class="btn btn-danger" style="margin-top:10px; width:100%; padding:8px;">Trả giường</button></div>`;
            } else {
                container.innerHTML += `<div class="form-card" style="border-left: 5px solid #10b981; background: #f0fdf4; margin-bottom:0; padding: 20px;"><h3 style="color:#10b981; margin:0 0 10px;">🛏️ Giường ${i}</h3><p style="color:#64748b;">Trống</p></div>`;
            }
        }
    }

    // 2. Load danh sách tiếp nhận HÔM NAY
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Bắt đầu từ 0h sáng nay

    db.collection('yt_visits').where('timestamp', '>=', today).orderBy('timestamp', 'desc').onSnapshot(snap => {
        const list = document.getElementById('today-visits-list');
        if (!list) return;
        list.innerHTML = '';
        
        if(snap.empty) {
            list.innerHTML = '<tr><td colspan="5" style="text-align:center;">Hôm nay chưa có lượt tiếp nhận nào.</td></tr>';
            return;
        }

        snap.forEach(doc => {
            const rawV = doc.data();
            const v = {
                ...rawV,
                name: rawV.name ? decryptField(rawV.name) : '',
                class: rawV.class ? decryptField(rawV.class) : '',
                symptom: rawV.symptom ? decryptField(rawV.symptom) : '',
                treatment: rawV.treatment ? decryptField(rawV.treatment) : ''
            };
            const time = v.timestamp ? new Date(v.timestamp.seconds * 1000).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '';
            
            let btnPH = `<button onclick="notifyParent('${doc.id}', '${v.studentId}')" class="btn" style="background:#fef3c7; color:#d97706; padding: 6px 12px; font-size: 0.85rem; font-weight: bold;"><i class="fas fa-phone-volume"></i> Gọi Phụ Huynh</button>`;
            if (v.notifiedParentAt) {
                const notiTime = new Date(v.notifiedParentAt.seconds * 1000).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
                btnPH = `<span style="color:#10b981; font-weight:bold; font-size:0.85rem;"><i class="fas fa-check-circle"></i> Đã báo lúc ${notiTime}</span>`;
            }

            list.innerHTML += `<tr>
                <td style="color:#64748b; font-weight:bold;">${time}</td>
                <td><strong>${v.name}</strong><br><span style="font-size:0.85rem; color:#64748b;">Lớp ${v.class}</span></td>
                <td>${v.symptom}</td>
                <td style="color:#059669;">${v.treatment}</td>
                <td style="text-align: right;">${btnPH}</td>
            </tr>`;
        });
    });
}

async function notifyParent(visitId, studentId) {
    let parentPhone = "Chưa cập nhật SĐT";
    let studentName = "Học sinh";

    // 1. Truy xuất nhanh hồ sơ học sinh để lấy SĐT Phụ huynh
    if (studentId) {
        try {
            const studentDoc = await db.collection('yt_students').doc(studentId).get();
            if (studentDoc.exists) {
                const data = studentDoc.data();
                if (data.parentPhone) parentPhone = data.parentPhone;
                if (data.name) studentName = data.name;
            }
        } catch (err) {
            console.error("Lỗi khi lấy thông tin học sinh: ", err);
        }
    }

    // 2. Hiển thị Popup xác nhận kèm Số điện thoại
    const confirmMessage = `📞 SỐ ĐIỆN THOẠI PHỤ HUYNH:\n👤 Học sinh: ${studentName}\n👉 Số điện thoại: ${decryptField(parentPhone)}\n\nSau khi gọi xong, nhấn "OK" để xác nhận đã báo Phụ huynh!`;

    if (confirm(confirmMessage)) {
        try {
            // 3. Cập nhật thời gian đã báo lên Database
            await db.collection('yt_visits').doc(visitId).update({
                notifiedParentAt: firebase.firestore.FieldValue.serverTimestamp()
            });
	// TỰ ĐỘNG GỬI THÔNG BÁO CHO HỌC SINH BIẾT
            try {
                const now = new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                await db.collection('yt_notifications').add({
                    title: "Xác nhận Liên lạc Phụ huynh",
                    content: `Phòng Y tế đã liên lạc với Phụ huynh của bạn lúc ${now} để thông báo về tình hình sức khỏe.`,
                    targetType: "student",
                    targetValue: studentId,
                    sender: "Phòng Y Tế",
		    relatedVisitId: visitId,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (err) {
                console.error("Lỗi gửi thông báo gọi PH:", err);
            }
        } catch (err) {
            alert("❌ Lỗi cập nhật trạng thái: " + err.message);
        }
    }
}
async function clearBed(bedNum) {
    const isConfirm = await sysConfirm(`Xác nhận trả giường số ${bedNum}?`, "Trả giường");
    if(isConfirm) {
        sysLoading(true, "Đang cập nhật...");
        await db.collection('yt_beds').doc('bed_' + bedNum).delete();
        sysLoading(false);
        sysAlert("Đã trả giường thành công!", "success");
        loadBeds(); 
    }
}
// --- THỐNG KÊ Y TẾ ---
async function generateMedicalStats() {
    const startInput = document.getElementById('stat-start').value;
    const endInput = document.getElementById('stat-end').value;

    if (!startInput || !endInput) return alert("Vui lòng chọn Từ ngày và Đến ngày để phân tích!");

    const startDate = new Date(startInput + "T00:00:00");
    const endDate = new Date(endInput + "T23:59:59");

    const sympBody = document.getElementById('stat-symptoms-body');
    const studBody = document.getElementById('stat-students-body');

    sympBody.innerHTML = '<tr><td colspan="2" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Đang tính toán...</td></tr>';
    studBody.innerHTML = '<tr><td colspan="3" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Đang tính toán...</td></tr>';

    try {
        const snap = await db.collection('yt_visits')
            .where('timestamp', '>=', startDate)
            .where('timestamp', '<=', endDate)
            .get();

        if (snap.empty) {
            sympBody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Không có dữ liệu trong thời gian này</td></tr>';
            studBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Không có dữ liệu trong thời gian này</td></tr>';
            return;
        }

        let sympMap = {};
        let studMap = {};

        snap.forEach(doc => {
            const v = doc.data();
            
            // Gom nhóm tính toán Bệnh/Triệu chứng (Đã nâng cấp tách từ)
            if (v.symptom) {
                let rawSymptom = v.symptom.toLowerCase();
                
                // Tách chuỗi dựa trên dấu phẩy (,), dấu cộng (+), dấu gạch chéo (/) hoặc chữ "và"
                let symptomsArray = rawSymptom.split(/[,+\/]+|\s+và\s+/g);

                symptomsArray.forEach(symp => {
                    let s = symp.trim();
                    if (s.length > 0) {
                        // Viết hoa chữ cái đầu
                        s = s.charAt(0).toUpperCase() + s.slice(1);
                        sympMap[s] = (sympMap[s] || 0) + 1;
                    }
                });
            }

            // Gom nhóm tính toán Học sinh
            if (v.name && v.class) {
                // Gộp theo tên và lớp để làm ID duy nhất
                let studKey = v.name + "_" + v.class; 
                if (!studMap[studKey]) {
                    studMap[studKey] = { name: v.name, class: v.class, count: 0 };
                }
                studMap[studKey].count += 1;
            }
        });

        // Chuyển Object thành Array để Sắp xếp giảm dần
        let sortedSymp = Object.keys(sympMap).map(k => ({ name: k, count: sympMap[k] }));
        sortedSymp.sort((a, b) => b.count - a.count);

        let sortedStud = Object.values(studMap);
        sortedStud.sort((a, b) => b.count - a.count);

        // Hiển thị danh sách TOP 10 Triệu chứng
        sympBody.innerHTML = '';
        sortedSymp.slice(0, 10).forEach(item => {
            sympBody.innerHTML += `
                <tr>
                    <td style="font-weight:500;">${item.name}</td>
                    <td style="text-align:center; font-weight:bold; color:#ef4444; font-size:1.1rem;">${item.count}</td>
                </tr>
            `;
        });

        // Hiển thị danh sách TOP 10 Học sinh
        studBody.innerHTML = '';
        sortedStud.slice(0, 10).forEach(item => {
            studBody.innerHTML += `
                <tr>
                    <td style="font-weight:500;">${item.name}</td>
                    <td style="color:var(--text-gray);">${item.class}</td>
                    <td style="text-align:center; font-weight:bold; color:#f59e0b; font-size:1.1rem;">${item.count}</td>
                </tr>
            `;
        });

    } catch (e) {
        console.error(e);
        alert("Có lỗi xảy ra trong quá trình tính toán: " + e.message);
    }
}
// ==========================================
// HỆ THỐNG QUẢN LÝ TICKET (HỖ TRỢ HỌC SINH)
// ==========================================
// ==========================================
// QUẢN LÝ YÊU CẦU TỪ HỌC SINH (REAL-TIME NÂNG CAO)
// ==========================================

let studentTicketListener = null; 
let currentTicketFilter = 'all'; // Trạng thái bộ lọc hiện tại
let cachedTickets = []; // Lưu trữ trên RAM để lọc tức thì

// 1. Hàm chuyển đổi bộ lọc khi click nút
function changeTicketFilter(filterType) {
    currentTicketFilter = filterType;
    
    // Cập nhật giao diện CSS cho các nút bộ lọc
    const filters = ['all', 'pending', 'processing', 'resolved'];
    filters.forEach(f => {
        const btn = document.getElementById(`btn-flt-${f}`);
        if(f === filterType) {
            btn.style.background = '#0062ff'; btn.style.color = 'white'; btn.style.borderColor = '#0062ff';
        } else {
            btn.style.background = 'white'; btn.style.color = '#64748b'; btn.style.borderColor = '#cbd5e1';
        }
    });

    // Gọi lại hàm vẽ giao diện (Lấy từ RAM nên tốc độ là 0.001s)
    renderStudentTicketsTable();
}

// 2. Hàm Lắng nghe Database Thời gian thực
// 2. Hàm Lắng nghe Database Thời gian thực
function loadStudentTickets() {
    const tbody = document.getElementById('admin-ticket-list-table');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> Đang đồng bộ dữ liệu...</td></tr>';
    
    if (studentTicketListener) studentTicketListener();

    // VÁ LỖI Ở ĐÂY: Xóa tạm thời .orderBy để không bị vướng Index của Firebase
    // Javascript sẽ tự động sắp xếp lại ở đoạn dưới
    studentTicketListener = db.collection('yt_tickets')
        .onSnapshot(snap => {
            cachedTickets = [];
            
            // Biến đếm số lượng cho từng trạng thái
            let counts = { all: 0, pending: 0, processing: 0, resolved: 0 };

            snap.forEach(doc => {
                const t = { id: doc.id, ...doc.data() };
                cachedTickets.push(t);
                
                // Tăng biến đếm
                counts.all++;
                if (t.status === 'pending') counts.pending++;
                if (t.status === 'processing') counts.processing++;
                if (t.status === 'resolved') counts.resolved++;
            });

            // VÁ LỖI Ở ĐÂY: Dùng Javascript (RAM) để tự sắp xếp tin nhắn mới nhất lên đầu
            // Như vậy sẽ không phụ thuộc vào bộ Index của Firebase
            cachedTickets.sort((a, b) => {
                const timeA = a.timestamp ? a.timestamp.seconds : 0;
                const timeB = b.timestamp ? b.timestamp.seconds : 0;
                return timeB - timeA;
            });

            // Cập nhật các con số lên các nút Bộ lọc
            document.getElementById('badge-all').innerText = counts.all;
            document.getElementById('badge-pending').innerText = counts.pending;
            document.getElementById('badge-processing').innerText = counts.processing;
            document.getElementById('badge-resolved').innerText = counts.resolved;

            // Nếu có yêu cầu Pending mới (Chưa đọc) -> Gây chú ý bằng hiệu ứng chớp tắt
            const pendingBadge = document.getElementById('badge-pending');
            if(counts.pending > 0) {
                pendingBadge.style.background = '#ef4444'; // Đỏ chót
                pendingBadge.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.6)';
            } else {
                pendingBadge.style.background = '#f59e0b'; // Vàng nhạt
                pendingBadge.style.boxShadow = 'none';
            }

            // Tiến hành vẽ ra bảng
            renderStudentTicketsTable();
    }, error => {
        // HIỂN THỊ LỖI LÊN MÀN HÌNH NẾU FIREBASE CHẶN
        console.error("Lỗi Firebase: ", error);
        if(tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding:30px;">Lỗi tải dữ liệu: ${error.message}</td></tr>`;
    });
}
// 3. Hàm Vẽ Bảng dựa trên RAM
function renderStudentTicketsTable() {
    const tbody = document.getElementById('admin-ticket-list-table');
    if (!tbody) return;

    // Lọc mảng trên RAM theo điều kiện của Nút đang được bấm
    let filteredData = cachedTickets;
    if (currentTicketFilter !== 'all') {
        filteredData = cachedTickets.filter(t => t.status === currentTicketFilter);
    }

    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#64748b; padding:30px;"><i class="fas fa-box-open fa-2x" style="opacity:0.3; margin-bottom:10px;"></i><br>Không có yêu cầu nào trong mục này.</td></tr>`;
        return;
    }

    let htmlString = '';
    filteredData.forEach(t => {
        const dateStr = t.timestamp ? new Date(t.timestamp.seconds * 1000).toLocaleString('vi-VN', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'}) : 'Vừa xong';
        const statusMap = { 
            pending: ['#ef4444', 'MỚI'], // Báo Đỏ cho dễ nhìn
            processing: ['#3b82f6', 'Đang xử lý'], 
            resolved: ['#10b981', 'Đã đóng']
        };
        const [color, text] = statusMap[t.status] || ['#64748b', t.status];
        
        htmlString += `
            <tr style="transition: 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td><strong style="color:#0f172a;">${t.name}</strong><br><span style="font-size:0.8rem; color:#0062ff; font-weight:bold;">${t.class}</span></td>
                <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">${t.content}</td>
                <td style="font-size:0.85rem; color:#64748b;">${dateStr}</td>
                <td><span style="background:${color}15; color:${color}; padding:4px 10px; border-radius:15px; font-size:0.8rem; font-weight:bold;">● ${text}</span></td>
<td>
    <button onclick="openTicketDetailPopup('${t.id}')" class="btn" style="padding:6px 12px; font-size:0.85rem; background:#e0e7ff; color:#3b82f6;"><i class="fas fa-eye"></i> Xem</button>
    <button onclick="deleteStudentTicket('${t.id}')" class="btn" style="padding:6px 12px; font-size:0.85rem; background:#fee2e2; color:#ef4444; margin-left:5px;" title="Xóa yêu cầu"><i class="fas fa-trash"></i></button>
</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = htmlString;
}

// 4. Hàm Xóa
// 4. Hàm Xóa Yêu Cầu & Kéo theo xóa Thông Báo liên quan
async function deleteStudentTicket(docId) {
    if(confirm("Bạn có chắc chắn muốn xóa vĩnh viễn yêu cầu này không? Các thông báo phản hồi liên quan gửi cho học sinh cũng sẽ bị thu hồi.")) {
        try { 
            // 1. Xóa Yêu cầu (Ticket)
            await db.collection('yt_tickets').doc(docId).delete(); 
            
            // 2. Xóa các Thông báo liên đới
            const notiSnap = await db.collection('yt_notifications').where('relatedTicketId', '==', docId).get();
            const batch = db.batch();
            notiSnap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            
        } catch(e) { alert("Lỗi khi xóa: " + e.message); }
    }
}
function openTicketDetailPopup(id) {
    const ticket = cachedTickets.find(t => t.id === id);
    if (!ticket) return alert("Không tìm thấy dữ liệu!");

    document.getElementById('tk-detail-id').value = ticket.id;
    document.getElementById('tk-detail-name').innerText = ticket.name;
    document.getElementById('tk-detail-class').innerText = ticket.class;
    document.getElementById('tk-detail-time').innerText = ticket.timestamp ? new Date(ticket.timestamp.seconds * 1000).toLocaleString('vi-VN') : 'Vừa xong';
    
    document.getElementById('tk-detail-content').innerHTML = ticket.content;
    document.getElementById('tk-detail-status').value = ticket.status;
    
    // Đổ câu trả lời cũ vào ô nhập (nếu admin đã từng trả lời trước đó)
    document.getElementById('tk-detail-reply').value = ticket.adminReply || '';

    document.getElementById('ticket-detail-modal').style.display = 'flex';
}

// Hàm lưu trạng thái Ticket từ Popup
// Hàm lưu trạng thái và Gửi phản hồi
async function saveTicketStatus() {
    const id = document.getElementById('tk-detail-id').value;
    const newStatus = document.getElementById('tk-detail-status').value;
    const adminReply = document.getElementById('tk-detail-reply').value.trim(); // Lấy nội dung trả lời

    const btn = document.querySelector('#ticket-detail-modal .btn-primary');
    const ogText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    btn.disabled = true;

    try {
        // 1. Cập nhật Yêu cầu (Lưu nội dung trả lời vào database)
        await db.collection('yt_tickets').doc(id).update({
            status: newStatus,
            adminReply: adminReply, 
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() // Thời gian cập nhật
        });

        // 2. TỰ ĐỘNG BẮN THÔNG BÁO CHO HỌC SINH (Chỉ gửi khi có ghi câu trả lời)
        const ticket = cachedTickets.find(t => t.id === id);
        if (ticket && ticket.studentId && adminReply !== '') {
            let statusText = newStatus === 'resolved' ? 'Đã xử lý xong' : 'Đang xử lý';
            
            await db.collection('yt_notifications').add({
                title: "Phản hồi Yêu cầu Y tế của bạn",
                content: `Phòng Y tế đã phản hồi lại yêu cầu của bạn với nội dung:\n\n"${adminReply}"\n\nTrạng thái hiện tại: ${statusText}`,
                targetType: "student",
                targetValue: ticket.studentId, 
                sender: "Phòng Y Tế",
                relatedTicketId: id, // <--- THÊM DÒNG NÀY ĐỂ LIÊN KẾT DỮ LIỆU
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // Đóng Popup
        document.getElementById('ticket-detail-modal').style.display = 'none';
        
    } catch (error) {
        alert("Lỗi khi cập nhật trạng thái: " + error.message);
    } finally {
        btn.innerHTML = ogText;
        btn.disabled = false;
    }
}
// Hàm cập nhật trạng thái và lưu câu trả lời
// ==========================================
// ==========================================
// TÍNH NĂNG IMPORT HỌC SINH TỪ FILE EXCEL
// Hàm chuyển đổi Ngày sinh từ Excel (DD/MM/YYYY) sang chuẩn Web (YYYY-MM-DD)
function formatExcelDateToHTML5(dateVal) {
    if (!dateVal) return "";
    
// Nếu dữ liệu Excel đọc ra là số (Định dạng Serial Date của Excel)
    if (!isNaN(dateVal) && typeof dateVal === 'number') {
        // 25569 là số ngày chuẩn xác giữa mốc thời gian Excel và Javascript
        let date = new Date((dateVal - 25569) * 86400 * 1000);
        
        // Phải dùng getUTC... để ép máy tính không tự động cộng/trừ múi giờ Việt Nam
        let d = String(date.getUTCDate()).padStart(2, '0');
        let m = String(date.getUTCMonth() + 1).padStart(2, '0');
        let y = date.getUTCFullYear();
        return `${y}-${m}-${d}`;
    }
    // Nếu dữ liệu là chuỗi (Ví dụ: "15/08/2009" hoặc "15-8-2009")
    let str = dateVal.toString().trim();
    let parts = str.split(/[\/\-]/); // Cắt chuỗi dựa trên dấu / hoặc dấu -
    
    // Nếu đúng định dạng Ngày/Tháng/Năm
    if (parts.length === 3 && parts[2].length === 4) {
        let d = parts[0].padStart(2, '0'); // Thêm số 0 nếu là số có 1 chữ số
        let m = parts[1].padStart(2, '0');
        let y = parts[2];
        return `${y}-${m}-${d}`; // Trả về dạng Năm-Tháng-Ngày
    }

    // Nếu đã đúng chuẩn YYYY-MM-DD rồi thì giữ nguyên
    return str;
}
// TÍNH NĂNG IMPORT & LÀM GIÀU DỮ LIỆU TỪ EXCEL
// ==========================================

async function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = ""; 

    const btn = document.querySelector('button[onclick="document.getElementById(\'excel-upload\').click()"]');
    let originalText = "";
    if (btn) {
        originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đọc dữ liệu...';
        btn.disabled = true;
    }

    sysLoading(true, "Đang đọc cấu trúc file Excel...");
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            
            if (rawJson.length === 0) {
                return alert("File Excel không có dữ liệu!");
            }

            const json = rawJson.map(row => {
                let normalizedRow = {};
                for (let key in row) {
                    normalizedRow[key.trim().toLowerCase()] = row[key];
                }
                return normalizedRow;
            });

            const parseExcelDate = (excelDate) => {
                if (!excelDate || excelDate === "") return "";
                if (typeof excelDate === 'number') {
                    const jsDate = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
                    return jsDate.toISOString().split('T')[0];
                }
                let dateStr = String(excelDate).trim().split(" ")[0]; 
                if (dateStr.includes('/')) {
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        const d = parts[0].padStart(2, '0');
                        const m = parts[1].padStart(2, '0');
                        let y = parts[2];
                        if (y.length === 2) y = "20" + y;
                        return `${y}-${m}-${d}`;
                    }
                }
                if (dateStr.includes('-')) {
                     const parts = dateStr.split('-');
                     if (parts.length === 3) {
                         if (parts[0].length === 4) return dateStr;
                         const d = parts[0].padStart(2, '0');
                         const m = parts[1].padStart(2, '0');
                         let y = parts[2];
                         if (y.length === 2) y = "20" + y;
                         return `${y}-${m}-${d}`;
                     }
                }
                return "";
            };

            sysLoading(true, "Đang đối chiếu dữ liệu...");
            const snapshot = await db.collection('yt_students').get();
            const existingStudentsMap = new Map();
            const existingIds = new Set(); 

            snapshot.forEach(doc => {
                const d = doc.data();
                existingIds.add(doc.id);
				if (d.name && d.class) {
				    const studentCodeKey = d.studentCode ? `code_${d.studentCode.trim().toLowerCase()}` : null;
				    const nameClassDobKey = `combo_${d.name.trim().toLowerCase()}_${d.class.trim().toLowerCase()}_${(d.dob || '').trim()}`;
				    
				    if (studentCodeKey) existingStudentsMap.set(studentCodeKey, { id: doc.id, ...d });
				    existingStudentsMap.set(nameClassDobKey, { id: doc.id, ...d });
				}
            });

            let batches = [];
            let currentBatch = db.batch();
            let operationCount = 0;
            let successCount = 0;  
            let updatedCount = 0;  
            let skippedCount = 0;  

            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                const studentCode = (row['mã học sinh'] || row['mã hs'] || "").toString().trim();
                const name = row['họ và tên'] || row['họ tên'] || row['tên'] || "";
                const className = row['lớp'] || row['lop'] || "";
                const height = (row['chiều cao'] || row['cao'] || "").toString().trim();
                const weight = (row['cân nặng'] || row['nặng'] || "").toString().trim();
                const rawDob = row['ngày sinh'] || row['ngày/tháng/năm sinh'] || "";
                const dob = parseExcelDate(rawDob);
                const gender = (row['giới tính'] || "").toString().trim();
                const phone = (row['số điện thoại'] || row['sđt'] || "").toString().trim();
                const parentPhone = (row['số điện thoại ph'] || row['sđt ph'] || "").toString().trim();
                const street = (row['số nhà'] || row['số nhà, đường'] || row['địa chỉ'] || "").toString().trim();
                const ward = (row['phường/xã'] || row['phường'] || row['xã'] || "").toString().trim();
                const city = (row['tỉnh/thành phố'] || row['tỉnh'] || row['thành phố'] || "Thành phố Hồ Chí Minh").toString().trim();

                if (name && className) {
                    const cleanName = name.toString().trim();
                    const cleanClass = className.toString().trim();

                    const studentKeyByCode = studentCode ? `code_${studentCode.toLowerCase()}` : null;
                    const studentKeyByCombo = `combo_${cleanName.toLowerCase()}_${cleanClass.toLowerCase()}_${dob}`;

                    const existingData = (studentKeyByCode && existingStudentsMap.get(studentKeyByCode)) 
                                      || existingStudentsMap.get(studentKeyByCombo);

                    if (existingData) {
                        let updatePayload = {};

                        const checkAndUpdate = (field, excelValue) => {
                            if (excelValue && (!existingData[field] || existingData[field].toString().trim() === "")) {
                                updatePayload[field] = excelValue;
                                existingData[field] = excelValue; 
                            }
                        };
                        checkAndUpdate('studentCode', studentCode);
                        checkAndUpdate('height', height);
                        checkAndUpdate('weight', weight);
                        checkAndUpdate('dob', dob);
                        checkAndUpdate('gender', gender);
                        checkAndUpdate('phone', phone);
                        checkAndUpdate('parentPhone', parentPhone);
                        checkAndUpdate('street', street);
                        checkAndUpdate('ward', ward);
                        checkAndUpdate('city', city);

                        if (Object.keys(updatePayload).length > 0) {
                            const ref = db.collection('yt_students').doc(existingData.id);
                            currentBatch.update(ref, updatePayload);
                            updatedCount++;
                            operationCount++;
                        } else {
                            skippedCount++;
                        }
                    } else {
                        let sid;
                        let isUnique = false;
                        while (!isUnique) {
                            const randomNum = Math.floor(10000 + Math.random() * 90000);
                            sid = `YT-${randomNum}`;
                            if (!existingIds.has(sid)) { existingIds.add(sid); isUnique = true; }
                        }

                        const ref = db.collection('yt_students').doc(sid);
                        const newData = {
                            id: sid, 
                            name: encryptField(cleanName), 
                            class: encryptField(cleanClass), 
                            studentCode: studentCode,
                            height: height ? encryptField(height) : '', 
                            weight: weight ? encryptField(weight) : '', 
                            dob: dob ? encryptField(dob) : '', 
                            gender: gender ? encryptField(gender) : '', 
                            phone: phone ? encryptField(phone) : '', 
                            parentPhone: parentPhone ? encryptField(parentPhone) : '', 
                            street: street ? encryptField(street) : '', 
                            ward, 
                            city,
                            name_search: encryptField(removeVietnameseTones(cleanName)),
							createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        currentBatch.set(ref, newData);                        
                        if (studentKeyByCode) existingStudentsMap.set(studentKeyByCode, newData);
                        existingStudentsMap.set(studentKeyByCombo, newData);

                        successCount++;
                        operationCount++;
                    }

                    if (operationCount >= 400) {
                        batches.push(currentBatch);
                        currentBatch = db.batch();
                        operationCount = 0;
                    }
                }
            }

            if (operationCount > 0) batches.push(currentBatch);

            if (successCount === 0 && updatedCount === 0) {
                return alert(`ℹ️ Quá trình kết thúc.\nĐã bỏ qua ${skippedCount} dòng do dữ liệu đã đầy đủ.`);
            }

            sysLoading(true, "Đang đồng bộ lên Cloud...");
            for (let batch of batches) { await batch.commit(); }
            
            sessionStorage.removeItem('vts_students_cache');
            window.allStudents = [];
            sysAlert(`Hoàn tất!\n- Tạo mới: ${successCount}\n- Cập nhật: ${updatedCount}\n- Bỏ qua: ${skippedCount}`, "success");
            loadStudentData(); 
        } catch (error) {
            sysAlert("Lỗi xử lý file Excel: " + error.message, "error");
        } finally {
            sysLoading(false);
            // KHI TẤT CẢ TÁC VỤ HOÀN THÀNH (HOẶC LỖI), KHÔI PHỤC NÚT BẤM
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    };
    reader.readAsArrayBuffer(file);
}

// ==========================================
// TÍNH NĂNG XUẤT DANH SÁCH HỌC SINH (PDF HOẶC EXCEL)
// ==========================================
function openExportStudentModal() { 
    document.getElementById('export-student-modal').style.display = 'flex'; 
}

function closeExportStudentModal() { 
    document.getElementById('export-student-modal').style.display = 'none'; 
}

async function executeExportStudents() {
    const selectedFormat = document.querySelector('input[name="export-file-format"]:checked')?.value || 'pdf';

    const showId = document.getElementById('col-id').checked;
    const showHeight = document.getElementById('col-height').checked;
    const showWeight = document.getElementById('col-weight').checked;
    const showNote = document.getElementById('col-note').checked;
    const showStCode = document.getElementById('col-stcode').checked;
    const showDob = document.getElementById('col-dob').checked;
    const showGender = document.getElementById('col-gender').checked;
    const showPhone = document.getElementById('col-phone').checked;
    const showParentPhone = document.getElementById('col-parentphone').checked;
    const showAddress = document.getElementById('col-address').checked;
    const showEmail = document.getElementById('col-email').checked;
    const showBmi = document.getElementById('col-bmi').checked;

    const classFilterInput = document.getElementById('export-class-filter').value.trim().toLowerCase();
    let targetClasses = [];
    if (classFilterInput) {
        targetClasses = classFilterInput.split(',').map(c => c.trim()).filter(c => c !== "");
    }

    const btn = document.querySelector('#export-student-modal .btn-primary');
    let originalText = "";
    if (btn) {
        originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang trích xuất dữ liệu...';
        btn.disabled = true;
    }

    sysLoading(true, "Đang xử lý dữ liệu xuất...");

    try {
        const allStudents = await getStudentsList();

        if (!allStudents || allStudents.length === 0) {
            if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
            sysLoading(false);
            return sysAlert("Hiện chưa có học sinh nào trong hệ thống!", "warning");
        }

        let filteredStudents = targetClasses.length > 0 
            ? allStudents.filter(hs => targetClasses.includes((hs.class || "").toLowerCase())) 
            : allStudents;

        if (filteredStudents.length === 0) {
            if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
            sysLoading(false);
            return sysAlert("Không tìm thấy học sinh nào thuộc các lớp đã nhập!", "warning");
        }

        // Nhóm theo từng lớp
        let studentsByClass = {};
        filteredStudents.forEach(hs => {
            const cName = hs.class || "Chưa xếp lớp";
            if (!studentsByClass[cName]) studentsByClass[cName] = [];
            studentsByClass[cName].push(hs);
        });

        const getSortableName = (fullName) => {
            if (!fullName) return "";
            let parts = fullName.trim().split(/\s+/);
            if (parts.length <= 1) return fullName;
            let ten = parts.pop();       
            let hoDem = parts.join(" "); 
            return ten + " " + hoDem;    
        };

        const sortedClasses = Object.keys(studentsByClass).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));

        // ==========================================
        // TRƯỜNG HỢP 1: XUẤT EXCEL (.xlsx)
        // ==========================================
        if (selectedFormat === 'excel') {
            if (typeof XLSX === 'undefined') {
                throw new Error("Chưa tải được thư viện SheetJS (XLSX)!");
            }

            const wb = XLSX.utils.book_new();

            // Tạo bảng chung hoặc từng sheet theo lớp
            sortedClasses.forEach(className => {
                let classStudents = studentsByClass[className];
                classStudents.sort((a, b) => getSortableName(a.name).localeCompare(getSortableName(b.name), 'vi'));

                const rowsData = [];
                classStudents.forEach((hs, i) => {
                    const decryptedPhone = hs.phone ? decryptField(hs.phone) : '';
                    const decryptedParentPhone = hs.parentPhone ? decryptField(hs.parentPhone) : '';
                    const decryptedStreet = hs.street ? decryptField(hs.street) : '';
                    const fullAddress = decryptedStreet ? `${decryptedStreet}${hs.ward ? ', ' + hs.ward : ''}` : '';

                    let bmiValue = '';
                    if (showBmi && hs.height && hs.weight) {
                        const h = parseFloat(hs.height);
                        const w = parseFloat(hs.weight);
                        if (h > 0 && w > 0) {
                            bmiValue = (w / Math.pow(h / 100, 2)).toFixed(1);
                        }
                    }

                    const rowObj = {};
                    rowObj["STT"] = i + 1;
                    if (showId) rowObj["Mã Y Tế"] = hs.id || '';
                    if (showStCode) rowObj["Mã Học Sinh"] = hs.studentCode || '';
                    rowObj["Họ và Tên"] = hs.name || '';
                    rowObj["Lớp"] = hs.class || '';
                    if (showDob) rowObj["Ngày Sinh"] = hs.dob ? new Date(hs.dob).toLocaleDateString('vi-VN') : '';
                    if (showGender) rowObj["Giới Tính"] = hs.gender || '';
                    if (showHeight) rowObj["Chiều Cao (cm)"] = hs.height || '';
                    if (showWeight) rowObj["Cân Nặng (kg)"] = hs.weight || '';
                    if (showBmi) rowObj["BMI"] = bmiValue;
                    if (showPhone) rowObj["SĐT Học Sinh"] = decryptedPhone;
                    if (showParentPhone) rowObj["SĐT Phụ Huynh"] = decryptedParentPhone;
                    if (showEmail) rowObj["Email Liên Kết"] = hs.linkedEmail || '';
                    if (showAddress) rowObj["Địa Chỉ"] = fullAddress;
                    if (showNote) rowObj["Ghi Chú Lâm Sàng"] = hs.medicalNote || '';

                    rowsData.push(rowObj);
                });

                const ws = XLSX.utils.json_to_sheet(rowsData);

                // Tự động căn chỉnh độ rộng cột
                const colWidths = Object.keys(rowsData[0] || {}).map(key => {
                    const maxLen = Math.max(
                        key.length,
                        ...rowsData.map(r => (r[key] ? r[key].toString().length : 0))
                    );
                    return { wch: Math.min(Math.max(maxLen + 3, 10), 40) };
                });
                ws['!cols'] = colWidths;

                // Tên sheet (giới hạn tối đa 31 ký tự)
                let sheetName = `Lớp ${className}`.replace(/[:\\/?*\[\]]/g, '').substring(0, 31);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            const fileName = `Danh_Sach_Hoc_Sinh_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);

            closeExportStudentModal();
            sysAlert("Xuất file Excel thành công!", "success");
            return;
        }

        // ==========================================
        // TRƯỜNG HỢP 2: XUẤT BẢN IN / PDF (NHƯ CŨ)
        // ==========================================
        let fullPrintHTML = '';

        sortedClasses.forEach((className, index) => {
            let classStudents = studentsByClass[className];
            classStudents.sort((a, b) => getSortableName(a.name).localeCompare(getSortableName(b.name), 'vi'));

            const pageBreakCSS = index > 0 ? 'page-break-before: always; break-before: page;' : '';

            let theadHTML = `<tr>
                <th style="width: 5%;">STT</th>
                ${showId ? '<th>Mã YT</th>' : ''}
                ${showStCode ? '<th>Mã HS</th>' : ''}
                <th>Họ và tên</th>
                <th>Lớp</th>
                ${showDob ? '<th>Ngày sinh</th>' : ''}
                ${showGender ? '<th>Giới tính</th>' : ''}
                ${showHeight ? '<th>Cao</th>' : ''}
                ${showWeight ? '<th>Nặng</th>' : ''}
                ${showBmi ? '<th>BMI</th>' : ''}
                ${showPhone ? '<th>SĐT Học sinh</th>' : ''}
                ${showParentPhone ? '<th>SĐT Phụ huynh</th>' : ''}
                ${showEmail ? '<th>Email Liên kết</th>' : ''}
                ${showAddress ? '<th>Địa chỉ</th>' : ''}
                ${showNote ? '<th style="width: 15%;">Ghi chú LS</th>' : ''}
            </tr>`;

            let tbodyHTML = '';
            classStudents.forEach((hs, i) => {
                const dobFormat = hs.dob ? new Date(hs.dob).toLocaleDateString('vi-VN') : '';
                const decryptedPhone = hs.phone ? decryptField(hs.phone) : '';
                const decryptedParentPhone = hs.parentPhone ? decryptField(hs.parentPhone) : '';
                const decryptedStreet = hs.street ? decryptField(hs.street) : '';
                const fullAddress = decryptedStreet ? `${decryptedStreet}${hs.ward ? ', ' + hs.ward : ''}` : '';
                let bmiValue = '';
                if (showBmi && hs.height && hs.weight) {
                    const h = parseFloat(hs.height);
                    const w = parseFloat(hs.weight);
                    if (h > 0 && w > 0) {
                        bmiValue = (w / Math.pow(h/100, 2)).toFixed(1);
                    }
                }

                tbodyHTML += `<tr>
                    <td style="text-align:center;">${i + 1}</td>
                    ${showId ? `<td style="text-align:center; font-weight:bold; color:#0062ff;">${hs.id}</td>` : ''}
                    ${showStCode ? `<td style="text-align:center; font-weight:600; color:#475569;">${hs.studentCode || ''}</td>` : ''}
                    <td style="text-align:left;">${hs.name}</td>
                    <td style="text-align:center;">${hs.class}</td>
                    ${showDob ? `<td style="text-align:center;">${dobFormat}</td>` : ''}
                    ${showGender ? `<td style="text-align:center;">${hs.gender || ''}</td>` : ''}
                    ${showHeight ? `<td style="text-align:center;">${hs.height ? hs.height+' cm' : ''}</td>` : ''}
                    ${showWeight ? `<td style="text-align:center;">${hs.weight ? hs.weight+' kg' : ''}</td>` : ''}
                    ${showBmi ? `<td style="text-align:center; font-weight:bold;">${bmiValue}</td>` : ''}
                    ${showPhone ? `<td style="text-align:center;">${decryptedPhone}</td>` : ''}
                    ${showParentPhone ? `<td style="text-align:center;">${decryptedParentPhone}</td>` : ''}
                    ${showEmail ? `<td>${hs.linkedEmail || ''}</td>` : ''}
                    ${showAddress ? `<td style="text-align:left; font-size:0.7em;">${fullAddress}</td>` : ''}
                    ${showNote ? `<td style="text-align:left; font-size:0.7em; color:#e11d48;">${hs.medicalNote || ''}</td>` : ''}
                </tr>`;
            });

            fullPrintHTML += `
                <div style="${pageBreakCSS}">
                    <div style="text-align:center; margin-bottom: 20px; padding-top: 10px;">
                        <h1 style="font-size: 16pt; margin-bottom: 5px; font-weight: bold; text-transform: uppercase;">DANH SÁCH THÔNG TIN HỌC SINH - LỚP ${className}</h1>
                        <p style="font-style: italic; font-size: 11pt; margin: 0;">(Hệ thống Y tế số - THPT Võ Thị Sáu)</p>
                        <p style="font-size: 11pt; margin-top: 5px;">Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} | Tổng số: ${classStudents.length} học sinh</p>
                    </div>
                    <table class="print-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt !important;">
                        <thead>${theadHTML}</thead>
                        <tbody>${tbodyHTML}</tbody>
                    </table>
                </div>
            `;
        });

        const printArea = document.getElementById('print-section');
        printArea.innerHTML = fullPrintHTML;

        const style = document.createElement('style');
        style.id = 'print-portrait-style';
        style.innerHTML = `
            @page { size: A3 Landscape; margin: 10mm; }
            #print-section .print-table th, 
            #print-section .print-table td { 
                font-size: 10.5pt !important; 
                padding: 6px 4px !important; 
            }
        `;
        document.head.appendChild(style);
        closeExportStudentModal();
        printArea.style.display = 'block';
        
        setTimeout(() => {
            sysLoading(false);
            window.print();
            printArea.style.display = 'none';
            printArea.innerHTML = '';
            document.getElementById('print-portrait-style').remove();
            
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }, 800);

    } catch (err) {
        sysAlert("Lỗi xuất dữ liệu: " + err.message, "error");
    } finally {
        sysLoading(false);
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}
// ==========================================
// TÍNH NĂNG TRA CỨU TOÀN DIỆN (ADMIN)
// ==========================================

// Biến lưu trữ tạm thời để tìm kiếm siêu tốc (không làm lag server)
let adminLookupCache = null;

// 1. Hàm gợi ý tìm kiếm THÔNG MINH (Gõ gì cũng ra)
async function searchAdminLookupSuggest(val) {
    const box = document.getElementById('admin-lookup-suggest');
    const hiddenId = document.getElementById('admin-lookup-id');
    
    if (val.length < 2) { 
        box.style.display = 'none'; 
        return; 
    }

    // Tận dụng bộ nhớ đệm dùng chung
    const students = await getStudentsList();
    const keyword = removeVietnameseTones(val.trim());

    const filtered = students.filter(st => {
        const searchString = `${st.name_search} ${st.id.toLowerCase()} ${st.class.toLowerCase()}`;
        return searchString.includes(keyword);
    });

    box.innerHTML = '';
    if (filtered.length === 0) { 
        box.innerHTML = '<div style="padding:10px; color:#ef4444; text-align:center;">Không tìm thấy học sinh!</div>';
        box.style.display = 'block';
        return; 
    }

    filtered.slice(0, 10).forEach(d => {
        const item = document.createElement('div');
        item.className = 'suggest-item';
        item.innerHTML = `<div style="display:flex; justify-content:space-between;">
                            <strong>${d.name}</strong> 
                            <span style="color:#0062ff; font-size:0.85rem; font-weight:bold;">${d.class}</span>
                          </div>
                          <div style="font-size:0.75rem; color:#64748b;">Mã: ${d.id}</div>`;
        item.onclick = () => {
            document.getElementById('admin-lookup-input').value = `${d.name} (${d.class})`;
            hiddenId.value = d.id;
            box.style.display = 'none';
        };
        box.appendChild(item);
    });
    box.style.display = 'block';
}
// 2. Hàm Thực thi Tra cứu và Đổ giao diện
async function performAdminFullLookup() {
    const studentId = document.getElementById('admin-lookup-id').value;
    const resultDiv = document.getElementById('admin-lookup-result');

    if (!studentId) {
        return alert("Vui lòng chọn 1 học sinh từ danh sách gợi ý!");
    }

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Đang truy xuất toàn bộ dữ liệu...</p></div>';

    try {
        // A. Lấy thông tin gốc
        const doc = await db.collection('yt_students').doc(studentId).get();
        if (!doc.exists) throw new Error("Hồ sơ không tồn tại!");
        const st = doc.data();
        const decPhone = st.phone ? decryptField(st.phone) : '--';
        const decParentPhone = st.parentPhone ? decryptField(st.parentPhone) : '--';
        const decStreet = st.street ? decryptField(st.street) : '';
        const fullDecAddress = decStreet ? `${decStreet}${st.ward ? ', ' + st.ward : ''}${st.city ? ', ' + st.city : ''}` : '--';
        // B. Lấy Lịch sử Khám bệnh
        const visitsSnap = await db.collection('yt_visits').where('studentId', '==', studentId).get();
        let visits = []; visitsSnap.forEach(v => visits.push(v.data()));
        visits.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        // C. Lấy Lịch sử Điểm danh (Nghỉ học)
        const attSnap = await db.collection('yt_attendance').where('studentId', '==', studentId).get();
        let attendance = []; attSnap.forEach(a => attendance.push(a.data()));
        attendance.sort((a, b) => new Date(b.date) - new Date(a.date));

        // TÍNH TOÁN BMI
        let bmiHTML = `<span style="color:#94a3b8;">Chưa cập nhật</span>`;
        if (st.height && st.weight) {
            const h = parseFloat(st.height); const w = parseFloat(st.weight);
            const bmi = (w / Math.pow(h/100, 2)).toFixed(1);
            let bmiColor = bmi < 18.5 ? "#f59e0b" : (bmi >= 25 ? "#ef4444" : "#10b981");
            let bmiStatus = bmi < 18.5 ? "Gầy" : (bmi >= 25 ? "Béo phì" : "Bình thường");
            bmiHTML = `<strong style="color:${bmiColor}; font-size:1.1rem;">${bmi}</strong> (${bmiStatus})`;
        }

        // TẠO GIAO DIỆN HTML KẾT QUẢ
        let html = `
            <!-- HEADER KẾT QUẢ -->
            <div class="form-card" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2 style="color: white; margin-bottom: 5px; font-size: 1.8rem;">${st.name}</h2>
                    <div style="font-size: 1rem; color: #94a3b8; display: flex; gap: 15px; flex-wrap: wrap;">
                        <span>Lớp: <strong style="color:white;">${st.class}</strong></span>
                        <span>Mã YT: <strong style="color:white;">${st.id}</strong></span>
                        <span>Mã HS: <strong style="color:#fef08a;">${st.studentCode || 'Chưa cập nhật'}</strong></span>
                    </div>                </div>
                <button onclick="editStudent('${st.id}', '${st.name}', '${st.class}')" class="btn" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2);">
                    <i class="fas fa-edit"></i> Chỉnh sửa
                </button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <!-- BOX 1: HÀNH CHÍNH -->
                <div class="form-card" style="margin: 0; padding: 20px;">
                    <h3 style="margin-bottom: 15px; color: #2563eb; font-size: 1.1rem;"><i class="fas fa-address-card"></i> Hành chính & Cá nhân</h3>
                    <table style="width: 100%; font-size: 0.95rem; line-height: 2;">
                        <tr><td style="color:#64748b; width: 40%;">Ngày sinh:</td><td style="font-weight:500;">${st.dob ? new Date(st.dob).toLocaleDateString('vi-VN') : '--'}</td></tr>
                        <tr><td style="color:#64748b;">Giới tính:</td><td style="font-weight:500;">${st.gender || '--'}</td></tr>
                        <tr><td style="color:#64748b;">SĐT Học sinh:</td><td style="font-weight:500;">${decPhone}</td></tr>
            		<tr><td style="color:#64748b;">SĐT Phụ huynh:</td><td style="font-weight:500;">${decParentPhone}</td></tr>
            		<tr><td style="color:#64748b; vertical-align: top;">Địa chỉ:</td><td style="font-weight:500;">${fullDecAddress}</td>
                        <tr><td style="color:#64748b;">Email liên kết:</td><td style="font-weight:500; color:#0ea5e9;">${st.linkedEmail || 'Chưa liên kết app'}</td></tr>

                    </table>
                </div>

                <!-- BOX 2: THỂ TRẠNG -->
                <div class="form-card" style="margin: 0; padding: 20px;">
                    <h3 style="margin-bottom: 15px; color: #10b981; font-size: 1.1rem;"><i class="fas fa-weight"></i> Chỉ số Thể trạng</h3>
                    <div style="display: flex; justify-content: space-between; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 15px;">
                        <div style="text-align:center;">
                            <div style="font-size:0.8rem; color:#64748b;">CHIỀU CAO</div>
                            <div style="font-size:1.3rem; font-weight:bold;">${st.height || '--'} <span style="font-size:0.9rem; font-weight:normal;">cm</span></div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:0.8rem; color:#64748b;">CÂN NẶNG</div>
                            <div style="font-size:1.3rem; font-weight:bold;">${st.weight || '--'} <span style="font-size:0.9rem; font-weight:normal;">kg</span></div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:0.8rem; color:#64748b;">CHỈ SỐ BMI</div>
                            <div>${bmiHTML}</div>
                        </div>
                    </div>
                    <div>
                        <div style="font-size:0.85rem; color:#ef4444; font-weight:bold; margin-bottom:5px;"><i class="fas fa-exclamation-triangle"></i> GHI CHÚ LÂM SÀNG / DỊ ỨNG:</div>
                        <div style="background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 8px; font-size: 0.95rem; line-height: 1.5;">
                            ${st.medicalNote || 'Không có ghi chú bệnh nền.'}
                        </div>
                    </div>
                </div>
            </div>

            <!-- BOX 3 & 4: LỊCH SỬ (Khám & Điểm danh) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                
                <!-- Lịch sử Khám bệnh -->
                <div class="form-card" style="margin: 0; padding: 20px;">
                    <h3 style="margin-bottom: 15px; color: #ef4444; font-size: 1.1rem; display:flex; justify-content:space-between;">
                        <span><i class="fas fa-notes-medical"></i> Lịch sử Khám (${visits.length})</span>
                    </h3>
                    <div style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
                        ${visits.length === 0 ? '<p style="color:#94a3b8; text-align:center;">Học sinh chưa từng khám bệnh tại trường.</p>' : ''}
                        ${visits.map(v => {
                            const date = v.timestamp ? new Date(v.timestamp.seconds * 1000).toLocaleString('vi-VN') : '';
                            return `<div style="border-left: 3px solid #ef4444; background: #f8fafc; padding: 12px; margin-bottom: 10px; border-radius: 0 8px 8px 0;">
                                <div style="font-size: 0.8rem; color: #64748b; font-weight:bold; margin-bottom: 5px;">${date}</div>
                                <div style="font-size: 0.9rem;"><strong>Triệu chứng:</strong> ${v.symptom}</div>
                                <div style="font-size: 0.9rem; color: #059669;"><strong>Xử lý:</strong> ${v.treatment}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>

                <!-- Lịch sử Điểm danh / Nghỉ học -->
                <div class="form-card" style="margin: 0; padding: 20px;">
                    <h3 style="margin-bottom: 15px; color: #f59e0b; font-size: 1.1rem; display:flex; justify-content:space-between;">
                        <span><i class="fas fa-calendar-times"></i> Lịch sử Nghỉ học (${attendance.length})</span>
                    </h3>
                    <div style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
                        ${attendance.length === 0 ? '<p style="color:#94a3b8; text-align:center;">Học sinh chưa nghỉ học ngày nào.</p>' : ''}
                        ${attendance.map(a => {
                            const dateStr = new Date(a.date).toLocaleDateString('vi-VN');
                            let reasonTag = '';
                            if(a.reason==='P') reasonTag = '<span style="background:#eff6ff; color:#3b82f6; padding:2px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">Có phép</span>';
                            else if(a.reason==='KP') reasonTag = '<span style="background:#fef2f2; color:#ef4444; padding:2px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">Không phép</span>';
                            else reasonTag = '<span style="background:#fef3c7; color:#d97706; padding:2px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">Nghỉ Bệnh</span>';

                            return `<div style="border: 1px solid #e2e8f0; padding: 12px; margin-bottom: 10px; border-radius: 8px; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div style="font-weight:bold; color:#1e293b;">${dateStr}</div>
                                    ${a.reason === 'B' ? `<div style="font-size:0.85rem; color:#64748b; margin-top:4px;">${a.diagnosis} (${a.symptom})</div>` : ''}
                                </div>
                                <div>${reasonTag}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>

            </div>
        `;

        resultDiv.innerHTML = html;
        
    } catch (error) {
        resultDiv.innerHTML = `<div style="text-align:center; color:red; padding:20px;">Lỗi: ${error.message}</div>`;
    }
}

// Ẩn bảng gợi ý khi click ra ngoài
document.addEventListener('click', function(e) {
    const suggestBox = document.getElementById('admin-lookup-suggest');
    if (suggestBox && e.target.id !== 'admin-lookup-input') {
        suggestBox.style.display = 'none';
    }
});
// ==========================================
// TÍNH NĂNG ĐĂNG BÀI BẰNG AI GEMINI (THEO FORM MẪU)
// ==========================================

function toggleAIGenerator() {
    const box = document.getElementById('ai-generator-box');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

async function generateHTMLwithAI() {
    const rawContent = document.getElementById('ai-raw-content').value.trim();
    if (!rawContent) return sysAlert("Vui lòng dán nội dung thô vào ô để AI xử lý!", "warning");

    sysLoading(true, "AI đang phân tích và viết Code...");

    try {
        // Link Cloudflare Worker của bạn
        const AI_SERVER_URL = "https://vts-health-ai.yte-thptvothisaubrvt.workers.dev"; 

        const systemPrompt = `Bạn là một chuyên gia lập trình Web HTML. Nhiệm vụ của bạn là nhận nội dung thô, hình ảnh, link Youtube từ người dùng và chuyển nó thành cấu trúc HTML theo ĐÚNG MẪU DƯỚI ĐÂY.

        QUY TẮC BẮT BUỘC:
        1. Bắt buộc giữ nguyên toàn bộ thẻ <style> và <div class="sktoandien-container">.
        2. Phân loại nội dung theo các thẻ:
           - Tiêu đề bài viết: <h1>
           - Đoạn tóm tắt: <p class="highlight">
           - Tiêu đề phụ: <h2>
           - Đoạn bình thường: <p>
           - Danh sách: <ul><li>
           - Ảnh: <img src="URL_ANH">
           - Link YouTube: <iframe src="https://www.youtube.com/embed/ID_VIDEO" style="width:100%; max-width:1000px; height:450px; border-radius:8px; margin:15px 0;" frameborder="0" allowfullscreen></iframe>
           - Nguồn/Tài liệu tham khảo: Bọc trong <div class="ref">

        MẪU BẮT BUỘC DÙNG:
        <div class="sktoandien-container">
            <style>
                .sktoandien-container { font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #333; }
                .sktoandien-container h1 { color: #27ae60; font-size: clamp(20px, 4vw, 28px); }
                .sktoandien-container h2 { color: #2c3e50; margin-top: 25px; font-size: clamp(16px, 3vw, 22px); }
                .sktoandien-container p, .sktoandien-container li { font-size: clamp(14px, 2.5vw, 16px); margin: 10px 0; max-width: 1000px; }
                .sktoandien-container img { width: 100%; max-width: 1000px; border-radius: 8px; margin: 15px 0; }
                .sktoandien-container ul { max-width: 1000px; padding-left: 20px; }
                .sktoandien-container .highlight { background: #e8f8f5; padding: 12px; border-left: 5px solid #1abc9c; border-radius: 5px; max-width: 1000px; }
                .sktoandien-container .ref { margin-top: 20px; font-size: clamp(13px, 2.3vw, 15px); }
                .sktoandien-container a { color: #2980b9; text-decoration: none; }
            </style>
            <!-- CODE HTML NẰM Ở ĐÂY -->
        </div>`;

        // 👉 ĐÂY LÀ ĐOẠN LỆNH QUAN TRỌNG ĐỂ TẮT KIỂM DUYỆT Y TẾ CỦA GOOGLE
        const response = await fetch(AI_SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt + "\n\nNỘI DUNG THÔ:\n" + rawContent }] }],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            })
        });

        const data = await response.json();

        // Bắt lỗi chi tiết
        if (data.error) {
            throw new Error(data.error.message);
        }
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            let reason = data.candidates ? data.candidates[0].finishReason : "Lỗi không xác định";
            throw new Error("AI bị ngắt giữa chừng. Lý do: " + reason);
        }

        let aiHTML = data.candidates[0].content.parts[0].text;
		aiHTML = aiHTML.replace(/```html/g, '').replace(/```/g, '').trim();

		setEditorContent(aiHTML);

        sysAlert("Thành công! AI đã tự động điền Code HTML.", "success");
        toggleAIGenerator(); 
    } catch (error) {
        sysAlert("Lỗi AI: " + error.message, "error");
        console.error(error);
    } finally {
        sysLoading(false);
    }
}
// ==========================================
// HỆ THỐNG MÁY QUÉT KHÔNG DÂY (REMOTE SCANNER)
// ==========================================
let currentSyncCode = null;
let scannerListener = null;
// Hàm tự động xóa mã kết nối khỏi Database
async function cleanupScannerData() {
    if (currentSyncCode) {
        try {
            await db.collection('yt_scanners').doc(currentSyncCode).delete();
        } catch(e) {}
    }
}

// Lắng nghe sự kiện Admin tắt tab / đóng trình duyệt
window.addEventListener('beforeunload', function (e) {
    cleanupScannerData();
});
function generateSyncCode() {
    // Xóa mã cũ (nếu có) trước khi tạo mã mới
    cleanupScannerData();
    // Tạo mã 6 chữ số ngẫu nhiên
    currentSyncCode = Math.floor(100000 + Math.random() * 900000).toString();
    document.getElementById('pc-sync-code').innerText = currentSyncCode;
    
    const statusBox = document.getElementById('scanner-status');
    statusBox.style.background = '#fffbeb'; statusBox.style.color = '#f59e0b';
    statusBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang chờ điện thoại kết nối...';

    // Tạo room trên Firebase
    db.collection('yt_scanners').doc(currentSyncCode).set({
        status: 'waiting',
        scannedData: '',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Lắng nghe điện thoại
    if(scannerListener) scannerListener();
    scannerListener = db.collection('yt_scanners').doc(currentSyncCode).onSnapshot(doc => {
        if(doc.exists) {
            const data = doc.data();
            
            // Điện thoại đã kết nối
            if(data.status === 'connected') {
                statusBox.style.background = '#f0fdf4'; statusBox.style.color = '#10b981';
                statusBox.innerHTML = '<i class="fas fa-check-circle"></i> ĐIỆN THOẠI ĐÃ KẾT NỐI SẴN SÀNG QUÉT!';
            }

            // Nhận dữ liệu quét
            if(data.scannedData && data.scannedData !== '') {
                injectScannedData(data.scannedData);
                
                // Xóa data trên Firebase sau khi nhận xong để chờ lần quét tiếp theo
                db.collection('yt_scanners').doc(currentSyncCode).update({ scannedData: '' });
            }
        }
    });
}

// Bắn dữ liệu vào ô đang Focus trên máy tính
function injectScannedData(text) {
    const activeEl = document.activeElement;
    
    // Nếu chuột đang trỏ vào một ô nhập liệu (Input hoặc Textarea)
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        activeEl.value = text;
        
        // Kích hoạt sự kiện để web hiểu là có người vừa gõ chữ
        activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        activeEl.dispatchEvent(new Event('change', { bubbles: true }));

        // THÊM: Nếu đang ở Tab Tiếp nhận và ô đang focus không phải ô Tên/Lớp, tự động điền vào ô Tên/Tìm kiếm
        if (activeEl.id === 'search-student-input') {
            filterStudentTable(); // Chạy hàm search danh sách
        }
    } else {
        // Nếu chuột đang nằm ngoài, tự động tìm ô nhập liệu hợp lý để bắn vào
        if (document.getElementById('tab-yte-tiepnhan').style.display !== 'none') {
            const ytNameInput = document.getElementById('yt-name');
            ytNameInput.value = text;
            ytNameInput.focus();
            searchStudentSuggest(text); // Tự bật gợi ý
        } else {
            alert("📷 Máy quét vừa quét được: " + text + "\n(Hãy trỏ chuột vào ô nhập liệu để chữ tự nhảy vào nhé)");
        }
    }
}
// ==========================================
// TÌM KIẾM TỰ ĐỘNG BẰNG MÃ QUÉT (BARCODE/QR)
// ==========================================

// Hàm bắt sự kiện khi Máy quét vật lý (hoặc bàn phím) nhấn Enter
function handleScanEnter(e) {
    if (e.key === 'Enter') {
        e.preventDefault(); // Ngăn trình duyệt reload
        scanStudentForReception();
    }
}

// Hàm xử lý tìm kiếm
async function scanStudentForReception() {
    const scanInput = document.getElementById('yt-scan-id');
    let scanVal = scanInput.value.trim();
    if (!scanVal) return;

    // Viết hoa toàn bộ mã YT để đồng bộ (VD: yt-12345 -> YT-12345)
    if (scanVal.toLowerCase().startsWith('yt-')) {
        scanVal = scanVal.toUpperCase();
    }

    try {
        let studentData = null;
        let studentIdStr = scanVal;

        // 1. Thử tìm bằng Mã Y Tế (Tìm theo ID Document)
        const docYT = await db.collection('yt_students').doc(scanVal).get();
        if (docYT.exists) {
            studentData = docYT.data();
        } else {
            // 2. Nếu không thấy, thử tìm bằng Mã Học Sinh (Tìm trong field studentCode)
            const snapHS = await db.collection('yt_students').where('studentCode', '==', scanVal).get();
            if (!snapHS.empty) {
                studentData = snapHS.docs[0].data();
                studentIdStr = snapHS.docs[0].id; // Lấy ID gốc để chạy hàm check lịch sử
            }
        }

        // KẾT QUẢ
        if (studentData) {
            // Điền tự động vào ô Tên và Lớp
            document.getElementById('yt-name').value = studentData.name ? decryptField(studentData.name) : '';
			document.getElementById('yt-class').value = studentData.class ? decryptField(studentData.class) : '';
            
            // Xóa rỗng ô quét để chuẩn bị cho người tiếp theo
            scanInput.value = ''; 
            
            // Chuyển con trỏ chuột xuống ô Triệu chứng để bác sĩ gõ luôn
            document.getElementById('yt-symptom').focus();

            // Tự động gọi hàm hiển thị Lịch sử và Thể trạng
            checkStudentHistory();
        } else {
            // Nếu quét không ra ai
            alert("❌ Không tìm thấy hồ sơ học sinh với mã: " + scanVal);
            scanInput.select(); // Bôi đen để quét lại
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi khi tìm kiếm mã: " + e.message);
    }
}
// ==========================================
// HỆ THỐNG GỬI THÔNG BÁO CHO HỌC SINH
// ==========================================

// ==========================================
// HỆ THỐNG GỬI THÔNG BÁO CHO HỌC SINH (BẢN NÂNG CẤP CHỌN NHIỀU)
// ==========================================

let selectedStudentsForNoti = [];
let allStudentsForNotiCache = []; 

async function toggleNotiTargetInput() {
    const type = document.getElementById('noti-target-type').value;
    const boxStandard = document.getElementById('box-noti-target-value');
    const boxStudents = document.getElementById('box-noti-target-students');
    const lbl = document.getElementById('lbl-noti-target-value');
    const input = document.getElementById('noti-target-value');

    if (type === 'all') {
        boxStandard.style.display = 'none';
        boxStudents.style.display = 'none';
        input.value = '';
    } else if (type === 'student') {
        boxStandard.style.display = 'none';
        boxStudents.style.display = 'block';
        
        // Tận dụng trực tiếp bộ nhớ đệm dùng chung của trang
        allStudentsForNotiCache = await getStudentsList();
    } else {
        boxStandard.style.display = 'block';
        boxStudents.style.display = 'none';
        if (type === 'grade') { lbl.innerText = "Nhập số Khối"; input.placeholder = "VD: 10, 11, 12"; }
        if (type === 'class') { lbl.innerText = "Nhập tên Lớp"; input.placeholder = "VD: 11A4"; }
    }
}
// 2. Thuật toán tìm kiếm hiển thị
function handleSearchStudentForNoti(query) {
    const resDiv = document.getElementById('noti-search-results');
    if (!query || query.trim().length < 2) {
        resDiv.style.display = 'none'; return;
    }

    const q = removeVietnameseTones(query.trim());
    const matched = allStudentsForNotiCache.filter(s => {
        const str = `${s.name_search} ${s.class.toLowerCase()} ${s.id.toLowerCase()} ${(s.studentCode || '').toLowerCase()}`;
        return str.includes(q);
    }).slice(0, 15); // Hiện max 15 kết quả

    if (matched.length === 0) {
        resDiv.innerHTML = '<div style="padding:10px; color:#ef4444; text-align:center;">Không tìm thấy học sinh!</div>';
    } else {
        let html = '';
        matched.forEach(s => {
            const isSelected = selectedStudentsForNoti.some(item => item.id === s.id);
            html += `
                <div style="padding: 10px 15px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #0f172a;">${s.name}</strong> <span style="color:#ef4444; font-weight:bold; font-size:0.85rem;">(${s.class})</span><br>
                        <span style="font-size:0.75rem; color:#64748b;">Mã: ${s.id}</span>
                    </div>
                    <button type="button" onclick="toggleSelectStudentNoti('${s.id}', '${s.name}', '${s.class}')" class="btn btn-sm" style="background: ${isSelected ? '#fef2f2' : '#eff6ff'}; color: ${isSelected ? '#ef4444' : '#2563eb'}; border: 1px solid ${isSelected ? '#fca5a5' : '#bfdbfe'}; font-weight: bold;">
                        ${isSelected ? '<i class="fas fa-times"></i> Bỏ chọn' : '<i class="fas fa-check"></i> Chọn'}
                    </button>
                </div>
            `;
        });
        resDiv.innerHTML = html;
    }
    resDiv.style.display = 'block';
}

// 3. Xử lý khi nhấn nút "Chọn / Bỏ chọn"
function toggleSelectStudentNoti(id, name, className) {
    const index = selectedStudentsForNoti.findIndex(s => s.id === id);
    if (index > -1) {
        selectedStudentsForNoti.splice(index, 1); // Xóa khỏi danh sách
    } else {
        selectedStudentsForNoti.push({ id, name, class: className }); // Thêm vào
    }
    
    renderSelectedStudentsNoti();
    
    // Refresh lại ô kết quả tìm kiếm để cập nhật màu nút
    const currentSearch = document.getElementById('noti-search-student-input').value;
    handleSearchStudentForNoti(currentSearch);
}

// 4. In danh sách đã chọn ra màn hình
function renderSelectedStudentsNoti() {
    document.getElementById('noti-selected-count').innerText = selectedStudentsForNoti.length;
    const listDiv = document.getElementById('noti-selected-list');
    listDiv.innerHTML = '';
    
    if(selectedStudentsForNoti.length === 0) {
        listDiv.innerHTML = '<div style="font-size: 0.8rem; color: #94a3b8; font-style: italic;">Chưa chọn ai...</div>';
        return;
    }

    selectedStudentsForNoti.forEach(s => {
        listDiv.innerHTML += `
            <div style="background: #2563eb; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; display: flex; align-items: center; gap: 8px; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${s.name} (${s.class})
                <i class="fas fa-times-circle" style="color: #cbd5e1; cursor: pointer; font-size: 1rem;" title="Xóa" onclick="toggleSelectStudentNoti('${s.id}')"></i>
            </div>
        `;
    });
}
// --- HÀM PHỤ TRỢ: LẤY DANH SÁCH EMAIL CỦA ĐỐI TƯỢNG NHẬN THÔNG BÁO ---
async function getTargetEmailsForNoti(targetType, targetValue) {
    let emails = [];
    // Tận dụng đệm danh sách học sinh từ RAM
    const allStudents = await getStudentsList();

    if (targetType === 'student') {
        // targetValue là mảng chứa danh sách ID học sinh [ 'YT-123', 'YT-456' ]
        if (Array.isArray(targetValue)) {
            emails = allStudents
                .filter(s => targetValue.includes(s.id) && s.linkedEmail && s.linkedEmail.trim() !== '')
                .map(s => s.linkedEmail.trim());
        }
    } else if (targetType === 'class') {
        // Lọc theo Lớp (VD: "11A4")
        emails = allStudents
            .filter(s => (s.class || "").toUpperCase() === targetValue.toUpperCase() && s.linkedEmail && s.linkedEmail.trim() !== '')
            .map(s => s.linkedEmail.trim());
    } else if (targetType === 'grade') {
        // Lọc theo Khối (VD: "10", "11", "12")
        emails = allStudents
            .filter(s => (s.class || "").startsWith(targetValue) && s.linkedEmail && s.linkedEmail.trim() !== '')
            .map(s => s.linkedEmail.trim());
    } else if (targetType === 'all') {
        // Lấy tất cả học sinh toàn trường có liên kết email
        emails = allStudents
            .filter(s => s.linkedEmail && s.linkedEmail.trim() !== '')
            .map(s => s.linkedEmail.trim());
    }

    // Loại bỏ các email trùng lặp (nếu có)
    return [...new Set(emails)];
}
// 5. Gửi thông báo lên Firebase
async function sendStudentNotification() {
    const title = document.getElementById('noti-title').value.trim();
    const content = document.getElementById('noti-content').value.trim();
    const targetType = document.getElementById('noti-target-type').value;
    let targetValue = document.getElementById('noti-target-value').value.trim();
    const isSendEmail = document.getElementById('chk-send-email').checked;

    if (!title || !content) return sysAlert("Vui lòng nhập Tiêu đề và Nội dung!", "warning");
    
    let finalTargetValue = "";

    if (targetType === 'all') {
        finalTargetValue = "all";
    } else if (targetType === 'student') {
        if (selectedStudentsForNoti.length === 0) return sysAlert("Vui lòng chọn ít nhất 1 học sinh ở bảng bên dưới!", "warning");
        finalTargetValue = selectedStudentsForNoti.map(s => s.id); 
    } else {
        if (!targetValue) return sysAlert("Vui lòng nhập đối tượng nhận!", "warning");
        finalTargetValue = targetType === 'class' ? targetValue.toUpperCase() : targetValue;
    }

    const btn = document.querySelector('button[onclick="sendStudentNotification()"]');
    let ogText = "";
    if (btn) {
        ogText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
        btn.disabled = true;
    }

    try {
        // 1. Lưu thông báo lên cơ sở dữ liệu Firebase
        await db.collection('yt_notifications').add({
            title: title,
            content: content,
            targetType: targetType,
            targetValue: finalTargetValue,
            sender: "Phòng Y Tế",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. XỬ LÝ GỬI EMAIL NẾU ĐƯỢC TICK CHỌN
        if (isSendEmail) {
            sysLoading(true, "Đang quét danh sách Email liên kết...");
            const emailList = await getTargetEmailsForNoti(targetType, finalTargetValue);

            if (emailList.length === 0) {
                sysLoading(false);
                sysAlert("⚠️ Đã tạo thông báo trên App, nhưng KHÔNG tìm thấy học sinh nào có liên kết Email trong danh sách đối tượng chọn!", "warning");
            } else {
                sysLoading(true, `Đang gửi Email tới ${emailList.length} địa chỉ...`);
                let successEmailCount = 0;

                const mailSubject = `${title} - [Trường Trung học Phổ thông Võ Thị Sáu - Bà Rịa - Vũng Tàu] `;
                const isHtmlContent = /<[a-z][\s\S]*>/i.test(content);

                const mandatoryFooter = `
                    <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
                        <p style="margin: 0 0 4px 0; font-style: italic;">Email này được gửi tự động từ Hệ thống Y tế số THPT Võ Thị Sáu.</p>
                        <p style="margin: 0; font-weight: bold; color: #334155;">Bộ phận Chăm sóc khách hàng: <a href="mailto:yte.thptvothisaubrvt@gmail.com" style="color: #0284c7; text-decoration: none;">yte.thptvothisaubrvt@gmail.com</a></p>
                    </div>
                `;

                let mailHtmlBody = "";
                if (isHtmlContent) {
                    mailHtmlBody = `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 650px; margin: 0 auto; padding: 20px;">
                            ${content}
                            ${mandatoryFooter}
                        </div>
                    `;
                } else {
                    mailHtmlBody = `
                        <div style="background-color: #f8fafc; padding: 30px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155;">
                            <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
                                <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 25px 30px; text-align: left;">
                                    <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); color: #ffffff; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                                        THÔNG BÁO TỪ PHÒNG Y TẾ
                                    </div>
                                    <h2 style="color: #ffffff; margin: 0; font-size: 19px; font-weight: 700; line-height: 1.3;">${title}</h2>
                                </div>
                                <div style="padding: 25px 30px;">
                                    <div style="margin-bottom: 18px; color: #64748b; font-size: 13px; font-weight: 600;">
                                        <span style="background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; margin-right: 6px;">Từ</span>
                                        Phòng Y Tế - Trường THPT Võ Thị Sáu
                                    </div>
                                    <div style="background-color: #f8fafc; padding: 18px 20px; border-radius: 12px; border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; font-size: 14.5px; color: #1e293b; white-space: pre-wrap; line-height: 1.6;">${content}</div>
                                    ${mandatoryFooter}
                                </div>
                            </div>
                        </div>
                    `;
                }

                // Gửi qua bộ điều phối EmailService
                for (const recipientEmail of emailList) {
                    try {
                        await EmailService.sendEmail({
                            to: recipientEmail,
                            subject: mailSubject,
                            htmlBody: mailHtmlBody
                        });
                        successEmailCount++;
                    } catch (err) {
                        console.warn(`[NotiEmail] Gửi thất bại tới ${recipientEmail}:`, err.message);
                    }
                }

                sysLoading(false);
                sysAlert(`✅ Đã gửi thông báo trên App & gửi thành công ${successEmailCount}/${emailList.length} Email!`, "success");
            }
        } else {
            sysAlert("✅ Đã gửi thông báo thành công!", "success");
        }

        closeNewNotiModal();
    } catch (e) {
        sysAlert("Lỗi gửi thông báo: " + e.message, "error");
    } finally {
        sysLoading(false);
        if (btn) {
            btn.innerHTML = ogText;
            btn.disabled = false;
        }
    }
}
// 6. Tải danh sách đã gửi
// 1. Thay đổi bộ lọc hiện tại khi người dùng click
function changeNotiFilter(filterType) {
    currentNotiFilter = filterType;
    
    // Cập nhật trạng thái hiển thị các nút bộ lọc
    const filters = ['all', 'all_school', 'grade', 'class', 'student'];
    filters.forEach(f => {
        const btn = document.getElementById(`btn-noti-flt-${f}`);
        if(btn) {
            if(f === filterType) {
                btn.style.background = '#0062ff'; 
                btn.style.color = 'white'; 
                btn.style.borderColor = '#0062ff';
            } else {
                btn.style.background = 'white'; 
                btn.style.color = '#64748b'; 
                btn.style.borderColor = '#cbd5e1';
            }
        }
    });

    // Vẽ lại bảng với dữ liệu đã lọc
    renderAdminNotificationsTable();
}

// 2. Lắng nghe và đồng bộ dữ liệu thông báo thời gian thực
function loadAdminNotifications() {
    const tbody = document.getElementById('admin-noti-list-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> Đang tải lịch sử thông báo...</td></tr>';

    if (notiFirebaseListener) notiFirebaseListener();

    notiFirebaseListener = db.collection('yt_notifications')
        .onSnapshot(snap => {
            cachedNotifications = [];
            
            // Biến đếm số lượng cho từng bộ lọc phân loại
            let counts = { all: 0, all_school: 0, grade: 0, class: 0, student: 0 };

            snap.forEach(doc => {
                const d = { id: doc.id, ...doc.data() };
                cachedNotifications.push(d);
                
                // Tăng bộ đếm dựa trên phân loại đối tượng nhận
                counts.all++;
                if (d.targetType === 'all') counts.all_school++;
                if (d.targetType === 'grade') counts.grade++;
                if (d.targetType === 'class') counts.class++;
                if (d.targetType === 'student') counts.student++;
            });

            // Sắp xếp thông báo mới nhất lên đầu
            cachedNotifications.sort((a, b) => {
                const timeA = a.timestamp ? a.timestamp.seconds : 0;
                const timeB = b.timestamp ? b.timestamp.seconds : 0;
                return timeB - timeA;
            });

            // Cập nhật số lượng hiển thị trên các Badge của tab bộ lọc
            document.getElementById('badge-noti-all').innerText = counts.all;
            document.getElementById('badge-noti-all_school').innerText = counts.all_school;
            document.getElementById('badge-noti-grade').innerText = counts.grade;
            document.getElementById('badge-noti-class').innerText = counts.class;
            document.getElementById('badge-noti-student').innerText = counts.student;

            // Tiến hành dựng cấu trúc bảng
            renderAdminNotificationsTable();
        }, error => {
            console.error("Lỗi đồng bộ thông báo:", error);
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red; padding:30px;">Lỗi tải dữ liệu: ${error.message}</td></tr>`;
        });
}

// 3. Hàm xuất nội dung bảng dựa trên bộ nhớ đệm
function renderAdminNotificationsTable() {
    const tbody = document.getElementById('admin-noti-list-table');
    if (!tbody) return;

    // Lọc mảng dữ liệu dựa trên tab đang kích hoạt
    let filteredData = cachedNotifications;
    if (currentNotiFilter !== 'all') {
        const filterTargetMap = {
            'all_school': 'all',
            'grade': 'grade',
            'class': 'class',
            'student': 'student'
        };
        filteredData = cachedNotifications.filter(d => d.targetType === filterTargetMap[currentNotiFilter]);
    }

    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b; padding:30px;"><i class="fas fa-envelope-open fa-2x" style="opacity:0.3; margin-bottom:10px;"></i><br>Không có thông báo nào trong mục này.</td></tr>`;
        return;
    }

    let htmlString = '';
    filteredData.forEach(d => {
        const time = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString('vi-VN') : 'Vừa xong';
        
        // Thiết kế nhãn đối tượng nhận tương thích
        let targetTag = "";
        if (d.targetType === 'all') {
            targetTag = '<span style="color:#10b981; background:#f0fdf4; padding:3px 8px; border-radius:5px;"><i class="fas fa-globe"></i> Toàn trường</span>';
        } else if (d.targetType === 'grade') {
            targetTag = `<span style="color:#f59e0b; background:#fffbeb; padding:3px 8px; border-radius:5px;"><i class="fas fa-layer-group"></i> Khối ${d.targetValue}</span>`;
        } else if (d.targetType === 'class') {
            targetTag = `<span style="color:#3b82f6; background:#eff6ff; padding:3px 8px; border-radius:5px;"><i class="fas fa-users"></i> Lớp ${d.targetValue}</span>`;
        } else if (d.targetType === 'student') {
            let count = Array.isArray(d.targetValue) ? d.targetValue.length : 1;
            targetTag = `<span style="color:#8b5cf6; background:#f5f3ff; padding:3px 8px; border-radius:5px;"><i class="fas fa-user"></i> ${count} Học sinh</span>`;
        } else {
            targetTag = `<span style="color:#64748b; background:#f8fafc; padding:3px 8px; border-radius:5px;">${d.targetType}</span>`;
        }

        htmlString += `
            <tr style="transition: 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="font-weight:bold; color:#0f172a;">${d.title}</td>
                <td>${targetTag}</td>
                <td style="font-size:0.85rem; color:#64748b;">${time}</td>
                <td>
                    <a href="../view_noti.html?id=${d.id}" target="_blank" class="btn" style="padding:6px 12px; font-size:0.85rem; background:#e0e7ff; color:#3b82f6; text-decoration:none;"><i class="fas fa-link"></i> Link</a>
                    <button onclick="deleteNotification('${d.id}')" class="btn" style="padding:6px 12px; font-size:0.85rem; background:#fee2e2; color:#ef4444; margin-left:5px;"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = htmlString;
}
// Thêm hàm xóa thông báo
async function deleteNotification(docId) {
    if(confirm("Bạn có chắc chắn muốn thu hồi (xóa) thông báo này?")) {
        await db.collection('yt_notifications').doc(docId).delete();
    }
}
// ==========================================
// HỆ THỐNG CHUÔNG THÔNG BÁO TỪ FUSOFTX (ĐÃ FIX LỖI)
// ==========================================
let adminFusoftxNotisCache = [];

function toggleAdminNotiModal() {
    const modal = document.getElementById('admin-noti-modal');
    modal.style.display = modal.style.display === 'none' || modal.style.display === '' ? 'flex' : 'none';
    document.getElementById('admin-noti-badge').style.display = 'none';
    document.getElementById('admin-bell-icon').style.color = '#cbd5e1';
}
// ==============================================================
// BỘ HỖ TRỢ: PHÁT ÂM THANH CHUÔNG BÁO & NHẤP NHÁY TAB CHUẨN XÁC
// ==============================================================
let titleBlinkInterval = null;
let originalPageTitle = document.title || "Admin Y tế số";
let globalAudioCtx = null;
let isFirstLoadNoti = true; // Biến cờ phân biệt lần tải đầu tiên và tin nhắn mới tới

// 1. Kích hoạt quyền âm thanh ngay khi Admin click chuột
function unlockAudioContext() {
    try {
        if (!globalAudioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) globalAudioCtx = new AudioContext();
        }
        if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
            globalAudioCtx.resume();
        }
    } catch(e) {}
}
['click', 'keydown', 'touchstart', 'mousedown'].forEach(evt => {
    document.addEventListener(evt, unlockAudioContext, { capture: true, passive: true });
});

// 2. Hàm phát chuông Ting-Ting chuẩn y tế (5 giây)
async function playNotificationSound5s() {
    try {
        unlockAudioContext();
        if (!globalAudioCtx || globalAudioCtx.state !== 'running') return;

        const ctx = globalAudioCtx;
        let startTime = ctx.currentTime;

        // Kêu 4 nhịp chuông đôi nhẹ nhàng
        for (let i = 0; i < 4; i++) {
            let noteTime = startTime + i * 1.1; 
            
            // Âm cao (Ding - 880Hz)
            let osc1 = ctx.createOscillator();
            let gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, noteTime);
            gain1.gain.setValueAtTime(0.35, noteTime);
            gain1.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.35);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(noteTime);
            osc1.stop(noteTime + 0.35);

            // Âm trầm (Dong - 659.25Hz)
            let osc2 = ctx.createOscillator();
            let gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(659.25, noteTime + 0.2);
            gain2.gain.setValueAtTime(0.4, noteTime + 0.2);
            gain2.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.6);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(noteTime + 0.2);
            osc2.stop(noteTime + 0.6);
        }
    } catch (e) {
        console.warn("[Audio] Không thể phát âm thanh:", e);
    }
}

// 3. Hàm nhấp nháy tiêu đề Tab
function triggerTabBlinking(customText = "🚨 CÓ THÔNG BÁO MỚI!") {
    if (titleBlinkInterval) clearInterval(titleBlinkInterval);
    let isAlert = false;
    let count = 0;
    
    titleBlinkInterval = setInterval(() => {
        document.title = isAlert ? `[${customText}]` : "🔔 " + originalPageTitle;
        isAlert = !isAlert;
        count++;

        if (count >= 14) { // Nhấp nháy khoảng 7 giây
            clearInterval(titleBlinkInterval);
            titleBlinkInterval = null;
            document.title = originalPageTitle;
        }
    }, 500);
}

// 4. Kích hoạt cả Chuông + Nhấp nháy
function notifyAdminWithSoundAndBlink() {
    playNotificationSound5s();
    triggerTabBlinking();
}

// ==============================================================
// TẢI VÀ ĐỒNG BỘ THÔNG BÁO REAL-TIME
// ==============================================================
function loadFusoftxNotis() {
    const listDiv = document.getElementById('admin-notifications-list');
    if (!listDiv) return;

    const currentUser = firebase.auth().currentUser;
    const userDocKey = currentUser ? `admin_reads_${currentUser.uid}` : 'admin_reads_guest';

    db.collection('settings').doc(userDocKey).onSnapshot(settingSnap => {
        let readNotis = [];
        if (settingSnap.exists && settingSnap.data().readNotis) {
            readNotis = settingSnap.data().readNotis;
        }

        db.collection('yt_notifications').onSnapshot(snap => {
            let notis = [];
            let hasNewIncomingDoc = false;

            if (!isFirstLoadNoti) {
                snap.docChanges().forEach(change => {
                    if (change.type === "added") {
                        const newDoc = change.doc.data();
                        if (newDoc.sender === 'FUSoftX' || newDoc.targetType === 'admin' || newDoc.targetType === 'admin_only') {
                            hasNewIncomingDoc = true;
                        }
                    }
                });
            }

            snap.forEach(doc => {
                const d = doc.data();
                if (d.sender === 'FUSoftX' || d.targetType === 'admin' || d.targetType === 'admin_only') {
                    notis.push({ id: doc.id, ...d });
                }
            });

            notis.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            adminFusoftxNotisCache = notis;

            let html = '';
            let unreadCount = 0;

            notis.forEach(d => {
                const notiId = d.id;
                const isRead = readNotis.includes(notiId);
                if (!isRead) unreadCount++;

                const time = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString('vi-VN') : 'Vừa xong';
                const isSickAlert = d.type === 'sick_alert';
                const borderCol = isRead ? '#cbd5e1' : (isSickAlert ? '#ef4444' : '#0062ff');
                const icon = isSickAlert ? '🚨' : '📩';
                const bgCol = isRead ? '#f8fafc' : '#ffffff';
                const opacityStyle = isRead ? 'opacity: 0.75;' : 'opacity: 1;';
                const statusIconCol = isRead ? '#10b981' : '#cbd5e1';

                html += `
                    <div style="background: ${bgCol}; padding: 12px; border-radius: 10px; border-left: 4px solid ${borderCol}; position: relative; cursor: pointer; transition: 0.2s; margin-bottom: 10px; border: 1px solid #e2e8f0; border-left-width: 4px; ${opacityStyle}" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='${bgCol}'">
                        <div onclick="openAdminNotiDetail('${notiId}')" style="padding-right: 30px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b; margin-bottom: 5px;">
                                <span>${time}</span>
                                ${isRead ? '<span style="color:#10b981; font-weight:600;"><i class="fas fa-check"></i> Đã đọc</span>' : '<span style="color:#ef4444; font-weight:600;">● Mới</span>'}
                            </div>
                            <div style="font-weight: bold; color: ${isRead ? '#475569' : borderCol}; margin-bottom: 5px; font-size: 0.95rem;">${icon} ${d.title}</div>
                            <div style="font-size: 0.85rem; color: ${isRead ? '#64748b' : '#334155'}; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5;">${d.content}</div>
                        </div>
                        <button onclick="event.stopPropagation(); markAdminNotiAsRead('${notiId}')" style="position: absolute; top: 12px; right: 10px; background: none; border: none; color: ${statusIconCol}; cursor: pointer; font-size: 1.2rem;" title="${isRead ? 'Đã đọc' : 'Đánh dấu đã đọc'}">
                            <i class="fas fa-check-circle"></i>
                        </button>
                    </div>
                `;
            });

            if (notis.length === 0) {
                listDiv.innerHTML = '<div style="text-align:center; color:#94a3b8; padding: 20px;"><i class="fas fa-envelope-open fa-2x" style="opacity:0.3; margin-bottom:10px;"></i><br>Không có thông báo nào.</div>';
                document.getElementById('admin-noti-badge').style.display = 'none';
                document.getElementById('admin-bell-icon').style.color = '#cbd5e1';
            } else {
                listDiv.innerHTML = html;
                
                if (unreadCount > 0) {
                    document.getElementById('admin-noti-badge').style.display = 'block';
                    document.getElementById('admin-bell-icon').style.color = '#ef4444';

                    if (hasNewIncomingDoc) {
                        notifyAdminWithSoundAndBlink();
                    } else if (isFirstLoadNoti) {
                        triggerTabBlinking();
                    }
                } else {
                    document.getElementById('admin-noti-badge').style.display = 'none';
                    document.getElementById('admin-bell-icon').style.color = '#cbd5e1';
                }
            }

            isFirstLoadNoti = false;
        });
    });
}
// Lưu thông báo đã đọc riêng cho từng UID của Admin
async function markAdminNotiAsRead(notiId) {
    try {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) return;
        const userDocKey = `admin_reads_${currentUser.uid}`;

        await db.collection('settings').doc(userDocKey).set({
            readNotis: firebase.firestore.FieldValue.arrayUnion(notiId)
        }, { merge: true });
    } catch(e) {
        console.error("Lỗi đánh dấu đã đọc:", e);
    }
}
function openAdminNotiDetail(notiId) {
    const noti = adminFusoftxNotisCache.find(n => n.id === notiId);
    if(!noti) return;
    
    const time = noti.timestamp ? new Date(noti.timestamp.seconds * 1000).toLocaleString('vi-VN') : '';
    document.getElementById('admin-detail-noti-sender').innerHTML = `<i class="fas fa-satellite-dish"></i> Từ: ${noti.sender} &nbsp;|&nbsp; ${time}`;
    document.getElementById('admin-detail-noti-title').innerText = noti.title;
    document.getElementById('admin-detail-noti-content').innerText = noti.content;
    
    const btn = document.getElementById('btn-admin-read-inside');
    btn.onclick = () => {
        markAdminNotiAsRead(notiId);
        document.getElementById('admin-noti-detail-modal').style.display = 'none';
    };

    let sickActionBtn = document.getElementById('btn-goto-sick-diagnosis');
    if (!sickActionBtn) {
        sickActionBtn = document.createElement('a');
        sickActionBtn.id = 'btn-goto-sick-diagnosis';
        sickActionBtn.className = 'btn';
        sickActionBtn.style.cssText = 'background: #ef4444; color: white; text-decoration: none; font-weight: bold; padding: 8px 16px; border-radius: 8px; display: inline-flex; align-items: center; gap: 8px; margin-right: 10px; font-size: 0.9rem;';
        // Chèn vào cạnh nút Đã đọc trong modal
        btn.parentNode.insertBefore(sickActionBtn, btn);
    }

    if (noti.type === 'sick_alert' && noti.relatedAttendanceId) {
        sickActionBtn.style.display = 'inline-flex';
        sickActionBtn.innerHTML = '<i class="fas fa-stethoscope"></i> Chẩn đoán bệnh ngay';
        sickActionBtn.href = `baocao.html?editSickId=${noti.relatedAttendanceId}`;
        sickActionBtn.onclick = () => {
            markAdminNotiAsRead(notiId);
        };
    } else {
        sickActionBtn.style.display = 'none';
    }

    document.getElementById('admin-noti-detail-modal').style.display = 'flex';
}
// 2. Chat Hỗ trợ với FUSoftX
async function createFusoftxTicket() {
    const content = document.getElementById('sp-req-content').value.trim();
    if(!content) return alert("Vui lòng nhập nội dung yêu cầu!");

    const firstLine = content.split('\n')[0].substring(0, 50); // Lấy dòng đầu làm tiêu đề
    const msg = { sender: 'admin', senderName: 'Phòng Y Tế', text: content, time: Date.now() };
    const ticketId = "SP-" + Math.floor(Math.random() * 90000 + 10000);

    await db.collection('yt_admin_support').add({
        ticketId: ticketId,
        title: firstLine, // Sử dụng tiêu đề tự động
        status: 'pending',
        messages: [msg],
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById('sp-req-content').value = '';
    document.getElementById('box-new-support').style.display = 'none';
    alert("Đã gửi yêu cầu kỹ thuật lên FUSoftX!");
}
// Khai báo biến công tắc ngắt luồng Firebase
let fusoftxTicketListener = null;

function loadFusoftxTickets() {
    const tbody = document.getElementById('admin-fusoftx-tickets-table');
    if(!tbody) return;

    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>';

    // TẮT LUỒNG DỮ LIỆU CŨ
    if (fusoftxTicketListener) fusoftxTicketListener();

    // BẬT LUỒNG MỚI
    fusoftxTicketListener = db.collection('yt_admin_support').orderBy('timestamp', 'desc').onSnapshot(snap => {
        if(!tbody) return;
        if(snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Chưa có yêu cầu hỗ trợ nào.</td></tr>';
            return;
        }

        let htmlString = '';
        snap.forEach(doc => {
            const t = doc.data();
            
            // Xử lý lấy nội dung tin nhắn cuối cùng (Chống lỗi nếu mảng rỗng)
            const lastMsg = (t.messages && t.messages.length > 0) ? t.messages[t.messages.length - 1].text : "Không có nội dung";
            const time = t.timestamp ? new Date(t.timestamp.seconds * 1000).toLocaleString('vi-VN') : '';
            const statusColor = t.status === 'resolved' ? '#64748b' : '#f59e0b';
            
            htmlString += `
                <tr style="transition: 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                    <td style="font-weight:bold; color:#f59e0b;">${t.ticketId}</td>
                    <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;">${lastMsg}</td>
                    <td><span style="color:${statusColor}; font-weight:bold;">${t.status === 'resolved' ? 'Đã đóng' : 'Đang xử lý'}</span></td>
                    <td style="font-size:0.8rem; color:#64748b;">${time}</td>
                    <td>
                        <!-- ĐÃ THÊM NÚT XÓA Ở ĐÂY -->
                        <a href="detail.html?type=fusoftx_support&id=${doc.id}" class="btn" style="padding:6px 12px; font-size:0.85rem; background:#e0e7ff; color:#3b82f6;">Xem</a>
                        <button onclick="deleteFusoftxSupportTicket('${doc.id}')" class="btn" style="padding:6px 12px; font-size:0.85rem; background:#fee2e2; color:#ef4444; margin-left:5px;"><i class="fas fa-trash"></i> Xóa</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = htmlString;
    });
}

// HÀM XÓA TICKET FUSOFTX
async function deleteFusoftxSupportTicket(docId) {
    if(confirm("Hành động này sẽ xóa toàn bộ lịch sử đoạn chat hỗ trợ này. Bạn có chắc chắn không?")) {
        try {
            await db.collection('yt_admin_support').doc(docId).delete();
        } catch(e) {
            alert("Lỗi khi xóa: " + e.message);
        }
    }
}
// HÀM CHỐT SỔ THỐNG KÊ (DÀNH CHO ADMIN)
    async function runDailyStatisticAggregation() {
        console.log("Checking if daily stats aggregation is needed...");
        try {
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();
            const monthId = `${currentMonth.toString().padStart(2, '0')}-${currentYear}`;

            const statRef = db.collection('yt_stats').doc(monthId);
            const statDoc = await statRef.get();

            // Kiểm tra xem hôm nay đã cập nhật chưa?
            if (statDoc.exists) {
                const lastUpdated = statDoc.data().lastUpdated.toDate();
                if (lastUpdated.getDate() === today.getDate() && 
                    lastUpdated.getMonth() === today.getMonth() &&
                    lastUpdated.getFullYear() === today.getFullYear()) {
                    console.log("Dữ liệu thống kê đã được cập nhật hôm nay rồi. Bỏ qua.");
                    return { status: 'skipped', message: 'Đã cập nhật hôm nay.' };
                }
            }

            console.log("Bắt đầu tính toán chốt sổ dữ liệu Y tế...");
            const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
            const endOfYesterday = new Date();
            endOfYesterday.setHours(0, 0, 0, 0);

            const snap = await db.collection('yt_visits')
                .where('timestamp', '>=', startOfMonth)
                .where('timestamp', '<', endOfYesterday)
                .get();

            let symptomCounts = {};
            let studentVisitCounts = {};

            snap.forEach(doc => {
                const v = doc.data();
                if (v.symptom) {
                    let symps = v.symptom.toLowerCase().split(/[,+\/]+|\s+và\s+/g);
                    symps.forEach(s => {
                        let cleanS = s.trim();
                        if (cleanS.length > 0) {
                            cleanS = cleanS.charAt(0).toUpperCase() + cleanS.slice(1);
                            symptomCounts[cleanS] = (symptomCounts[cleanS] || 0) + 1;
                        }
                    });
                }
                if (v.studentId) {
                    studentVisitCounts[v.studentId] = (studentVisitCounts[v.studentId] || 0) + 1;
                }
            });

            let topSymptomsArray = Object.keys(symptomCounts)
                .map(k => ({ name: k, count: symptomCounts[k] }))
                .sort((a, b) => b.count - a.count);

            await statRef.set({
                monthInfo: monthId,
                lastUpdated: new Date(),
                topSymptoms: topSymptomsArray,
                studentVisits: studentVisitCounts
            }, { merge: true }); // Dùng merge để không ghi đè cấu trúc doc

            console.log(`Đã chốt sổ thành công dữ liệu cho tháng ${monthId}`);
            return { status: 'success', message: `Chốt sổ thành công dữ liệu tháng ${currentMonth}/${currentYear}!` };

        } catch (error) {
            console.error("Lỗi khi chạy hàm chốt sổ thống kê: ", error);
            return { status: 'error', message: 'Có lỗi xảy ra: ' + error.message };
        }
    }
// ==========================================
// TÍCH HỢP XUẤT KHO DƯỢC TẠI BÀN TIẾP NHẬN
// ==========================================
let ytPharmacyCache = []; // Bộ nhớ đệm danh mục thuốc
let pendingMedicineDeductions = []; // Danh sách thuốc chuẩn bị cấp phát

// 1. Tải danh mục thuốc ngầm khi Admin đăng nhập
function loadPharmacyForReception() {
    db.collection('yt_pharmacy_items').onSnapshot(snap => {
        ytPharmacyCache = [];
        snap.forEach(doc => ytPharmacyCache.push({ id: doc.id, ...doc.data() }));
    });
}

// Bật tắt khu vực chọn thuốc
function toggleMedicineSection() {
    const isChecked = document.getElementById('chk-cap-thuoc').checked;
    document.getElementById('medicine-section').style.display = isChecked ? 'block' : 'none';
}

// 2. Tìm kiếm thuốc (Autocomplete)
function searchMedicineForReception(val) {
    const box = document.getElementById('med-suggest-box');
    if (val.trim().length < 2) { box.style.display = 'none'; return; }

    const keyword = removeVietnameseTones(val.trim());
    const matched = ytPharmacyCache.filter(item => {
        // Lọc những thuốc/vật tư còn lô hàng có số lượng > 0
        const hasStock = item.batches && item.batches.some(b => parseFloat(b.qty) > 0);
        return hasStock && removeVietnameseTones(item.name).includes(keyword);
    });

    box.innerHTML = '';
    if (matched.length === 0) {
        box.innerHTML = '<div style="padding:10px; color:#ef4444; font-size:0.85rem;">Không tìm thấy hoặc Đã hết hàng!</div>';
    } else {
        matched.forEach(d => {
            const el = document.createElement('div');
            el.className = 'suggest-item';
            el.innerHTML = `<strong>${d.name}</strong> <span style="font-size:0.8rem; color:#64748b;">(${d.type==='drug'?'Thuốc':'Vật tư'})</span>`;
            el.onclick = () => selectMedicineForReception(d);
            box.appendChild(el);
        });
    }
    box.style.display = 'block';
}

// 3. Chọn thuốc -> Hiển thị các Lô hàng
function selectMedicineForReception(item) {
    document.getElementById('med-search-input').value = item.name;
    document.getElementById('med-selected-id').value = item.id;
    document.getElementById('med-selected-name').value = item.name;
    document.getElementById('med-selected-unit').value = item.unit;
    document.getElementById('med-suggest-box').style.display = 'none';

    const batchSelect = document.getElementById('med-batch-select');
    batchSelect.innerHTML = '<option value="">-- Chọn Lô --</option>';
    
    if (item.batches) {
        item.batches.forEach((b, index) => {
            if (parseFloat(b.qty) > 0) {
                let expDisplay = b.expiry ? `HSD: ${b.expiry}` : "Không HSD";
                let expAlert = (b.expiry && new Date(b.expiry) < new Date()) ? ' [HẾT HẠN]' : '';
                
                batchSelect.innerHTML += `<option value="${index}">Lô ${b.lot} (Tồn: ${b.qty}) - ${expDisplay}${expAlert}</option>`;
            }
        });
    }
}
// 4. Nhấn Thêm -> Ghi nhận & Chèn chữ vào ô Xử lý
function addMedicineToTreatment() {
    const id = document.getElementById('med-selected-id').value;
    const name = document.getElementById('med-selected-name').value;
    const unit = document.getElementById('med-selected-unit').value;
    const batchIndex = document.getElementById('med-batch-select').value;
    const qty = parseFloat(document.getElementById('med-qty-input').value);

    if (!id || batchIndex === "" || isNaN(qty) || qty <= 0) {
        return alert("Vui lòng chọn Thuốc, Lô và nhập Số lượng hợp lệ!");
    }

    const item = ytPharmacyCache.find(i => i.id === id);
    const batch = item.batches[batchIndex];

    if (qty > parseFloat(batch.qty)) {
        return alert(`Kho không đủ! Lô ${batch.lot} hiện chỉ còn ${batch.qty} ${batch.unit}.`);
    }

    // Lưu vào mảng để chờ trừ kho khi bấm "Xác nhận"
    pendingMedicineDeductions.push({
        itemId: id,
        itemName: name,
        batchIndex: batchIndex,
        lot: batch.lot,
        qty: qty,
        unit: unit || batch.unit
    });

    renderPendingMedicines();

    // Tự động nối chữ vào ô "Xử lý"
    const treatmentInput = document.getElementById('yt-treatment');
    let currentText = treatmentInput.value.trim();
    let textToAdd = `Cấp: ${name} (${qty} ${unit || batch.unit})`;
    
    if (currentText === "") {
        treatmentInput.value = textToAdd;
    } else {
        treatmentInput.value = currentText + ", " + textToAdd;
    }

    // Reset ô nhập để thêm thuốc khác
    document.getElementById('med-search-input').value = '';
    document.getElementById('med-selected-id').value = '';
    document.getElementById('med-batch-select').innerHTML = '<option value="">-- Trống --</option>';
    document.getElementById('med-qty-input').value = 1;
}

function renderPendingMedicines() {
    const list = document.getElementById('med-pending-list');
    list.innerHTML = '';
    pendingMedicineDeductions.forEach((med, index) => {
        list.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:8px 12px; border:1px solid #e2e8f0; border-radius:6px; font-size:0.85rem;">
                <div><strong style="color:#0f172a;">${med.itemName}</strong> <span style="color:#64748b;">(Lô: ${med.lot})</span></div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <strong style="color:#10b981;">${med.qty} ${med.unit}</strong>
                    <i class="fas fa-trash" style="color:#ef4444; cursor:pointer;" onclick="removePendingMed(${index})"></i>
                </div>
            </div>
        `;
    });
}

function removePendingMed(index) {
    pendingMedicineDeductions.splice(index, 1);
    renderPendingMedicines();
}

// Ẩn box tìm kiếm khi click ngoài
document.addEventListener('click', function(e) {
    const box = document.getElementById('med-suggest-box');
    if (box && e.target.id !== 'med-search-input') box.style.display = 'none';
});
function openNewNotiModal() {
    document.getElementById('new-noti-modal').style.display = 'flex';
}

function closeNewNotiModal() {
    document.getElementById('new-noti-modal').style.display = 'none';
    
    // Reset form cơ bản sau khi đóng
    document.getElementById('noti-title').value = '';
    document.getElementById('noti-content').value = '';
    document.getElementById('noti-target-value').value = '';
    document.getElementById('noti-target-type').value = 'all';
    
    // Uncheck nút tick gửi email
    const chkEmail = document.getElementById('chk-send-email');
    if (chkEmail) chkEmail.checked = false;

    toggleNotiTargetInput();
    selectedStudentsForNoti = [];
    renderSelectedStudentsNoti();
}
// Hàm tự động mở lại tất cả các nút bị kẹt hiệu ứng Spinner khi tắt Loading
function autoResetStuckButtons() {
    document.querySelectorAll('button:disabled').forEach(btn => {
        if (btn.innerHTML.includes('fa-spinner')) {
            btn.disabled = false;
            // Nếu có dữ liệu chữ gốc lưu sẵn thì khôi phục, hoặc xóa icon xoay
            if (btn.dataset.originalText) {
                btn.innerHTML = btn.dataset.originalText;
            }
        }
    });
}

// --- HÀM TƯƠNG TÁC CLOUDINARY UPLOAD WIDGET ---

// 1. Mở Cloudinary chọn ảnh làm Cover Bài viết
function openCloudinaryWidgetForCover() {
    if (typeof cloudinary === 'undefined') return alert("Chưa tải được thư viện Cloudinary Widget!");
    
    cloudinary.openUploadWidget({
        cloudName: CLOUDINARY_CONFIG.cloudName,
        uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
        sources: ['local', 'url', 'camera', 'google_drive'],
        multiple: false,
        clientAllowedFormats: ['image'],
        maxFileSize: 10485760 // Max 10MB
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            const imageUrl = result.info.secure_url;
            document.getElementById('p-cover').value = imageUrl;
            sysAlert("Đã chọn ảnh bìa từ Cloudinary thành công!", "success");
        }
    });
}

// 2. Mở Cloudinary chèn ảnh vào trình soạn thảo CKEditor
function openCloudinaryWidgetForEditor() {
    if (typeof cloudinary === 'undefined') return alert("Chưa tải được thư viện Cloudinary Widget!");

    cloudinary.openUploadWidget({
        cloudName: CLOUDINARY_CONFIG.cloudName,
        uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
        sources: ['local', 'url', 'camera'],
        multiple: true,
        clientAllowedFormats: ['image', 'video']
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            const mediaUrl = result.info.secure_url;
            const resourceType = result.info.resource_type; // 'image' hoặc 'video'
            
            if (ckEditorInstance) {
                if (resourceType === 'image') {
                    const imgHtml = `<p><img src="${mediaUrl}" alt="Ảnh bài viết" style="width:100%; max-width:1000px; border-radius:8px; margin:15px 0;"></p>`;
                    const viewFragment = ckEditorInstance.data.processor.toView(imgHtml);
                    const modelFragment = ckEditorInstance.data.toModel(viewFragment);
                    ckEditorInstance.model.insertContent(modelFragment);
                } else if (resourceType === 'video') {
                    const videoHtml = `<p><video controls src="${mediaUrl}" style="width:100%; max-width:1000px; border-radius:8px; margin:15px 0;"></video></p>`;
                    const viewFragment = ckEditorInstance.data.processor.toView(videoHtml);
                    const modelFragment = ckEditorInstance.data.toModel(viewFragment);
                    ckEditorInstance.model.insertContent(modelFragment);
                }
            }
        }
    });
}

// 3. Mở Cloudinary chung trong Tab Quản lý Kho Media
function openCloudinaryWidgetGeneral() {
    if (typeof cloudinary === 'undefined') return alert("Chưa tải được thư viện Cloudinary Widget!");

    cloudinary.openUploadWidget({
        cloudName: CLOUDINARY_CONFIG.cloudName,
        uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
        sources: ['local', 'url', 'camera', 'google_drive']
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            sysAlert(`Đã tải file thành công!\nURL: ${result.info.secure_url}`, "success");
        }
    });
}
// Hàm hỗ trợ chèn mẫu giao diện bài viết nhanh kèm chọn màu
function applyPresetTemplate() {
    const color = prompt("Nhập mã màu chủ đề bài viết (Mã Hex hoặc tên màu Tiếng Anh):", "#0062ff");
    if (!color) return;
    
    const titleVal = document.getElementById('p-title').value.trim() || 'TIÊU ĐỀ BÀI VIẾT';
    const templateHtml = getDefaultArticleTemplate(color, titleVal);
    
    setEditorContent(templateHtml);
    sysAlert("Đã áp dụng Mẫu CSS mới với màu chủ đề: " + color, "success");
}
// ==========================================
// HÀM XỬ LÝ CRUD CỘNG TÁC VIÊN
// ==========================================

let collaboratorsCache = [];

// 1. Hàm tự động đóng mở danh sách chọn Tab / Phân công Lớp khi đổi loại đối tượng
async function handleCollabRoleChange() {
    const role = document.getElementById('collab-role').value;
    const tabSection = document.getElementById('collab-tabs-selection-area');
    const gvcnClassSection = document.getElementById('collab-gvcn-class-area');
    const noteSection = document.getElementById('collab-role-note');
    const currentId = document.getElementById('collab-id').value;

    if (role === 'gvcn') {
        if (tabSection) tabSection.style.display = 'none';
        if (gvcnClassSection) gvcnClassSection.style.display = 'block';
        if (noteSection) {
            noteSection.style.display = 'block';
            noteSection.innerHTML = `👨‍🏫 <strong>Giáo viên chủ nhiệm</strong>: Được cấp quyền đăng nhập vào <strong>App Điểm Danh</strong> cho các lớp được phân công bên dưới.`;
        }
        await renderGvcnClassCheckboxes(currentId);
    } else if (role === 'quansinh') {
        if (tabSection) tabSection.style.display = 'none';
        if (gvcnClassSection) gvcnClassSection.style.display = 'none';
        if (noteSection) {
            noteSection.style.display = 'block';
            noteSection.innerHTML = `📋 <strong>Quản Sinh / Giám Thị</strong>: Được quyền điểm danh <strong>Toàn trường (Tất cả lớp)</strong> trên App Điểm Danh.`;
        }
    } else {
        // Cộng tác viên Admin
        if (tabSection) tabSection.style.display = 'block';
        if (gvcnClassSection) gvcnClassSection.style.display = 'none';
        if (noteSection) noteSection.style.display = 'none';
    }
}

// 2. Hàm vẽ danh sách Lớp & Khóa nếu đã đủ 2 Giáo viên
async function renderGvcnClassCheckboxes(currentCollabId = '', preSelectedClasses = []) {
    const container = document.getElementById('collab-gvcn-class-grid');
    if (!container) return;

    // 1. Quét danh sách tất cả các lớp thực tế từ bộ nhớ đệm học sinh
    const allStudents = await getStudentsList();
    const classSet = new Set();
    allStudents.forEach(s => {
        if (s.class && s.class.trim()) {
            classSet.add(s.class.trim().toUpperCase());
        }
    });

    const sortedClasses = Array.from(classSet).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));

    if (sortedClasses.length === 0) {
        container.innerHTML = '<div style="color:#ef4444; font-size:0.85rem; padding:10px;">Chưa có dữ liệu lớp học sinh trong hệ thống!</div>';
        return;
    }

    // 2. Thống kê số lượng GV phụ trách từng lớp từ collaboratorsCache
    // Dạng: { "10A1": ["GV Nguyễn Văn A", "GV Trần Thị B"], ... }
    const classTeachersMap = {};
    collaboratorsCache.forEach(c => {
        if (c.role === 'gvcn' && c.status === 'active' && c.assignedClasses && Array.isArray(c.assignedClasses)) {
            // Không tính chính tài khoản đang sửa để tránh tự khóa lớp của mình
            if (c.id !== currentCollabId) {
                c.assignedClasses.forEach(cls => {
                    const normalizedCls = cls.trim().toUpperCase();
                    if (!classTeachersMap[normalizedCls]) {
                        classTeachersMap[normalizedCls] = [];
                    }
                    classTeachersMap[normalizedCls].push(c.name);
                });
            }
        }
    });

    // 3. Render HTML từng ô Checkbox Lớp
    let html = '';
    sortedClasses.forEach(className => {
        const assignedTeachers = classTeachersMap[className] || [];
        const teacherCount = assignedTeachers.length;
        const isFull = teacherCount >= 2; // Đã đủ 2 GV
        const isChecked = preSelectedClasses.includes(className);

        let badgeColor = '#10b981'; // Xanh lá: 0/2
        let badgeText = `${teacherCount}/2 GV`;
        let disabledAttr = '';
        let itemBg = '#ffffff';
        let itemBorder = '#cbd5e1';
        let cursorStyle = 'pointer';

        if (teacherCount === 1) {
            badgeColor = '#f59e0b'; // Vàng cam: 1/2
        }

        if (isFull) {
            badgeColor = '#ef4444'; // Đỏ: 2/2 (Khóa)
            badgeText = `2/2 Đầy`;
            disabledAttr = 'disabled';
            itemBg = '#f1f5f9';
            itemBorder = '#e2e8f0';
            cursorStyle = 'not-allowed';
        }

        const tooltip = assignedTeachers.length > 0 
            ? `Đã phân công: ${assignedTeachers.join(', ')}` 
            : `Chưa có GV nào`;

        html += `
            <label title="${tooltip}" style="display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 6px 10px; background: ${itemBg}; border: 1.5px solid ${itemBorder}; border-radius: 8px; cursor: ${cursorStyle}; font-size: 0.85rem; transition: 0.15s;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <input type="checkbox" class="collab-gvcn-class-cb" value="${className}" ${isChecked ? 'checked' : ''} ${disabledAttr} style="cursor: ${cursorStyle};">
                    <strong style="color: ${isFull ? '#94a3b8' : '#1e293b'};">${className}</strong>
                </div>
                <span style="font-size: 0.7rem; font-weight: bold; color: ${badgeColor}; background: ${badgeColor}15; padding: 2px 5px; border-radius: 4px; white-space: nowrap;">
                    ${badgeText}
                </span>
            </label>
        `;
    });

    container.innerHTML = html;
}

// 3. Tải danh sách Cộng tác viên có hiển thị các Lớp phân công của GVCN
async function loadCollaborators() {
    const tbody = document.getElementById('collaborators-list-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px;"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</td></tr>';

    try {
        const snap = await db.collection("yt_collaborators").orderBy("createdAt", "desc").get();
        collaboratorsCache = [];

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 30px;">Chưa có tài khoản nào được thêm.</td></tr>';
            return;
        }

        let html = '';
        const todayStr = new Date().toISOString().split('T')[0];

        snap.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            collaboratorsCache.push(data);

            const isExpired = data.expiryDate && data.expiryDate < todayStr;
            let statusBadge = data.status === 'locked' 
                ? '<span style="color:#ef4444; background:#fef2f2; padding:3px 8px; border-radius:10px; font-weight:bold; font-size:0.75rem;">Đã khóa</span>'
                : (isExpired 
                    ? '<span style="color:#f59e0b; background:#fffbeb; padding:3px 8px; border-radius:10px; font-weight:bold; font-size:0.75rem;">Hết hạn</span>' 
                    : '<span style="color:#10b981; background:#ecfdf5; padding:3px 8px; border-radius:10px; font-weight:bold; font-size:0.75rem;">Hoạt động</span>');

            // Badge Đối tượng & Quyền hiển thị
            let roleBadge = '<span style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:6px; font-weight:bold; font-size:0.8rem;"><i class="fas fa-user-shield"></i> Cộng tác viên</span>';
            let permDisplay = `<span style="font-weight:600; color:#475569;">${(data.allowedTabs || []).length} Tabs Admin</span>`;

            if (data.role === 'gvcn') {
                roleBadge = '<span style="background:#fef3c7; color:#b45309; padding:3px 8px; border-radius:6px; font-weight:bold; font-size:0.8rem;"><i class="fas fa-chalkboard-teacher"></i> GVCN</span>';
                const classes = data.assignedClasses || (data.class ? [data.class] : []);
                if (classes.length > 0) {
                    permDisplay = `<span style="color:#0284c7; font-weight:bold; font-size:0.82rem;" title="${classes.join(', ')}"><i class="fas fa-layer-group"></i> Lớp: ${classes.join(', ')}</span>`;
                } else {
                    permDisplay = '<span style="color:#ef4444; font-size:0.8rem; font-style:italic;">Chưa phân lớp</span>';
                }
            } else if (data.role === 'quansinh') {
                roleBadge = '<span style="background:#f3e8ff; color:#7e22ce; padding:3px 8px; border-radius:6px; font-weight:bold; font-size:0.8rem;"><i class="fas fa-user-check"></i> Quản Sinh</span>';
                permDisplay = '<span style="color:#7e22ce; font-weight:bold; font-size:0.82rem;"><i class="fas fa-globe"></i> Toàn trường</span>';
            }

            html += `
                <tr style="transition:0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                    <td><strong>${data.name}</strong></td>
                    <td style="color:#0284c7; font-weight:500;">${data.email}</td>
                    <td>${roleBadge}</td>
                    <td>${data.phone || '--'}</td>
                    <td style="font-weight:bold; color:${isExpired ? '#ef4444' : '#334155'}; font-size:0.85rem;">${data.expiryDate || 'Vĩnh viễn'}</td>
                    <td>${permDisplay}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align: right;">
                        <button onclick="editCollaborator('${data.id}')" class="btn-sm" style="background:#e0e7ff; color:#4338ca; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;" title="Sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteCollaborator('${data.id}', '${data.name}')" class="btn-sm" style="background:#fee2e2; color:#ef4444; border:none; padding:5px 10px; border-radius:6px; cursor:pointer; margin-left:4px;" title="Xóa">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center;">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
    }
}

// 4. Mở Modal Thêm mới
function openCollaboratorModal() {
    document.getElementById('collab-id').value = '';
    document.getElementById('collab-email').value = '';
    document.getElementById('collab-email').disabled = false;
    document.getElementById('collab-name').value = '';
    document.getElementById('collab-phone').value = '';
    document.getElementById('collab-expiry').value = '';
    document.getElementById('collab-status').value = 'active';
    
    const roleSelect = document.getElementById('collab-role');
    if (roleSelect) roleSelect.value = 'collaborator';
    
    document.getElementById('collab-modal-title').innerHTML = '<i class="fas fa-user-plus"></i> Thêm Tài khoản / Phân quyền';
    document.querySelectorAll('.collab-tab-cb').forEach(cb => cb.checked = false);

    handleCollabRoleChange();
    document.getElementById('collaborator-modal').style.display = 'flex';
}
// Thêm hàm đóng Modal Cộng tác viên
function closeCollaboratorModal() {
    const modal = document.getElementById('collaborator-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}
// 5. Mở Modal Sửa
async function editCollaborator(id) {
    const collab = collaboratorsCache.find(c => c.id === id);
    if (!collab) return;

    document.getElementById('collab-id').value = collab.id;
    document.getElementById('collab-email').value = collab.email;
    document.getElementById('collab-email').disabled = true;
    document.getElementById('collab-name').value = collab.name;
    document.getElementById('collab-phone').value = collab.phone || '';
    document.getElementById('collab-expiry').value = collab.expiryDate || '';
    document.getElementById('collab-status').value = collab.status || 'active';
    
    const roleSelect = document.getElementById('collab-role');
    const userRole = collab.role || 'collaborator';
    if (roleSelect) roleSelect.value = userRole;

    document.getElementById('collab-modal-title').innerHTML = '<i class="fas fa-user-edit"></i> Cập nhật Phân quyền';

    const allowed = collab.allowedTabs || [];
    document.querySelectorAll('.collab-tab-cb').forEach(cb => {
        cb.checked = allowed.includes(cb.value);
    });

    await handleCollabRoleChange();

    if (userRole === 'gvcn') {
        const assigned = collab.assignedClasses || (collab.class ? [collab.class] : []);
        await renderGvcnClassCheckboxes(collab.id, assigned);
    }

    document.getElementById('collaborator-modal').style.display = 'flex';
}

// 6. Lưu thông tin và phân quyền lớp
async function saveCollaborator() {
    const id = document.getElementById('collab-id').value;
    const email = document.getElementById('collab-email').value.trim().toLowerCase();
    const name = document.getElementById('collab-name').value.trim();
    const phone = document.getElementById('collab-phone').value.trim();
    const expiryDate = document.getElementById('collab-expiry').value;
    const status = document.getElementById('collab-status').value;
    const role = document.getElementById('collab-role')?.value || 'collaborator';

    if (!email || !name || !expiryDate) {
        return sysAlert("Vui lòng điền đủ: Email, Họ tên và Ngày hết hạn!", "warning");
    }

    let allowedTabs = [];
    let assignedClasses = [];

    if (role === 'collaborator') {
        document.querySelectorAll('.collab-tab-cb:checked').forEach(cb => {
            allowedTabs.push(cb.value);
        });
        if (allowedTabs.length === 0) {
            return sysAlert("Cộng tác viên phải được tick chọn ít nhất 1 Tab Admin!", "warning");
        }
    } else if (role === 'gvcn') {
        allowedTabs = ['app_diemdanh'];
        // Lấy tất cả các lớp được tick chọn
        document.querySelectorAll('.collab-gvcn-class-cb:checked').forEach(cb => {
            assignedClasses.push(cb.value);
        });

        if (assignedClasses.length === 0) {
            return sysAlert("Vui lòng tick chọn ít nhất 1 Lớp cho Giáo viên chủ nhiệm!", "warning");
        }
    } else if (role === 'quansinh') {
        allowedTabs = ['app_diemdanh'];
        assignedClasses = ['ALL'];
    }

    sysLoading(true, "Đang lưu thông tin...");

    const payload = {
        email, 
        name, 
        phone, 
        expiryDate, 
        status, 
        role, 
        allowedTabs,
        assignedClasses, // Mảng các lớp GVCN phụ trách (VD: ["10A1", "10A2"])
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (id) {
            await db.collection("yt_collaborators").doc(id).update(payload);
            sysAlert("Cập nhật tài khoản thành công!", "success");
        } else {
            const checkExist = await db.collection("yt_collaborators").where("email", "==", email).get();
            if (!checkExist.empty) {
                sysLoading(false);
                return sysAlert("Email này đã tồn tại trong danh sách!", "error");
            }
            payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("yt_collaborators").add(payload);
            sysAlert("Thêm tài khoản GVCN/CTV thành công!", "success");
        }

        closeCollaboratorModal();
        loadCollaborators();
    } catch (err) {
        sysAlert("Lỗi: " + err.message, "error");
    } finally {
        sysLoading(false);
    }
}

// 7. Xóa Cộng tác viên
async function deleteCollaborator(id, name) {
    const isConfirm = await sysConfirm(`Xác nhận xóa quyền Cộng tác viên của [${name}]?`, "Xóa Cộng tác viên", true);
    if (isConfirm) {
        sysLoading(true, "Đang xóa...");
        try {
            await db.collection("yt_collaborators").doc(id).delete();
            sysAlert("Đã xóa Cộng tác viên thành công!", "success");
            loadCollaborators();
        } catch (err) {
            sysAlert("Lỗi khi xóa: " + err.message, "error");
        } finally {
            sysLoading(false);
        }
    }
}
// =========================================================================
// HỆ THỐNG DASHBOARD TỔNG QUAN KẾT HỢP AI (TỐI ƯU HÓA DATABASE 100%)
// =========================================================================
let dashboardDataCache = null;

async function loadDashboardData(forceRefresh = false) {
    const kpiStudents = document.getElementById('db-kpi-students');
    if (!kpiStudents) return;

    const refreshIcon = document.getElementById('db-refresh-icon');
    if (refreshIcon) refreshIcon.classList.add('fa-spin');

    try {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        const monthId = `${currentMonth.toString().padStart(2, '0')}-${currentYear}`;
        
        const monthLabel = document.getElementById('db-stat-month-label');
        if (monthLabel) monthLabel.innerText = `Tháng ${currentMonth}/${currentYear}`;

        // 1. TẬN DỤNG RAM: Lấy tổng số học sinh từ cache (0 lượt đọc Firestore)
        const allStudents = await getStudentsList();
        kpiStudents.innerText = allStudents.length.toLocaleString('vi-VN');

        // 2. TẬN DỤNG TRẠNG THÁI GIƯỜNG (3 docs nhẹ)
        const bedsSnap = await db.collection('yt_beds').get();
        const occupiedBeds = bedsSnap.size;
        const kpiBeds = document.getElementById('db-kpi-beds');
        if (kpiBeds) {
            kpiBeds.innerText = `${occupiedBeds} / 3`;
            kpiBeds.style.color = occupiedBeds >= 3 ? '#ef4444' : (occupiedBeds > 0 ? '#f59e0b' : '#0f172a');
        }

        // 3. LẤY SỐ LƯỢT KHÁM HÔM NAY (Chỉ query từ 00:00 sáng nay)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todayVisitsSnap = await db.collection('yt_visits')
            .where('timestamp', '>=', startOfDay)
            .orderBy('timestamp', 'desc')
            .get();

        const todayVisitsCount = todayVisitsSnap.size;
        const kpiToday = document.getElementById('db-kpi-today-visits');
        if (kpiToday) kpiToday.innerText = todayVisitsCount;

        // 4. LẤY TICKET CHỜ (Tái sử dụng cachedTickets nếu có, hoặc query giới hạn 10)
        let pendingTicketsCount = 0;
        if (typeof cachedTickets !== 'undefined' && cachedTickets.length > 0) {
            pendingTicketsCount = cachedTickets.filter(t => t.status === 'pending').length;
        } else {
            const ticketSnap = await db.collection('yt_tickets').where('status', '==', 'pending').get();
            pendingTicketsCount = ticketSnap.size;
        }
        const kpiTickets = document.getElementById('db-kpi-pending-tickets');
        if (kpiTickets) kpiTickets.innerText = pendingTicketsCount;

        // 5. ĐỔ DANH SÁCH TIẾP NHẬN GẦN ĐÂY
        renderDashboardRecentVisits(todayVisitsSnap);

        // 6. LẤY DỮ LIỆU CHỐT SỔ THÁNG ĐỂ VẼ TOP TRIỆU CHỨNG (Chỉ đọc đúng 1 document yt_stats)
        await renderDashboardTopSymptoms(monthId);

        // 7. KHỞI CHẠY AI HEALTH INSIGHTS (Có cache SessionStorage theo ngày)
        initDashboardAIInsights(forceRefresh);

    } catch (err) {
        console.error("Dashboard Load Error:", err);
    } finally {
        if (refreshIcon) refreshIcon.classList.remove('fa-spin');
    }
}

// Hàm render danh sách khám gần đây
function renderDashboardRecentVisits(snap) {
    const list = document.getElementById('db-recent-visits-list');
    if (!list) return;

    if (snap.empty) {
        list.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8; font-size:0.9rem;"><i class="fas fa-check-circle" style="color:#10b981;"></i> Hôm nay chưa có lượt tiếp nhận nào.</div>';
        return;
    }

    let html = '';
    snap.forEach(doc => {
        const v = doc.data();
        const time = v.timestamp ? new Date(v.timestamp.seconds * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--';
        html += `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="color:#1e293b; font-size:0.92rem;">${v.name}</strong> 
                    <span style="color:#0284c7; font-weight:bold; font-size:0.82rem;">(${v.class})</span>
                    <div style="font-size:0.82rem; color:#64748b; margin-top:2px;">${v.symptom || 'Khám tổng quát'}</div>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:0.75rem; font-weight:bold; color:#475569; background:#e2e8f0; padding:2px 8px; border-radius:6px;">${time}</span>
                </div>
            </div>
        `;
    });
    list.innerHTML = html;
}

// Hàm render Top triệu chứng từ Doc yt_stats chốt sổ
async function renderDashboardTopSymptoms(monthId) {
    const container = document.getElementById('db-top-symptoms-list');
    if (!container) return;

    try {
        const statDoc = await db.collection('yt_stats').doc(monthId).get();
        if (!statDoc.exists || !statDoc.data().topSymptoms || statDoc.data().topSymptoms.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8; font-size:0.88rem;">Chưa có dữ liệu thống kê tổng hợp trong tháng.</div>';
            return;
        }

        const symptoms = statDoc.data().topSymptoms.slice(0, 5);
        const maxCount = Math.max(...symptoms.map(s => s.count), 1);

        let html = '';
        symptoms.forEach(item => {
            const percent = Math.round((item.count / maxCount) * 100);
            html += `
                <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.88rem; font-weight:600; color:#334155;">
                        <span>${item.name}</span>
                        <span style="color:#0284c7; font-weight:700;">${item.count} ca</span>
                    </div>
                    <div class="db-symptom-bar-bg">
                        <div class="db-symptom-bar-fill" style="width: ${percent}%;"></div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<div style="color:#ef4444; font-size:0.85rem; text-align:center;">Lỗi nạp thống kê: ' + e.message + '</div>';
    }
}
// =========================================================================
// AI HEALTH INSIGHTS: LẤY BẢN TIN TỪ LỊCH SỬ DỰ BÁO DỊCH TỄ GẦN NHẤT (0 PROMPT THỪA)
// =========================================================================
async function initDashboardAIInsights(forceRefresh = false) {
    const contentBox = document.getElementById('db-ai-summary-content');
    const timeLabel = document.getElementById('db-ai-timestamp');
    if (!contentBox) return;

    // 1. Kiểm tra cache SessionStorage nếu không ép làm mới
    const cacheKey = 'vts_latest_ai_epidemic_insight';
    if (!forceRefresh) {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                contentBox.innerHTML = parsed.html;
                if (timeLabel) timeLabel.innerText = parsed.timeText;
                return;
            } catch(e) {}
        }
    }

    contentBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải bản tin phân tích dịch tễ gần nhất...';

    try {
        // 2. Truy vấn đúng 1 bản ghi dự báo dịch tễ mới nhất từ Firestore
        let latestDoc = null;
        
        // Thử collection chuẩn yt_epidemic_predictions
        const snap = await db.collection("yt_epidemic_predictions")
            .orderBy("timestamp", "desc")
            .limit(1)
            .get();

        if (!snap.empty) {
            latestDoc = snap.docs[0].data();
        } else {
            // Thử collection dự phòng yt_ai_predictions nếu có
            const fallbackSnap = await db.collection("yt_ai_predictions")
                .orderBy("timestamp", "desc")
                .limit(1)
                .get();
            if (!fallbackSnap.empty) {
                latestDoc = fallbackSnap.docs[0].data();
            }
        }

        // 3. Nếu chưa từng chạy phân tích dịch tễ lần nào
        if (!latestDoc) {
            const emptyHtml = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <span style="color:#64748b;">Chưa có bản tin phân tích dịch tễ học đường nào được lưu trong hệ thống.</span>
                    <button onclick="switchTab('tab-yte-thongke')" class="btn-sm" style="background:#0284c7; color:white; border:none; padding:5px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">
                        <i class="fas fa-microscope"></i> Chạy phân tích ngay
                    </button>
                </div>
            `;
            contentBox.innerHTML = emptyHtml;
            if (timeLabel) timeLabel.innerText = "Chưa có dữ liệu";
            return;
        }

        // 4. Trích xuất thông tin bản tin
        const timeObj = latestDoc.timestamp ? (latestDoc.timestamp.toDate ? latestDoc.timestamp.toDate() : new Date(latestDoc.timestamp)) : new Date();
        const timeText = timeObj.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
        
        // Lấy đoạn tóm tắt/kết luận từ dữ liệu dự báo
        let summaryText = latestDoc.summary || latestDoc.shortSummary || latestDoc.conclusion || "";
        
        // Nếu bản tin lưu dạng HTML đầy đủ, tự động trích xuất đoạn kết luận hoặc đoạn đầu
        if (!summaryText && latestDoc.reportContent) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = latestDoc.reportContent;
            summaryText = tempDiv.innerText.replace(/\n+/g, ' ').substring(0, 220) + '...';
        }

        if (!summaryText) {
            summaryText = "Tình hình dịch tễ tại trường học duy trì ổn định. Cán bộ y tế chú ý kiểm tra định kỳ các ca sốt nhẹ và vệ sinh học đường.";
        }

        // Mức độ cảnh báo (nếu có)
        const riskLevel = latestDoc.riskLevel || latestDoc.level || "Bình thường";
        let riskBadge = '';
        if (riskLevel.includes('Cao') || riskLevel.includes('Nguy cơ')) {
            riskBadge = `<span style="background:#fee2e2; color:#ef4444; padding:2px 8px; border-radius:6px; font-size:0.78rem; font-weight:bold; margin-right:6px;"><i class="fas fa-exclamation-triangle"></i> Cảnh báo: ${riskLevel}</span>`;
        } else {
            riskBadge = `<span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:6px; font-size:0.78rem; font-weight:bold; margin-right:6px;"><i class="fas fa-shield-check"></i> Trạng thái: ${riskLevel}</span>`;
        }

        const renderHtml = `
            <div style="display:flex; flex-direction:column; gap:6px;">
                <div>
                    ${riskBadge}
                    <span style="font-size:0.92rem; color:#334155; line-height:1.6;">${summaryText}</span>
                </div>
                <div style="margin-top:4px;">
                    <a href="javascript:void(0)" onclick="switchTab('tab-yte-thongke')" style="color:#0284c7; font-weight:600; font-size:0.83rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                        <span>Xem toàn bộ báo cáo phân tích dịch tễ chi tiết</span> <i class="fas fa-arrow-right" style="font-size:0.75rem;"></i>
                    </a>
                </div>
            </div>
        `;

        contentBox.innerHTML = renderHtml;
        if (timeLabel) timeLabel.innerText = `Đợt phân tích: ${timeText}`;

        // Lưu cache Session
        sessionStorage.setItem(cacheKey, JSON.stringify({ html: renderHtml, timeText: `Đợt phân tích: ${timeText}` }));

    } catch (err) {
        console.error("Lỗi tải AI Insights Dashboard:", err);
        contentBox.innerHTML = `<span style="color:#64748b;">Không thể tải bản tin dự báo dịch tễ: ${err.message}</span>`;
    }
}

// Nút bấm "AI Tóm Tắt & Cảnh Báo" trên Dashboard: Làm mới dữ liệu từ kết quả mới nhất hoặc chuyển sang chạy phân tích mới
function requestDashboardAIAnalysis() {
    sysLoading(true, "Đang đồng bộ bản tin dịch tễ mới nhất...");
    initDashboardAIInsights(true).finally(() => {
        sysLoading(false);
        sysAlert("Đã cập nhật bản tin dự báo dịch tễ mới nhất!", "success");
    });
}
// Nút bấm làm mới thủ công trên Dashboard
function refreshDashboard(force = false) {
    loadDashboardData(force);
}
