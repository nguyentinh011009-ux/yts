// --- 1. BIẾN TOÀN CỤC & CẤU HÌNH CACHE ---
let sliderInterval = null;
let allPosts = [];

const CACHE_POSTS_KEY = 'vts_posts_data';
const CACHE_TIME_KEY = 'vts_posts_time';
const CACHE_SLIDER_KEY = 'vts_slider_data';
const CACHE_EXPIRE_TIME = 15 * 60 * 1000; // Lưu Cache 15 phút (Tính bằng miligiây)

// --- 2. HÀM HỖ TRỢ XỬ LÝ ẢNH & CẮT CHỮ ---
// Tối ưu ảnh Cloudinary: Tự động nén và thu nhỏ kích thước ảnh cho nhẹ trang
function optimizeImage(url, width = 500) {
    if (!url) return 'https://via.placeholder.com/500x300?text=No+Image';
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
        return url.replace('/upload/', `/upload/q_auto,f_auto,w_${width}/`);
    }
    return url;
}

function getCleanSnippet(htmlContent) {
    if (!htmlContent) return '';
    let temp = document.createElement('div');
    temp.innerHTML = htmlContent;
    let styles = temp.querySelectorAll('style, script');
    styles.forEach(s => s.remove());
    let text = temp.textContent || temp.innerText || "";
    return text.replace(/\s+/g, ' ').trim();
}

// --- 3. THỐNG KÊ TRUY CẬP (ĐÃ TỐI ƯU TỐC ĐỘ) ---
function initVisitorStats() {
    const statsRef = db.collection("settings").doc("stats");
    
    // Chỉ ghi nhận lượt truy cập 1 lần mỗi phiên làm việc (Session)
    if (!sessionStorage.getItem('vts_visited')) {
        sessionStorage.setItem('vts_visited', 'true');
        statsRef.set({ visitCount: firebase.firestore.FieldValue.increment(1) }, { merge: true });
    }

    // Đọc lượt truy cập
    statsRef.get().then((doc) => {
        if (doc.exists && doc.data().visitCount) {
            const visitCountEl = document.getElementById('visit-count');
            if (visitCountEl) visitCountEl.innerText = doc.data().visitCount.toLocaleString();
        }
    }).catch(err => console.warn("Lỗi tải lượt truy cập:", err));
}

// --- 4. HIỂN THỊ THÔNG TIN USER TRÊN HEADER ---
firebase.auth().onAuthStateChanged((user) => {
    const topProfileBox = document.getElementById('top-user-profile');
    if (topProfileBox) {
        if (user) {
            topProfileBox.style.display = 'flex';
            const topUserName = document.getElementById('top-user-name');
            const topUserAvatar = document.getElementById('top-user-avatar');
            
            if (topUserName) topUserName.innerText = user.displayName || user.email.split('@')[0];
            if (topUserAvatar && user.photoURL) topUserAvatar.src = user.photoURL;
        } else {
            topProfileBox.style.display = 'none';
        }
    }
});

// --- 5. QUẢN LÝ DỮ LIỆU & RENDER TRANG CHỦ (CACHE TỐI ƯU) ---
async function renderHome() {
    const now = Date.now();
    const cachedPosts = localStorage.getItem(CACHE_POSTS_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

    // KỊCH BẢN 1: Dùng dữ liệu Cache nếu chưa quá 15 phút (0 TỐN FIREBASE READS, TẢI 0s)
    if (cachedPosts && cachedTime && (now - parseInt(cachedTime) < CACHE_EXPIRE_TIME)) {
        allPosts = JSON.parse(cachedPosts);
        renderPostsUI(allPosts);
        loadSliderData(); // Tải slider
        return;
    }

    // KỊCH BẢN 2: Lấy dữ liệu mới từ Firestore bằng .get() thay vì .onSnapshot()
    try {
        const snap = await db.collection("posts").orderBy("createdAt", "desc").get();
        allPosts = [];
        snap.forEach(doc => {
            allPosts.push({ id: doc.id, ...doc.data() });
        });

        // Lưu vào LocalStorage
        localStorage.setItem(CACHE_POSTS_KEY, JSON.stringify(allPosts));
        localStorage.setItem(CACHE_TIME_KEY, now.toString());

        renderPostsUI(allPosts);
    } catch (error) {
        console.error("Lỗi tải bài viết:", error);
    }

    loadSliderData();
}

// Hàm vẽ giao diện bài viết
function renderPostsUI(posts) {
    const pinnedGrid = document.getElementById('pinned-grid');
    const mainGrid = document.getElementById('main-grid');
    const pinnedSection = document.getElementById('pinned-section');
    
    if(!pinnedGrid || !mainGrid) return;
    pinnedGrid.innerHTML = ''; mainGrid.innerHTML = '';

    posts.forEach(p => {
        const optimizedCover = optimizeImage(p.cover, 500);
        const html = `
            <div class="post-card fade-in">
                <img src="${optimizedCover}" class="post-card-img" loading="lazy" alt="${p.title}">
                <div class="post-card-body">
                    <h3 class="post-card-title">${p.title}</h3>
                    <p class="post-card-desc">${getCleanSnippet(p.content)}</p>
                    <a href="post.html?id=${p.id}" class="btn btn-primary post-card-btn">Xem chi tiết</a>
                </div>
            </div>
        `;            
        if (p.isPinned) pinnedGrid.innerHTML += html;
        else mainGrid.innerHTML += html;
    });

    if (pinnedSection) {
        pinnedSection.style.display = pinnedGrid.innerHTML ? 'block' : 'none';
    }
}

// --- 6. QUẢN LÝ SLIDER (CÓ CACHE) ---
async function loadSliderData() {
    const cachedSlider = localStorage.getItem(CACHE_SLIDER_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    const now = Date.now();

    if (cachedSlider && cachedTime && (now - parseInt(cachedTime) < CACHE_EXPIRE_TIME)) {
        renderSliderUI(JSON.parse(cachedSlider));
        return;
    }

    try {
        const snap = await db.collection("announcements").get();
        const sliderItems = [];
        snap.forEach(doc => {
            const d = doc.data();
            if(d.image) sliderItems.push(d);
        });

        localStorage.setItem(CACHE_SLIDER_KEY, JSON.stringify(sliderItems));
        renderSliderUI(sliderItems);
    } catch (err) {
        console.error("Lỗi tải slider:", err);
    }
}

function renderSliderUI(items) {
    const slider = document.getElementById('main-slider');
    if(!slider) return;
    
    if (items.length === 0) {
        slider.style.display = 'none';
        return;
    }

    slider.innerHTML = '';
    items.forEach(d => {
        const bgImg = optimizeImage(d.image, 1000);
        slider.innerHTML += `
            <div class="slide-item">
                <div style="width:100%; height:100%; background-image:url('${bgImg}'); background-size:cover; background-position:center;"></div>
                <div class="slide-content">
                    <h2 style="font-size:2rem;">${d.text}</h2>
                    <a href="${d.link}" target="_blank" class="btn btn-primary" style="margin-top:15px;">Xem chi tiết</a>
                </div>
            </div>
        `;
    });
    startSlider();
}

function startSlider() {
    const slides = document.querySelectorAll('.slide-item');
    if (slides.length === 0) return;
    
    let current = 0;
    slides.forEach(s => s.classList.remove('active'));
    slides[0].classList.add('active');
    
    if (window.sliderInterval) clearInterval(window.sliderInterval);
    
    window.sliderInterval = setInterval(() => {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
    }, 5000);
}

// --- 7. TÌM KIẾM BÀI VIẾT (TÌM TRÊN CACHE BỘ NHỚ RAM) ---
function searchPosts() {
    const term = document.getElementById('search-input').value.toLowerCase().trim();
    
    if (!term) {
        renderPostsUI(allPosts);
        return;
    }

    const filtered = allPosts.filter(p => 
        (p.title && p.title.toLowerCase().includes(term)) || 
        (p.content && p.content.toLowerCase().includes(term))
    );
    
    renderPostsUI(filtered);
}

function closeModal() { 
    const modal = document.getElementById('view-modal');
    if (modal) modal.style.display = 'none'; 
}

// --- 8. KHỞI CHẠY KHI VÀO TRANG ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pinned-grid') || document.getElementById('main-slider')) {
        renderHome();
        initVisitorStats();
    }
});
