// Thống kê truy cập: Tự động tăng và hiển thị số lượt
const statsRef = db.collection("settings").doc("stats");

if (!sessionStorage.getItem('vts_visited')) {
    sessionStorage.setItem('vts_visited', 'true');
    statsRef.set({ visitCount: firebase.firestore.FieldValue.increment(1) }, { merge: true });
}

// Lấy số lượt truy cập (Chỉ đọc 1 lần, không dùng onSnapshot lãng phí)
statsRef.get().then((doc) => {
    if (doc.exists && doc.data().visitCount) {
        const visitCountEl = document.getElementById('visit-count');
        if (visitCountEl) visitCountEl.innerText = doc.data().visitCount.toLocaleString();
    }
});
