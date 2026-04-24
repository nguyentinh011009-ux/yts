/* APP CORE LOGIC - TO 3 11A4
   Xử lý: Firebase, CRUD, Slider, Auth, Search
*/

// --- 1. KHỞI TẠO BIẾN TOÀN CỤC ---
let sliderInterval = null; // THÊM DÒNG NÀY VÀO
let allPosts = [];

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
// 👉 DANH SÁCH CÁC EMAIL ĐƯỢC PHÉP VÀO ADMIN (Điền email của bạn/thầy cô vào đây)
const ALLOWED_ADMIN_EMAILS = [
    "nguyentinh011009@gmail.com",
     "tomizy09icloud@gmail.com",
     "nguyenthixuandongvts@gmail.com",
     "yte.thptvothisaubrvt@gmail.com",
     "nguyentinh52009@gmail.com"
];

// --- Theo dõi trạng thái đăng nhập tự động ---
firebase.auth().onAuthStateChanged((user) => {
    const loginOverlay = document.getElementById('login-overlay');
    const dashboard = document.getElementById('admin-dashboard');
    
    if (user) {
        // KIỂM TRA BẢO MẬT: Email này có nằm trong danh sách cho phép không?
        if (ALLOWED_ADMIN_EMAILS.includes(user.email)) {
            // HỢP LỆ -> Mở cửa
            if(loginOverlay) loginOverlay.style.display = 'none';
            if(dashboard) {
                dashboard.style.display = 'grid'; 
                loadAdminPosts();
                loadAdminAnnouncements();

                // ---> CODE MỚI: HIỂN THỊ THÔNG TIN ADMIN <---
                const nameDisplay = document.getElementById('display-admin-name');
                const emailDisplay = document.getElementById('display-admin-email');
                
                if (emailDisplay) emailDisplay.innerText = user.email;
                if (nameDisplay) {
                    // Nếu đăng nhập bằng Google sẽ có tên, đăng nhập Email/Pass có thể không có
                    nameDisplay.innerText = user.displayName ? user.displayName : "Quản trị viên";
                }
                // ----------------------------------------------
            }
        } else {
            // KHÔNG HỢP LỆ -> Đá ra ngoài
            firebase.auth().signOut();
            if(loginOverlay) loginOverlay.style.display = 'flex';
            if(dashboard) dashboard.style.display = 'none';
        }
    } else {
        // Chưa đăng nhập
        if(loginOverlay) loginOverlay.style.display = 'flex';
        if(dashboard) dashboard.style.display = 'none';
    }
});
// --- Hàm 1: Đăng nhập bằng Email & Mật khẩu ---
function handleEmailLogin() {
    const email = document.getElementById('admin-email-input').value.trim();
    const password = document.getElementById('admin-pass-input').value;
    const btn = document.getElementById('btn-login-email');

    if (!email || !password) return alert("Vui lòng nhập đầy đủ Email và Mật khẩu!");

    // Hiệu ứng Loading
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang kiểm tra...';
    btn.disabled = true;

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Thành công (hàm onAuthStateChanged ở trên sẽ tự động ẩn form)
            btn.innerHTML = originalText;
            btn.disabled = false;
        })
        .catch((error) => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            // Xử lý báo lỗi tiếng Việt cho thân thiện
            if(error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                alert("❌ Sai Email hoặc Mật khẩu!");
            } else if (error.code === 'auth/invalid-email') {
                alert("❌ Định dạng Email không hợp lệ!");
            } else {
                alert("❌ Lỗi đăng nhập: " + error.message);
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
            
            const userEmail = result.user.email;
            
            // Nếu email không có trong danh sách -> Hiện thông báo lỗi
            if (!ALLOWED_ADMIN_EMAILS.includes(userEmail)) {
                alert(`⛔ BẢO MẬT HỆ THỐNG:\n\nTài khoản (${userEmail}) không có quyền truy cập trang Quản trị!\nVui lòng liên hệ Admin: Văn Tính để được cấp quyền.`);
            } else {
                alert(`✅ Đăng nhập thành công: ${userEmail}`);
            }
        })
        .catch((error) => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            alert("❌ Lỗi đăng nhập Google: " + error.message);
        });
}
// --- Hàm 3: Đăng xuất ---
function handleLogout() {
    if(confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?")) {
        firebase.auth().signOut().then(() => {
            // onAuthStateChanged sẽ tự động đá ra ngoài form đăng nhập
            // Xóa rỗng các ô input để an toàn
            document.getElementById('admin-email-input').value = '';
            document.getElementById('admin-pass-input').value = '';
        });
    }
}

// --- 3. QUẢN LÝ BÀI VIẾT (CRUD) ---
function showPostEditor(postId = null) {
    document.getElementById('post-editor').style.display = 'block';
    if (!postId) {
        document.getElementById('editor-mode-title').innerText = "Thêm sản phẩm mới";
        document.getElementById('edit-post-id').value = "";
        document.getElementById('p-title').value = "";
        document.getElementById('p-cover').value = "";
        document.getElementById('p-content').value = "";
        document.getElementById('p-pin').checked = false;
    }
}

function hidePostEditor() {
    document.getElementById('post-editor').style.display = 'none';
}

async function savePost() {
    const id = document.getElementById('edit-post-id').value;
    const data = {
        title: document.getElementById('p-title').value,
        cover: document.getElementById('p-cover').value,
        content: document.getElementById('p-content').value,
        isPinned: document.getElementById('p-pin').checked,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!data.title || !data.content) return alert("Vui lòng nhập đủ Tiêu đề và Nội dung!");

    try {
        if (id) {
            await db.collection("posts").doc(id).update(data);
            alert("✅ Đã cập nhật bài viết!");
        } else {
            await db.collection("posts").add(data);
            alert("✅ Đã đăng bài mới thành công!");
        }
        hidePostEditor();
    } catch (e) { alert("Lỗi khi lưu: " + e.message); }
}

function loadAdminPosts() {
    db.collection("posts").orderBy("createdAt", "desc").onSnapshot(snap => {
        const body = document.getElementById('admin-post-list-body');
        if(!body) return;
        body.innerHTML = '';
        snap.forEach(doc => {
            const p = doc.data();
            body.innerHTML += `
                <tr>
                    <td>
                        <div style="display:flex; gap:10px; align-items:center;">
                            <img src="${p.cover}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;">
                            <strong>${p.title}</strong>
                        </div>
                    </td>
                    <td>${p.isPinned ? '<span style="color:#f59e0b">📌 Đã ghim</span>' : '<span style="color:#94a3b8">Thường</span>'}</td>
                    <td>${p.createdAt ? new Date(p.createdAt.seconds*1000).toLocaleDateString() : 'Vừa xong'}</td>
                    <td style="text-align:right;">
                        <button onclick="editPost('${doc.id}')" class="btn" style="padding:8px; background:#f1f5f9; color:#0062ff;"><i class="fas fa-edit"></i></button>
                        <button onclick="deletePost('${doc.id}')" class="btn" style="padding:8px; background:#fef2f2; color:#ef4444;"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    });
}

async function editPost(id) {
    const doc = await db.collection("posts").doc(id).get();
    const p = doc.data();
    showPostEditor(id);
    document.getElementById('editor-mode-title').innerText = "Chỉnh sửa bài viết";
    document.getElementById('edit-post-id').value = id;
    document.getElementById('p-title').value = p.title;
    document.getElementById('p-cover').value = p.cover;
    document.getElementById('p-content').value = p.content;
    document.getElementById('p-pin').checked = p.isPinned;
    window.scrollTo({top: 0, behavior: 'smooth'});
}

async function deletePost(id) {
    if (confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
        await db.collection("posts").doc(id).delete();
    }
}

// --- 4. QUẢN LÝ THÔNG BÁO SLIDER ---
async function loadAdminAnnouncements() {
    const container = document.getElementById('announce-list-admin');
    if(!container) return;
    
    // Tạo 4 ô nhập thông báo
    container.innerHTML = '';
    for (let i = 1; i <= 4; i++) {
        const doc = await db.collection("announcements").doc(`slot_${i}`).get();
        const data = doc.exists ? doc.data() : { text: "", image: "", link: "" };
        
        container.innerHTML += `
            <div class="form-card">
                <h3>Thông báo #${i}</h3>
                <div class="input-group">
                    <label>Ảnh nền</label>
                    <input type="text" id="ann-img-${i}" value="${data.image}" placeholder="Link ảnh...">
                </div>
                <div class="input-group">
                    <label>Tiêu đề ngắn</label>
                    <input type="text" id="ann-txt-${i}" value="${data.text}" placeholder="Nội dung...">
                </div>
                <div class="input-group">
                    <label>Link liên kết</label>
                    <input type="text" id="ann-lnk-${i}" value="${data.link}" placeholder="Khi bấm vào sẽ đi đâu?">
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

// --- 5. HIỂN THỊ TRANG CHỦ & SLIDER ---
function renderHome() {
    db.collection("posts").orderBy("createdAt", "desc").onSnapshot(snap => {
        allPosts = [];
        const pinnedGrid = document.getElementById('pinned-grid');
        const mainGrid = document.getElementById('main-grid');
        const pinnedSection = document.getElementById('pinned-section');
        
        if(!pinnedGrid) return;
        pinnedGrid.innerHTML = ''; mainGrid.innerHTML = '';
        
        snap.forEach(doc => {
            const p = { id: doc.id, ...doc.data() };
            allPosts.push(p);
            
            const html = `
                <div class="post-card fade-in" style="background:white; border-radius:15px; overflow:hidden; box-shadow:var(--shadow-sm);">
                    <img src="${p.cover}" style="width:100%; height:200px; object-fit:cover;">
                    <div style="padding:20px;">
                        <h3 style="margin-bottom:10px; font-size:1.2rem;">${p.title}</h3>
                        <p style="color:var(--text-gray); font-size:0.9rem; margin-bottom:20px;">${p.content.replace(/<[^>]*>?/gm, '').substring(0, 100)}...</p>
                        <a href="post.html?id=${p.id}" class="btn btn-primary" style="width:100%; justify-content:center; text-decoration:none;">Xem chi tiết sản phẩm</a>
                    </div>
                </div>
            `;
            
            if (p.isPinned) pinnedGrid.innerHTML += html;
            else mainGrid.innerHTML += html;
        });
        
        pinnedSection.style.display = pinnedGrid.innerHTML ? 'block' : 'none';
    });

    // Load Slider
    db.collection("announcements").onSnapshot(snap => {
        const slider = document.getElementById('main-slider');
        if(!slider) return;
        slider.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            if(d.image) {
                slider.innerHTML += `
                    <div class="slide-item">
                        <div style="width:100%; height:100%; background-image:url('${d.image}'); background-size:cover; background-position:center;"></div>
                        <div class="slide-content">
                            <h2 style="font-size:2rem;">${d.text}</h2>
                            <a href="${d.link}" target="_blank" class="btn btn-primary" style="margin-top:15px;">Xem chi tiết</a>
                        </div>
                    </div>
                `;
            }
        });
        startSlider();
    });
}

function startSlider() {
    const slides = document.querySelectorAll('.slide-item');
    if (slides.length === 0) return;
    
    let current = 0;
    slides.forEach(s => s.classList.remove('active'));
    slides[0].classList.add('active');
    
    // Đảm bảo chỉ có 1 interval duy nhất chạy trên toàn hệ thống
    if (window.sliderInterval) clearInterval(window.sliderInterval);
    
    window.sliderInterval = setInterval(() => {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
    }, 5000);
}

function openPost(id) {
    const post = allPosts.find(p => p.id === id);
    const modal = document.getElementById('view-modal');
    const body = document.getElementById('modal-body-content');
    
    body.innerHTML = `
        <h1 style="margin-bottom:20px; color:#0062ff;">${post.title}</h1>
        <div style="margin-bottom:30px; font-size:1.1rem;">${post.content}</div>
    `;
    modal.style.display = 'flex';
}

function closeModal() { document.getElementById('view-modal').style.display = 'none'; }

function searchPosts() {
    const term = document.getElementById('search-input').value.toLowerCase();
    
    // Lọc dữ liệu từ mảng allPosts đã lưu
    const filtered = allPosts.filter(p => 
        p.title.toLowerCase().includes(term) || 
        p.content.toLowerCase().includes(term)
    );
    
    const pinnedGrid = document.getElementById('pinned-grid');
    const mainGrid = document.getElementById('main-grid');
    const pinnedSection = document.getElementById('pinned-section');
    
    if(!pinnedGrid || !mainGrid) return;
    
    // Xóa rỗng grid hiện tại
    pinnedGrid.innerHTML = ''; 
    mainGrid.innerHTML = '';
    
    // Render lại dữ liệu đã lọc
    filtered.forEach(p => {
        const html = `
            <div class="post-card fade-in" style="background:white; border-radius:15px; overflow:hidden; box-shadow:var(--shadow-sm);">
                <img src="${p.cover}" style="width:100%; height:200px; object-fit:cover;">
                <div style="padding:20px;">
                    <h3 style="margin-bottom:10px; font-size:1.2rem;">${p.title}</h3>
                    <p style="color:var(--text-gray); font-size:0.9rem; margin-bottom:20px;">${p.content.replace(/<[^>]*>?/gm, '').substring(0, 100)}...</p>
                    <a href="post.html?id=${p.id}" class="btn btn-primary" style="width:100%; justify-content:center; text-decoration:none;">Xem chi tiết sản phẩm</a>
                </div>
            </div>
        `;
        
        if (p.isPinned) pinnedGrid.innerHTML += html;
        else mainGrid.innerHTML += html;
    });
    
    // Ẩn/hiện phần ghim nếu không có bài nào
    if (pinnedSection) {
        pinnedSection.style.display = pinnedGrid.innerHTML ? 'block' : 'none';
    }
}

function switchTab(tabId, btn) {
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

    // Tự động load dữ liệu khi vào tab tương ứng
    if (tabId === 'tab-posts') loadAdminPosts();
    if (tabId === 'tab-announce') loadAdminAnnouncements();
    if (tabId === 'tab-yte-giuong') loadBeds();
    if (tabId === 'tab-yte-dulieu') loadStudentData(); // Hàm mới bên dưới
}
// --- KHỞI CHẠY ---
renderHome();
// Thống kê truy cập: Tự động tăng và hiển thị số lượt
const statsRef = db.collection("settings").doc("stats");

// 1. Tăng số lượt truy cập thêm 1 mỗi khi load trang
statsRef.set({
    visitCount: firebase.firestore.FieldValue.increment(1)
}, { merge: true });

// 2. Lắng nghe và hiển thị số lượt truy cập thời gian thực
statsRef.onSnapshot((doc) => {
    if (doc.exists && doc.data().visitCount) {
        document.getElementById('visit-count').innerText = doc.data().visitCount.toLocaleString();
    }
});
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

// 1. TÌM KIẾM HỌC SINH CÓ SẴN
async function searchStudentSuggest(val) {
    const box = document.getElementById('yt-suggest-box');
    if (val.length < 2) { box.style.display = 'none'; return; }

    const snap = await db.collection('yt_students')
        .where('name_search', '>=', val.toLowerCase())
        .where('name_search', '<=', val.toLowerCase() + '\uf8ff').limit(5).get();

    box.innerHTML = '';
    if (snap.empty) { box.style.display = 'none'; return; }

    snap.forEach(doc => {
        const d = doc.data();
        const item = document.createElement('div');
        item.className = 'suggest-item';
        item.innerHTML = `<strong>${d.name}</strong> - Lớp: ${d.class}`;
        item.onclick = () => {
            document.getElementById('yt-name').value = d.name;
            document.getElementById('yt-class').value = d.class;
            box.style.display = 'none';
            checkStudentHistory();
        };
        box.appendChild(item);
    });
    box.style.display = 'block';
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
// ==========================================
// LƯU LƯỢT TIẾP NHẬN & CẬP NHẬT HỒ SƠ
// ==========================================
// ==========================================
// LƯU LƯỢT TIẾP NHẬN 
// ==========================================
// ==========================================
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

    try {
        // 👉 TÍNH NĂNG MỚI: KIỂM TRA TRẠNG THÁI GIƯỜNG TRƯỚC KHI LƯU
        if (bed) {
            const bedDoc = await db.collection('yt_beds').doc('bed_' + bed).get();
            
            // Nếu giường ĐÃ CÓ NGƯỜI sử dụng
            if (bedDoc.exists) {
                const occupant = bedDoc.data();
                
                // Quét Database để lấy danh sách các giường đang bị chiếm dụng
                const allBedsSnap = await db.collection('yt_beds').get();
                let occupiedBeds = [];
                allBedsSnap.forEach(doc => occupiedBeds.push(doc.id.replace('bed_', '')));
                
                // Trạm y tế có 3 giường (1, 2, 3) -> Lọc ra những giường không nằm trong danh sách chiếm dụng
                const totalBeds = ['1', '2', '3'];
                const emptyBeds = totalBeds.filter(b => !occupiedBeds.includes(b));
                
                let suggestionMsg = "";
                if (emptyBeds.length > 0) {
                    suggestionMsg = `💡 Gợi ý: Các giường hiện đang TRỐNG là Giường số ${emptyBeds.join(', ')}.`;
                } else {
                    suggestionMsg = `⚠️ Hiện tại TẤT CẢ các giường đều đã kín chỗ. Vui lòng trả giường trước khi tiếp nhận thêm.`;
                }

                // Chặn quá trình lưu và hiển thị thông báo cho Y tế biết
                return alert(`❌ TỪ CHỐI TIẾP NHẬN:\n\nGiường số ${bed} hiện đang có học sinh ${occupant.name} (Lớp ${occupant.class}) sử dụng.\n\n${suggestionMsg}`);
            }
        }

        // 👉 NẾU GIƯỜNG TRỐNG (HOẶC KHÔNG LƯU GIƯỜNG) -> LƯU DỮ LIỆU BÌNH THƯỜNG
        let studentId;
        const hsSnap = await db.collection('yt_students').where('name', '==', name).where('class', '==', className).get();

        if (hsSnap.empty) {
            studentId = `YT-${Math.floor(10000 + Math.random() * 90000)}`;
            await db.collection('yt_students').doc(studentId).set({
                id: studentId,
                name: name, 
                class: className, 
                name_search: removeVietnameseTones(name), 
                createdAt: new Date()
            });
        } else {
            studentId = hsSnap.docs[0].id;
        }

        // Lưu vào sổ khám
        const visitDoc = await db.collection('yt_visits').add({
            studentId: studentId, 
            name: name, 
            class: className, 
            symptom: symptom, 
            treatment: treatment,
            note: note, 
            sign: signImg,
            bed: bed || null,
            status: bed ? "staying" : "completed",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Gắn thông tin học sinh vào Giường
        if (bed) {
            await db.collection('yt_beds').doc('bed_' + bed).set({
                name: name, class: className, visitId: visitDoc.id, startTime: new Date()
            });
        }

        alert("✅ Tiếp nhận thành công!");
        resetReceptionForm(); 
    } catch(err) {
        alert("Lỗi khi lưu: " + err.message);
    }
}
// ==========================================
// HÀM DỌN DẸP MÀN HÌNH SAU KHI TIẾP NHẬN XONG
// ==========================================
function resetReceptionForm() {
    // Xóa trắng các ô nhập
    document.getElementById('yt-name').value = "";
    document.getElementById('yt-class').value = "";
    document.getElementById('yt-symptom').value = "";
    document.getElementById('yt-treatment').value = "";
    document.getElementById('yt-note').value = "";
    document.getElementById('yt-bed').value = "";

    // Ẩn nút Sửa nhanh và Reset ô Lịch sử
    document.getElementById('btn-quick-edit').style.display = 'none';
    currentReceptionStudent = null;
    const previewBox = document.getElementById('yt-history-preview');
    if (previewBox) previewBox.innerHTML = "Nhập tên và lớp để hệ thống kiểm tra...";

    // Dọn dẹp khu vực QR Code
    document.getElementById('qr-area').style.display = 'none';
    document.getElementById('qrcode').innerHTML = "";
    document.getElementById('qr-link-input').value = "";
    
    const sigResult = document.getElementById('signature-result');
    if (sigResult) { sigResult.src = ""; sigResult.style.display = 'none'; }
    
    const btnFinal = document.getElementById('btn-final-save');
    if (btnFinal) btnFinal.style.display = 'none';

    if (signatureListener) { signatureListener(); signatureListener = null; }
    
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
// Tải danh sách hồ sơ học sinh
async function loadStudentData() {
    const list = document.getElementById('student-data-list');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="5">Đang tải...</td></tr>';

    const snapshot = await db.collection('yt_students').get();
    window.allStudents = []; // Lưu biến toàn cục để search không cần gọi lại DB

    snapshot.forEach(doc => {
        window.allStudents.push({ id: doc.id, ...doc.data() });
    });
    renderStudentTable(window.allStudents);
}

// Biến trạng thái chế độ thao tác nhiều
let isBulkMode = false;

function renderStudentTable(data) {
    const list = document.getElementById('student-data-list');
    list.innerHTML = '';
    data.forEach(hs => {
        // Nếu có mã HS thì in ra, không có thì in chữ "Chưa có" màu mờ
        const maHocSinh = hs.studentCode ? hs.studentCode : '<span style="color:#cbd5e1; font-size:0.85rem;">Chưa có</span>';

        list.innerHTML += `
            <tr>
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
}
// ==========================================
// HỆ THỐNG XÓA HỒ SƠ (XÓA LẺ & XÓA TẬN GỐC)
// ==========================================

// 1. Hàm lõi: Quét và Xóa sạch hồ sơ + lịch sử khám + chữ ký + ĐIỂM DANH
async function deleteStudentCompletely(sid) {
    // Tìm tất cả các lịch sử khám bệnh của học sinh này
    const visitsSnap = await db.collection('yt_visits').where('studentId', '==', sid).get();
    
    // Tìm tất cả lịch sử điểm danh (nghỉ học) của học sinh này
    const attendanceSnap = await db.collection('yt_attendance').where('studentId', '==', sid).get();
    
    // Dùng batch của Firebase để xóa cùng lúc nhiều dữ liệu cho an toàn
    const batch = db.batch();
    
    // Đưa lệnh xóa lịch sử khám vào batch
    visitsSnap.forEach(doc => {
        batch.delete(doc.ref);
    });

    // Đưa lệnh xóa lịch sử điểm danh vào batch (PHẦN THÊM MỚI)
    attendanceSnap.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    // Đưa lệnh xóa hồ sơ chính của học sinh vào batch
    const studentRef = db.collection('yt_students').doc(sid);
    batch.delete(studentRef);

    // Thực thi toàn bộ lệnh xóa cùng 1 lúc
    await batch.commit();
}
// 2. Hàm kích hoạt khi bấm nút THÙNG RÁC MÀU ĐỎ (Xóa 1 người)
async function deleteStudent(sid, name) {
    // Dự phòng trường hợp không lấy được tên thì hiển thị Mã YT
    const displayName = name && name !== 'undefined' ? name : sid; 
    
    if (confirm(`⚠️ CẢNH BÁO NGUY HIỂM:\n\nBạn đang chuẩn bị xóa học sinh: ${displayName}.\nToàn bộ HỒ SƠ, LỊCH SỬ KHÁM và CHỮ KÝ của học sinh này sẽ bị XÓA VĨNH VIỄN khỏi hệ thống.\n\nHành động này KHÔNG THỂ HOÀN TÁC. Bạn có chắc chắn?`)) {
        try {
            await deleteStudentCompletely(sid);
            alert("✅ Đã xóa hoàn toàn hồ sơ và dữ liệu y tế của học sinh này!");
            loadStudentData(); // Tự động tải lại bảng sau khi xóa xong
        } catch(e) {
            alert("Lỗi khi xóa: " + e.message);
            console.error(e);
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
    if (checkedBoxes.length === 0) return alert("Vui lòng tick chọn ít nhất 1 học sinh để xóa!");

    if (confirm(`⚠️ CẢNH BÁO:\n\nBạn sắp XÓA VĨNH VIỄN ${checkedBoxes.length} học sinh cùng toàn bộ lịch sử y tế.\nHành động này KHÔNG THỂ HOÀN TÁC. Tiếp tục?`)) {
        
        const btn = document.getElementById('btn-confirm-bulk-delete');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xóa...';
        btn.disabled = true;

        try {
            for (let box of checkedBoxes) {
                await deleteStudentCompletely(box.value);
            }
            alert(`✅ Đã xóa tận gốc ${checkedBoxes.length} hồ sơ!`);
            toggleBulkMode(); 
            loadStudentData(); 
        } catch (e) {
            alert("Lỗi: " + e.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
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
// --- TÍNH NĂNG CHỌN VÀ XÓA HÀNG LOẠT ---

// 1. Bật/Tắt chế độ hiển thị ô Checkbox
function toggleBulkDeleteMode() {
    isBulkDeleteMode = !isBulkDeleteMode;
    const toggleBtn = document.getElementById('btn-toggle-bulk-delete');
    const confirmBtn = document.getElementById('btn-confirm-bulk-delete');
    const checkboxes = document.querySelectorAll('.col-checkbox');

    if (isBulkDeleteMode) {
        // Bật chế độ
        toggleBtn.innerHTML = '<i class="fas fa-times"></i> Hủy chế độ';
        toggleBtn.style.background = '#fef2f2';
        toggleBtn.style.color = '#ef4444';
        confirmBtn.style.display = 'inline-flex';
        checkboxes.forEach(el => el.style.display = 'table-cell');
    } else {
        // Tắt chế độ
        toggleBtn.innerHTML = '<i class="fas fa-check-square"></i> Chọn xóa';
        toggleBtn.style.background = '#e2e8f0';
        toggleBtn.style.color = '#475569';
        confirmBtn.style.display = 'none';
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

// 3. Thực thi Xóa những học sinh đã được tick chọn
async function executeBulkDelete() {
    const checkedBoxes = document.querySelectorAll('.student-checkbox:checked');
    if (checkedBoxes.length === 0) {
        return alert("Vui lòng tick chọn ít nhất 1 học sinh để xóa!");
    }

    if (confirm(`⚠️ CẢNH BÁO MẤT DỮ LIỆU SỐ LƯỢNG LỚN:\n\nBạn đang chuẩn bị xóa ${checkedBoxes.length} học sinh!\nToàn bộ HỒ SƠ, LỊCH SỬ KHÁM và CHỮ KÝ của các học sinh này sẽ bị XÓA VĨNH VIỄN khỏi hệ thống.\n\nHành động này KHÔNG THỂ HOÀN TÁC. Bạn có thực sự chắc chắn?`)) {
        
        const btn = document.getElementById('btn-confirm-bulk-delete');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
        btn.disabled = true;

        try {
            // Chạy vòng lặp xóa từng học sinh đã chọn
            for (let box of checkedBoxes) {
                await deleteStudentCompletely(box.value);
            }

            alert(`✅ Đã xóa tận gốc thành công ${checkedBoxes.length} hồ sơ!`);
            
            // Khôi phục nút và giao diện
            btn.innerHTML = '<i class="fas fa-trash-alt"></i> Xóa đã chọn';
            btn.disabled = false;
            toggleBulkDeleteMode(); // Thoát chế độ chọn nhiều
            loadStudentData(); // Load lại data
            
        } catch (e) {
            alert("Đã xảy ra lỗi trong quá trình xóa: " + e.message);
            btn.innerHTML = '<i class="fas fa-trash-alt"></i> Xóa đã chọn';
            btn.disabled = false;
        }
    }
}
// Hàm lọc dữ liệu khi gõ vào ô tìm kiếm
function filterStudentTable() {
    const keyword = removeVietnameseTones(document.getElementById('search-student-input').value);
    const filtered = window.allStudents.filter(hs => 
        hs.name_search.includes(keyword) || hs.class.toLowerCase().includes(keyword) || hs.id.toLowerCase().includes(keyword)
    );
    renderStudentTable(filtered);
}
function generateStudentId() {
    // Tạo 5 số ngẫu nhiên từ 10000 đến 99999
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `YT-${randomNum}`;
}
// 1. XEM LỊCH SỬ
async function viewHistory(sid, name) {
    const modal = document.getElementById('history-student-modal');
    const title = document.getElementById('history-modal-title');
    const body = document.getElementById('history-modal-body');

    title.innerText = `Lịch sử y tế: ${name.toUpperCase()}`;
    body.innerHTML = '<div style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Đang tải dữ liệu...</div>';
    modal.style.display = 'flex'; // Mở Popup

    try {
        const snap = await db.collection('yt_visits').where('studentId', '==', sid).get();
        
        if (snap.empty) {
            body.innerHTML = "<p style='text-align:center; color:var(--text-gray); margin-top:20px;'>Học sinh chưa có lịch sử khám bệnh.</p>";
        } else {
            let visits = [];
            snap.forEach(doc => visits.push(doc.data()));
            visits.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

            let html = '<ul style="list-style:none; padding:0; margin:0;">';
            visits.forEach(d => {
                const time = d.timestamp ? new Date(d.timestamp.seconds*1000).toLocaleString('vi-VN') : 'N/A';
                const noteHtml = d.note ? `<div style="margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; font-size:0.85rem; color:#64748b;"><i class="fas fa-pen"></i> Ghi chú: ${d.note}</div>` : '';
                
                html += `
                    <li style="background:#f8fafc; padding:15px 20px; border-radius:10px; margin-bottom:15px; border-left:4px solid #0062ff; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                        <div style="font-weight:bold; color:#1e293b; margin-bottom:8px;">📅 ${time}</div>
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
            // Lấy mã HS đổ ra giao diện
            if(d.studentCode) document.getElementById('edit-hs-code').value = d.studentCode; 
            
            if(d.dob) document.getElementById('edit-hs-dob').value = d.dob;
            if(d.gender) document.getElementById('edit-hs-gender').value = d.gender;
            if(d.phone) document.getElementById('edit-hs-phone').value = d.phone;
            if(d.parentPhone) document.getElementById('edit-hs-parent-phone').value = d.parentPhone;
            if(d.street) document.getElementById('edit-hs-street').value = d.street;
            if(d.ward) document.getElementById('edit-hs-ward').value = d.ward;
            if(d.height) document.getElementById('edit-hs-height').value = d.height;
            if(d.weight) document.getElementById('edit-hs-weight').value = d.weight;
            if(d.medicalNote) document.getElementById('edit-hs-medical-note').value = d.medicalNote;
        }
    } catch(e) { 
        console.error("Lỗi lấy dữ liệu:", e); 
    }
}
async function saveStudentEdit() {
    const sid = document.getElementById('edit-hs-id').value;
    
    // Đã sửa lại lỗi dấu chấm phẩy và tên biến ở đây
    const dataToSave = {
        studentCode: document.getElementById('edit-hs-code').value.trim(), 
        name: document.getElementById('edit-hs-name').value.trim(),
        class: document.getElementById('edit-hs-class').value.trim(),
        name_search: removeVietnameseTones(document.getElementById('edit-hs-name').value.trim()),
        dob: document.getElementById('edit-hs-dob').value,
        gender: document.getElementById('edit-hs-gender').value,
        phone: document.getElementById('edit-hs-phone').value.trim(),
        parentPhone: document.getElementById('edit-hs-parent-phone').value.trim(),
        street: document.getElementById('edit-hs-street').value.trim(),
        ward: document.getElementById('edit-hs-ward').value.trim(),
        city: document.getElementById('edit-hs-city').value,
        height: document.getElementById('edit-hs-height').value.trim(),
        weight: document.getElementById('edit-hs-weight').value.trim(),
        medicalNote: document.getElementById('edit-hs-medical-note').value.trim()
    };

    if (!dataToSave.name || !dataToSave.class) return alert("❌ Tên và lớp không được để trống!");

    try {
        await db.collection('yt_students').doc(sid).update(dataToSave);
        alert("✅ Cập nhật thông tin thành công!");
        closeEditModal();
        
        // Nếu đang ở tab Tiếp Nhận thì gọi tải lại khung Lịch sử
        if(document.getElementById('tab-yte-tiepnhan').style.display !== 'none') {
            checkStudentHistory(); 
        } else {
            loadStudentData(); // Đang ở tab Quản lý thì load lại bảng
        }
    } catch(e) { alert("Lỗi cập nhật: " + e.message); }
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

        const hsSnap = await db.collection('yt_students').where('name', '==', name).where('class', '==', className).get();

        if (!hsSnap.empty) {
            const st = hsSnap.docs[0].data();
            const sid = hsSnap.docs[0].id;
            
            // Hiện nút sửa hồ sơ gốc
            currentReceptionStudent = { id: sid, ...st };
            btnQuickEdit.style.display = 'inline-flex';

            // Hiển thị Thông tin hành chính
            let adminInfoHTML = `
                <div style="background: white; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 10px; font-size: 0.85rem;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>🎂 Ngày sinh: <strong>${st.dob ? new Date(st.dob).toLocaleDateString('vi-VN') : '--'}</strong></div>
                        <div>⚥ Giới tính: <strong>${st.gender || '--'}</strong></div>
                        <div>📞 SĐT HS: <strong>${st.phone || '--'}</strong></div>
                        <div>👨‍👩‍👧 SĐT PH: <strong>${st.parentPhone || '--'}</strong></div>
                        <div style="grid-column: span 2;">🏠 Đ/c: <strong>${st.street ? `${st.street}, ${st.ward}, ${st.city}` : '--'}</strong></div>
                    </div>
                </div>
            `;

            // Xử lý Cảnh báo Y tế
            let warningHTML = st.medicalNote ? `<div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 8px; margin-top: 10px; color: #991b1b; font-size: 0.85rem; border-radius: 4px;"><strong style="color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> CẢNH BÁO:</strong> ${st.medicalNote}</div>` : '';

            // Xử lý Thể trạng
            let physicalInfoHTML = "";
            if (st.height && st.weight) {
                const h = parseFloat(st.height); const w = parseFloat(st.weight);
                const bmi = (w / Math.pow(h/100, 2)).toFixed(1);
                let bmiColor = bmi < 18.5 ? "#f59e0b" : (bmi >= 25 ? "#ef4444" : "#10b981");
                physicalInfoHTML = `<div style="margin-top: 10px; padding: 8px; background: #f0fdf4; border: 1px solid #10b981; border-radius: 6px; display: flex; justify-content: space-between; font-size: 0.85rem; color: #065f46;"><div>🧍 Cao: <strong>${h} cm</strong></div><div>⚖️ Nặng: <strong>${w} kg</strong></div><div>📊 BMI: <strong style="color: ${bmiColor};">${bmi}</strong></div></div>`;
            }
            studentIdStr = `<span style="color: #0062ff; font-weight: bold; font-size:1.1rem;"><i class='fas fa-id-card'></i> Mã YT: ${sid}</span> ${adminInfoHTML} ${physicalInfoHTML} ${warningHTML}`;
        }

        const snap = await db.collection('yt_visits').where('name', '==', name).where('class', '==', className).get();
        if (snap.empty) {
            previewBox.innerHTML = `${studentIdStr}<br><div style="margin-top:15px; color:var(--text-gray); font-size: 0.85rem; text-align:center;">Chưa có lịch sử khám bệnh.</div>`;
        } else {
            let visits = []; snap.forEach(doc => visits.push(doc.data()));
            
            // Sắp xếp lịch sử khám mới nhất lên đầu
            visits.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

            let historyHTML = `${studentIdStr}<hr style="margin: 15px 0; border: 0; border-top: 1px dashed #cbd5e1;">`;
            historyHTML += `<div style="font-weight:bold; color:#1e293b; margin-bottom:10px; font-size:0.9rem;">TOÀN BỘ LỊCH SỬ KHÁM BỆNH:</div><ul style="padding-left: 15px; margin: 0; color: #334155; font-size: 0.85rem;">`;
            
            // ĐÃ BỎ LỆNH .slice(0, 5) ĐỂ HIỂN THỊ TOÀN BỘ
            visits.forEach(v => { 
                const date = v.timestamp ? new Date(v.timestamp.seconds * 1000).toLocaleDateString('vi-VN') : 'N/A';
                historyHTML += `<li style="margin-bottom: 8px;"><strong style="color: #0f172a;">${date}</strong>: ${v.symptom} <i class="fas fa-arrow-right" style="font-size:0.8em; color:#94a3b8; margin: 0 5px;"></i> <span style="color: #059669;">${v.treatment}</span></li>`;
            });
            
            historyHTML += `</ul>`;
            previewBox.innerHTML = historyHTML;
        }
    } catch (err) { previewBox.innerHTML = "<span style='color:red;'>Lỗi tải dữ liệu!</span>"; }
}
// Hàm tải trạng thái giường bệnh
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
            const v = doc.data();
            const time = v.timestamp ? new Date(v.timestamp.seconds * 1000).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '';
            
            // Nút báo phụ huynh
            let btnPH = `<button onclick="notifyParent('${doc.id}')" class="btn" style="background:#fef3c7; color:#d97706; padding: 6px 12px; font-size: 0.85rem;"><i class="fas fa-phone-volume"></i> Đã báo PH</button>`;
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

async function notifyParent(visitId) {
    if(confirm("Xác nhận đã gọi điện báo Phụ huynh? Hệ thống sẽ lưu lại thời gian hiện tại.")) {
        await db.collection('yt_visits').doc(visitId).update({
            notifiedParentAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}
async function clearBed(bedNum) {
    if(confirm(`Xác nhận trả giường số ${bedNum}?`)) {
        await db.collection('yt_beds').doc('bed_' + bedNum).delete();
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

function loadStudentTickets() {
    const filter = document.getElementById('ticket-filter').value;
    const container = document.getElementById('admin-ticket-list');
    
    let query = db.collection('yt_tickets').orderBy('timestamp', 'desc');
    if (filter !== 'all') {
        query = db.collection('yt_tickets').where('status', '==', filter).orderBy('timestamp', 'desc');
    }

    query.onSnapshot(snap => {
        if (!container) return;
        container.innerHTML = '';
        
        if (snap.empty) {
            container.innerHTML = '<div style="text-align:center; padding: 40px; background: white; border-radius: 10px; color: #64748b;">Không có yêu cầu nào trong mục này.</div>';
            return;
        }

        snap.forEach(doc => {
            const t = doc.data();
            const date = t.timestamp ? new Date(t.timestamp.seconds * 1000).toLocaleString('vi-VN') : 'Vừa xong';
            
            let bg = "white";
            if(t.status === 'pending') bg = "#fffbeb";
            else if(t.status === 'resolved') bg = "#f8fafc";

            container.innerHTML += `
                <div class="form-card" style="padding: 20px; background: ${bg}; margin-bottom: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                        <div>
                            <span style="background: #0062ff; color: white; padding: 3px 8px; border-radius: 5px; font-size: 0.8rem; font-weight: bold; margin-right: 10px;">${t.ticketId}</span>
                            <h3 style="display: inline; font-size: 1.1rem;">${t.name} (${t.class})</h3>
                            <div style="font-size: 0.85rem; color: #64748b; margin-top: 5px;"><i class="far fa-clock"></i> ${date}</div>
                        </div>
                        <div>
                            ${t.status === 'pending' ? `<span style="color:#f59e0b; font-weight:bold;">● Mới</span>` : ''}
                            ${t.status === 'processing' ? `<span style="color:#3b82f6; font-weight:bold;">● Đang giải quyết</span>` : ''}
                            ${t.status === 'resolved' ? `<span style="color:#10b981; font-weight:bold;"><i class="fas fa-lock"></i> Đã đóng</span>` : ''}
                        </div>
                    </div>
                    
                    <p style="background: rgba(0,0,0,0.03); padding: 15px; border-radius: 10px; color: #1e293b; font-weight: 500; margin-bottom: 15px;">"${t.content}"</p>
                    
                    <!-- Phần Reply của Admin -->
                    ${t.status !== 'resolved' ? `
                        <div style="border-top: 1px dashed #cbd5e1; padding-top: 15px;">
                            <label style="font-size: 0.85rem; color: #64748b; font-weight: bold;">PHẢN HỒI CHO HỌC SINH:</label>
                            <textarea id="reply-${doc.id}" rows="2" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; margin-top: 5px;">${t.adminReply || ''}</textarea>
                            
                            <div style="display: flex; gap: 10px; margin-top: 10px;">
                                <button onclick="updateTicketStatus('${doc.id}', 'processing')" class="btn" style="background: #eff6ff; color: #3b82f6; font-size: 0.85rem;"><i class="fas fa-spinner"></i> Lưu & Đang xử lý</button>
                                <button onclick="updateTicketStatus('${doc.id}', 'resolved')" class="btn btn-success" style="font-size: 0.85rem;"><i class="fas fa-check-circle"></i> Trả lời & Đóng yêu cầu</button>
                                <button onclick="deleteTicket('${doc.id}')" class="btn btn-danger" style="font-size: 0.85rem; margin-left: auto;"><i class="fas fa-trash"></i> Hủy bỏ</button>
                            </div>
                        </div>
                    ` : `
                        <div style="background: #f0fdf4; padding: 10px; border-radius: 8px; border-left: 4px solid #10b981; margin-top: 10px;">
                            <strong style="color: #10b981;">Đã trả lời:</strong> ${t.adminReply}
                        </div>
                        <button onclick="deleteTicket('${doc.id}')" class="btn" style="background: none; color: #ef4444; padding: 5px; margin-top: 10px; font-size: 0.85rem;"><i class="fas fa-trash"></i> Xóa lịch sử này</button>
                    `}
                </div>
            `;
        });
    });
}

// Gắn hàm tự động load khi bấm Tab Hòm thư Admin
const oldSwitchTab = switchTab;
switchTab = function(tabId, btn) {
    oldSwitchTab(tabId, btn);
    if (tabId === 'tab-yte-yeucau') loadStudentTickets();
};

// Hàm cập nhật trạng thái và lưu câu trả lời
async function updateTicketStatus(docId, newStatus) {
    const replyText = document.getElementById(`reply-${docId}`).value.trim();
    if (newStatus === 'resolved' && !replyText) {
        return alert("Vui lòng nhập nội dung trả lời trước khi đóng yêu cầu!");
    }

    try {
        await db.collection('yt_tickets').doc(docId).update({
            adminReply: replyText,
            status: newStatus
        });
        // Không cần alert vì onSnapshot sẽ tự động render lại UI lập tức
    } catch (e) {
        alert("Lỗi: " + e.message);
    }
}

// Hàm xóa ticket rác
async function deleteTicket(docId) {
    if (confirm("Xóa vĩnh viễn thẻ yêu cầu này khỏi hệ thống?")) {
        await db.collection('yt_tickets').doc(docId).delete();
    }
}
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
// ==========================================
// ==========================================
// TÍNH NĂNG IMPORT & LÀM GIÀU DỮ LIỆU TỪ EXCEL
// ==========================================

async function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    event.target.value = ""; // Reset input

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const btn = document.querySelector('button[onclick="document.getElementById(\'excel-upload\').click()"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đọc dữ liệu...';
            btn.disabled = true;

            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Xóa raw: false đi để lấy dữ liệu thô xác thực nhất từ Excel
            const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            
            if (rawJson.length === 0) {
                btn.innerHTML = originalText; btn.disabled = false;
                return alert("File Excel không có dữ liệu!");
            }

            // Chuẩn hóa tên cột
            const json = rawJson.map(row => {
                let normalizedRow = {};
                for (let key in row) {
                    normalizedRow[key.trim().toLowerCase()] = row[key];
                }
                return normalizedRow;
            });

            // 🌟 THUẬT TOÁN ÉP ĐỊNH DẠNG NGÀY THÁNG EXCEL CỰC MẠNH
            const parseExcelDate = (excelDate) => {
                if (!excelDate || excelDate === "") return "";
                
                // Trường hợp 1: Nếu Excel lưu ngày tháng dưới dạng số Serial (VD: 38975)
                if (typeof excelDate === 'number') {
                    // Chuyển đổi số của Excel thành ngày của Javascript (Trừ đi 25569 ngày chênh lệch giữa năm 1900 và 1970)
                    const jsDate = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
                    return jsDate.toISOString().split('T')[0]; // Trả về YYYY-MM-DD
                }

                // Trường hợp 2: Nếu Excel lưu dưới dạng Chữ (Text)
                let dateStr = String(excelDate).trim();
                
                // Xóa bỏ phần giờ phút nếu có (VD: "15/09/2006 12:00:00" -> "15/09/2006")
                dateStr = dateStr.split(" ")[0]; 

                // Nếu dùng dấu gạch chéo DD/MM/YYYY
                if (dateStr.includes('/')) {
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        const d = parts[0].padStart(2, '0');
                        const m = parts[1].padStart(2, '0');
                        let y = parts[2];
                        if (y.length === 2) y = "20" + y; // Xử lý nếu gõ năm là "06" -> "2006"
                        return `${y}-${m}-${d}`;
                    }
                }
                
                // Nếu dùng dấu gạch ngang DD-MM-YYYY hoặc YYYY-MM-DD
                if (dateStr.includes('-')) {
                     const parts = dateStr.split('-');
                     if (parts.length === 3) {
                         if (parts[0].length === 4) return dateStr; // Đã đúng chuẩn YYYY-MM-DD thì giữ nguyên
                         const d = parts[0].padStart(2, '0');
                         const m = parts[1].padStart(2, '0');
                         let y = parts[2];
                         if (y.length === 2) y = "20" + y;
                         return `${y}-${m}-${d}`;
                     }
                }

                return ""; // Nếu hoàn toàn không thể nhận diện được thì trả về rỗng
            };

            // --- BƯỚC 1: LẤY DỮ LIỆU CŨ TỪ DATABASE ĐỂ ĐỐI CHIẾU ---
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đối chiếu dữ liệu...';
            const snapshot = await db.collection('yt_students').get();
            
            const existingStudentsMap = new Map();
            const existingIds = new Set(); 

            snapshot.forEach(doc => {
                const d = doc.data();
                existingIds.add(doc.id);
                if (d.name && d.class) {
                    const key = `${d.name.trim().toLowerCase()}_${d.class.trim().toLowerCase()}`;
                    existingStudentsMap.set(key, { id: doc.id, ...d });
                }
            });

            // --- BƯỚC 2: XỬ LÝ DỮ LIỆU EXCEL ---
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
                
                // 👉 DÙNG HÀM XỬ LÝ NGÀY THÁNG VỪA TẠO
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
                    const studentKey = `${cleanName.toLowerCase()}_${cleanClass.toLowerCase()}`;

                    if (existingStudentsMap.has(studentKey)) {
                        // CẬP NHẬT THÊM THÔNG TIN VÀO CHỖ TRỐNG
                        const existingData = existingStudentsMap.get(studentKey);
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
                        checkAndUpdate('dob', dob); // Update Ngày Sinh
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
                        // TẠO MỚI HOÀN TOÀN
                        let sid;
                        let isUnique = false;
                        while (!isUnique) {
                            const randomNum = Math.floor(10000 + Math.random() * 90000);
                            sid = `YT-${randomNum}`;
                            if (!existingIds.has(sid)) { existingIds.add(sid); isUnique = true; }
                        }

                        const ref = db.collection('yt_students').doc(sid);
                        const newData = {
                            id: sid, name: cleanName, class: cleanClass, studentCode: studentCode,
                            height, weight, dob, gender, phone, parentPhone, street, ward, city,
                            name_search: removeVietnameseTones(cleanName),
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        currentBatch.set(ref, newData);

                        existingStudentsMap.set(studentKey, newData);
                        
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

            // --- BƯỚC 3: THỰC THI GHI DỮ LIỆU ---
            if (successCount === 0 && updatedCount === 0) {
                btn.innerHTML = originalText; btn.disabled = false;
                return alert(`ℹ️ Quá trình kết thúc.\nĐã bỏ qua ${skippedCount} dòng do mọi thông tin của các học sinh này trên hệ thống đã đầy đủ.`);
            }

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu lên mây...';
            
            for (let batch of batches) {
                await batch.commit();
            }

            btn.innerHTML = originalText; btn.disabled = false;
            
            alert(`✅ Hoàn tất nhập Excel!\n- Tạo mới thành công: ${successCount} hồ sơ.\n- Cập nhật thêm thông tin cho: ${updatedCount} hồ sơ cũ.\n- Bỏ qua (Đã đủ thông tin): ${skippedCount} dòng.`);
            loadStudentData(); 

        } catch (error) {
            alert("Lỗi khi xử lý file Excel: " + error.message);
            console.error(error);
            const btn = document.querySelector('button[onclick="document.getElementById(\'excel-upload\').click()"]');
            btn.innerHTML = '<i class="fas fa-file-excel"></i> Nhập từ Excel'; btn.disabled = false;
        }
    };
    
    reader.readAsArrayBuffer(file);
}
// ==========================================
// TÍNH NĂNG XUẤT DANH SÁCH HỌC SINH (A4 DỌC)
// ==========================================
// TÍNH NĂNG XUẤT DANH SÁCH HỌC SINH (A4 DỌC)
// ==========================================
function openExportStudentModal() { document.getElementById('export-student-modal').style.display = 'flex'; }
function closeExportStudentModal() { document.getElementById('export-student-modal').style.display = 'none'; }

async function executeExportStudents() {
    // 1. Lấy thông tin Tùy chọn cột
    const showId = document.getElementById('col-id').checked;
    const showHeight = document.getElementById('col-height').checked;
    const showWeight = document.getElementById('col-weight').checked;
    const showNote = document.getElementById('col-note').checked;
    
    // CÁC CỘT MỚI
    const showDob = document.getElementById('col-dob').checked;
    const showGender = document.getElementById('col-gender').checked;
    const showPhone = document.getElementById('col-phone').checked;
    const showParentPhone = document.getElementById('col-parentphone').checked;
    const showAddress = document.getElementById('col-address').checked;
    const showEmail = document.getElementById('col-email').checked;
    const showBmi = document.getElementById('col-bmi').checked; // Thêm dòng này

    const classFilterInput = document.getElementById('export-class-filter').value.trim().toLowerCase();
    let targetClasses = [];
    if (classFilterInput) {
        targetClasses = classFilterInput.split(',').map(c => c.trim()).filter(c => c !== "");
    }

    const btn = document.querySelector('#export-student-modal .btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    btn.disabled = true;

    try {
        const snap = await db.collection('yt_students').get();
        let allStudents = [];
        snap.forEach(doc => allStudents.push(doc.data()));

        if (allStudents.length === 0) {
            btn.innerHTML = originalText; btn.disabled = false;
            return alert("Hiện chưa có học sinh nào trong hệ thống!");
        }

        let filteredStudents = targetClasses.length > 0 
            ? allStudents.filter(hs => targetClasses.includes((hs.class || "").toLowerCase())) 
            : allStudents;

        if (filteredStudents.length === 0) {
            btn.innerHTML = originalText; btn.disabled = false;
            return alert("Không tìm thấy học sinh nào thuộc các lớp đã nhập!");
        }

        let studentsByClass = {};
        filteredStudents.forEach(hs => {
            const cName = hs.class || "Chưa xếp lớp";
            if (!studentsByClass[cName]) studentsByClass[cName] = [];
            studentsByClass[cName].push(hs);
        });

        const sortedClasses = Object.keys(studentsByClass).sort((a, b) => a.localeCompare(b, 'vi'));

        let fullPrintHTML = '';

        sortedClasses.forEach((className, index) => {
            let classStudents = studentsByClass[className];
            classStudents.sort((a, b) => (a.name || "").localeCompare(b.name || "", 'vi'));

            const pageBreakCSS = index > 0 ? 'page-break-before: always; break-before: page;' : '';

            // TẠO HEADER BẢNG DỰA TRÊN TÙY CHỌN
            let theadHTML = `<tr>
                <th style="width: 5%;">STT</th>
                ${showId ? '<th>Mã YT</th>' : ''}
                <th>Họ và tên</th>
                <th>Lớp</th>
                ${showDob ? '<th>Ngày sinh</th>' : ''}
                ${showGender ? '<th>Giới tính</th>' : ''}
                ${showHeight ? '<th>Cao</th>' : ''}
                ${showWeight ? '<th>Nặng</th>' : ''}
                ${showBmi ? '<th>BMI</th>' : ''}
                ${showPhone ? '<th>SĐT HS</th>' : ''}
                ${showParentPhone ? '<th>SĐT PH</th>' : ''}
                ${showEmail ? '<th>Email Liên kết</th>' : ''}
                ${showAddress ? '<th style="width: 15%;">Địa chỉ</th>' : ''}
                ${showNote ? '<th style="width: 15%;">Ghi chú LS</th>' : ''}
            </tr>`;

            // TẠO BODY BẢNG
            let tbodyHTML = '';
            classStudents.forEach((hs, i) => {
                const dobFormat = hs.dob ? new Date(hs.dob).toLocaleDateString('vi-VN') : '';
                const fullAddress = hs.street ? `${hs.street}, ${hs.ward}` : '';
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
                    <td style="text-align:left;">${hs.name}</td>
                    <td style="text-align:center;">${hs.class}</td>
                    ${showDob ? `<td style="text-align:center;">${dobFormat}</td>` : ''}
                    ${showGender ? `<td style="text-align:center;">${hs.gender || ''}</td>` : ''}
                    ${showHeight ? `<td style="text-align:center;">${hs.height ? hs.height+' cm' : ''}</td>` : ''}
                    ${showWeight ? `<td style="text-align:center;">${hs.weight ? hs.weight+' kg' : ''}</td>` : ''}
                    ${showBmi ? `<td style="text-align:center; font-weight:bold;">${bmiValue}</td>` : ''} <!-- Thêm dòng này -->
                    ${showPhone ? `<td style="text-align:center;">${hs.phone || ''}</td>` : ''}
                    ${showParentPhone ? `<td style="text-align:center;">${hs.parentPhone || ''}</td>` : ''}
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

// Ép định dạng A4 Dọc và Ép cỡ chữ nhỏ lại cho bảng
        const style = document.createElement('style');
        style.id = 'print-portrait-style';
        style.innerHTML = `
            @page { size: A3 Landscape; margin: 10mm; }
            #print-section .print-table th, 
            #print-section .print-table td { 
                font-size: 10pt !important; 
                padding: 6px 4px !important; 
            }
        `;
        document.head.appendChild(style);
        closeExportStudentModal();
        printArea.style.display = 'block';
        
        setTimeout(() => {
            window.print();
            printArea.style.display = 'none';
            printArea.innerHTML = '';
            document.getElementById('print-portrait-style').remove();
        }, 500);

    } catch (err) {
        alert("Lỗi xuất dữ liệu: " + err.message);
        console.error(err);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
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

    // Nếu chưa có dữ liệu trong bộ nhớ tạm, tiến hành tải 1 lần duy nhất
    if (!adminLookupCache) {
        box.innerHTML = '<div style="padding:10px; color:#64748b; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Đang nạp danh sách...</div>';
        box.style.display = 'block';
        
        try {
            const snap = await db.collection('yt_students').get();
            adminLookupCache = [];
            snap.forEach(doc => {
                adminLookupCache.push({ id: doc.id, ...doc.data() });
            });
        } catch (e) {
            console.error("Lỗi nạp danh sách:", e);
            return;
        }
    }

    // Chuẩn hóa từ khóa người dùng gõ: Xóa dấu tiếng Việt, đưa về chữ thường
    const keyword = removeVietnameseTones(val.trim());

    // THUẬT TOÁN TÌM KIẾM MỞ RỘNG (Fuzzy Search)
    const filtered = adminLookupCache.filter(st => {
        // Gom Tên, Mã YT và Lớp lại thành 1 chuỗi dài không dấu để tìm kiếm
        const searchString = `${st.name_search} ${st.id.toLowerCase()} ${st.class.toLowerCase()}`;
        
        // Chỉ cần chuỗi dài này CHỨA từ khóa người dùng gõ là hợp lệ
        return searchString.includes(keyword);
    });

    box.innerHTML = '';
    
    if (filtered.length === 0) { 
        box.innerHTML = '<div style="padding:10px; color:#ef4444; text-align:center;">Không tìm thấy học sinh nào!</div>';
        box.style.display = 'block';
        return; 
    }

    // Chỉ lấy 10 kết quả tốt nhất để hiển thị cho gọn
    const results = filtered.slice(0, 10);

    results.forEach(d => {
        const item = document.createElement('div');
        item.className = 'suggest-item';
        item.innerHTML = `<div style="display:flex; justify-content:space-between;">
                            <strong>${d.name}</strong> 
                            <span style="color:#0062ff; font-size:0.85rem; font-weight:bold;">${d.class}</span>
                          </div>
                          <div style="font-size:0.75rem; color:#64748b;">Mã: ${d.id}</div>`;
        item.onclick = () => {
            document.getElementById('admin-lookup-input').value = `${d.name} (${d.class})`;
            hiddenId.value = d.id; // Lưu ngầm ID vào thẻ ẩn
            box.style.display = 'none';
        };
        box.appendChild(item);
    });
    
    box.style.display = 'block';
}

// Hàm dọn dẹp bộ nhớ tạm khi chuyển tab (Đảm bảo dữ liệu luôn mới nhất nếu Admin vừa thêm học sinh)
const originalSwitchTab = switchTab;
switchTab = function(tabId, btn) {
    originalSwitchTab(tabId, btn);
    if (tabId === 'tab-yte-tracuu-admin') {
        adminLookupCache = null; // Làm mới lại danh sách tìm kiếm mỗi khi bấm vào tab Tra cứu
        document.getElementById('admin-lookup-input').value = '';
        document.getElementById('admin-lookup-result').style.display = 'none';
    }
};

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
                        <tr><td style="color:#64748b;">SĐT Học sinh:</td><td style="font-weight:500;">${st.phone || '--'}</td></tr>
                        <tr><td style="color:#64748b;">SĐT Phụ huynh:</td><td style="font-weight:500;">${st.parentPhone || '--'}</td></tr>
                        <tr><td style="color:#64748b; vertical-align: top;">Địa chỉ:</td><td style="font-weight:500;">${st.street ? `${st.street}, ${st.ward}, ${st.city}` : '--'}</td></tr>
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
    if (!rawContent) return alert("Vui lòng dán nội dung thô vào ô để AI xử lý!");

    const btn = document.getElementById('btn-generate-ai');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI đang phân tích và viết Code...';
    btn.disabled = true;

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

        document.getElementById('p-content').value = aiHTML;
        alert("✨ Thành công! AI đã phân tích và tự động điền Code HTML vào ô Nội dung.");
        toggleAIGenerator(); 

    } catch (error) {
        alert("❌ Lỗi AI: " + error.message);
        console.error("Chi tiết lỗi:", error);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
// ==========================================
// HỆ THỐNG MÁY QUÉT KHÔNG DÂY (REMOTE SCANNER)
// ==========================================
let currentSyncCode = null;
let scannerListener = null;

function generateSyncCode() {
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
            document.getElementById('yt-name').value = studentData.name;
            document.getElementById('yt-class').value = studentData.class;
            
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