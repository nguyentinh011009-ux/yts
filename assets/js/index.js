/* INDEX.JS - LOGIC DÀNH RIÊNG CHO TRANG CHỦ (INDEX.HTML) */

// --- 1. KHỞI TẠO BIẾN TOÀN CỤC ---
let sliderInterval = null;
let allPosts = [];

// --- 2. HÀM HỖ TRỢ CẮT CHỮ THUẦN TÚY TỪ HTML ---
function getCleanSnippet(htmlContent) {
    if (!htmlContent) return '';
    let temp = document.createElement('div');
    temp.innerHTML = htmlContent;
    let styles = temp.querySelectorAll('style, script');
    styles.forEach(s => s.remove());
    let text = temp.textContent || temp.innerText || "";
    return text.replace(/\s+/g, ' ').trim();
}

// --- 3. THỐNG KÊ TRUY CẬP (VISITOR COUNTER) ---
const statsRef = db.collection("settings").doc("stats");

if (!sessionStorage.getItem('vts_visited')) {
    sessionStorage.setItem('vts_visited', 'true');
    statsRef.set({ visitCount: firebase.firestore.FieldValue.increment(1) }, { merge: true });
}

statsRef.get().then((doc) => {
    if (doc.exists && doc.data().visitCount) {
        const visitCountEl = document.getElementById('visit-count');
        if (visitCountEl) visitCountEl.innerText = doc.data().visitCount.toLocaleString();
    }
});

// --- 4. HIỂN THỊ THÔNG TIN USER TRÊN HEADER ---
firebase.auth().onAuthStateChanged((user) => {
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
});

// --- 5. QUẢN LÝ DỮ LIỆU & SLIDER TRANG CHỦ ---
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
                <div class="post-card fade-in">
                    <img src="${p.cover}" class="post-card-img">
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
        
        pinnedSection.style.display = pinnedGrid.innerHTML ? 'block' : 'none';
    });

    // Load Slider Banner
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
    
    if (window.sliderInterval) clearInterval(window.sliderInterval);
    
    window.sliderInterval = setInterval(() => {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
    }, 5000);
}

// --- 6. HÀM XEM MODAL VÀ TÌM KIẾM BÀI VIẾT ---
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

function closeModal() { 
    const modal = document.getElementById('view-modal');
    if (modal) modal.style.display = 'none'; 
}

function searchPosts() {
    const term = document.getElementById('search-input').value.toLowerCase();
    
    const filtered = allPosts.filter(p => 
        p.title.toLowerCase().includes(term) || 
        p.content.toLowerCase().includes(term)
    );
    
    const pinnedGrid = document.getElementById('pinned-grid');
    const mainGrid = document.getElementById('main-grid');
    const pinnedSection = document.getElementById('pinned-section');
    
    if(!pinnedGrid || !mainGrid) return;
    
    pinnedGrid.innerHTML = ''; 
    mainGrid.innerHTML = '';
    
    filtered.forEach(p => {
        const html = `
            <div class="post-card fade-in">
                <img src="${p.cover}" class="post-card-img">
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

// --- 7. KHỞI CHẠY KHI VÀO TRANG ---
if (document.getElementById('pinned-grid') || document.getElementById('main-slider')) {
    renderHome();
}
