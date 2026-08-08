/**
 * EMAIL SERVICE - HỆ THỐNG ĐIỀU PHỐI & QUẢN LÝ HẠN NGẠCH GỬI MAIL
 * THPT VÕ THỊ SÁU
 */

const EmailService = (function () {
    // 1. CẤU HÌNH DANH SÁCH CÁC KÊNH GỬI (ĐỒNG BỘ NGHỆ THUẬT FAILOVER)
    const PROVIDERS = [
        {
            id: "gas_noreply1",
            name: "GAS Chính (Noreply1)",
            sender: "noreply1.yte.thptvothisaubrvt@gmail.com",
            url: "https://script.google.com/macros/s/AKfycbyYlJK7ifekJhkUkHVW_jKMY1nItkHUYABcsezIuiY1f2UyyhBY42uodWNlLW7Pm3wFgA/exec",
            dailyLimit: 95 // Đặt ngưỡng an toàn (Gmail cho 100, chừa 5 tin dự phòng)
        },
        {
            id: "gas_yte",
            name: "GAS Dự Phòng (Y Tế Gốc)",
            sender: "yte.thptvothisaubrvt@gmail.com",
            url: "https://script.google.com/macros/s/AKfycbwxC8WvkDMzkhTdW5tzQYIAHw-KNsFsFVUDjdKc_10AbENlUQQnhQeuuLHLpOFGTAM0/exec",
            dailyLimit: 95
        }
        /* SAU NÀY CÓ TÊN MIỀN RIÊNG BẠN CHỈ CẦN THÊM BREVO / RESEND VÀO ĐÂY:
        ,
        {
            id: "resend_custom_domain",
            name: "Resend (Tên miền trường)",
            sender: "noreply@thptvothisau.edu.vn",
            url: "https://script.google.com/macros/s/LINK_GAS_RESEND/exec",
            dailyLimit: 1000
        }
        */
    ];

    const STORAGE_KEY = "vts_email_quota_tracker";

    // 2. HÀM QUẢN LÝ QUOTA VÀ ĐẾM LƯỢT GỬI TRÊN BỘ NHỚ TRÌNH DUYỆT (LOCAL STORAGE)
    function getQuotaData() {
        const todayStr = new Date().toISOString().split('T')[0]; // Định dạng YYYY-MM-DD
        const defaultData = { date: todayStr, counts: {} };

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Nếu sang ngày mới -> Tự động Reset bộ đếm hạn ngạch về 0
                if (parsed.date === todayStr) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn("[EmailService] Lỗi đọc bộ nhớ Quota:", e);
        }
        return defaultData;
    }

    function saveQuotaData(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn("[EmailService] Lỗi lưu bộ nhớ Quota:", e);
        }
    }

    // Ghi nhận thêm 1 lần gửi thành công cho Provider tương ứng
    function incrementUsage(providerId) {
        const data = getQuotaData();
        data.counts[providerId] = (data.counts[providerId] || 0) + 1;
        saveQuotaData(data);
    }

    // Kiểm tra Provider xem đã chạm ngưỡng giới hạn trong ngày chưa
    function isProviderQuotaAvailable(provider) {
        const data = getQuotaData();
        const currentCount = data.counts[provider.id] || 0;
        return currentCount < provider.dailyLimit;
    }

// 3. THỰC THI GỬI HTTP POST SANG GOOGLE APPS SCRIPT (ĐÃ NÂNG CẤP CHỐNG TRAN HẠN DỮ LIỆU)
    async function executeFetch(provider, to, subject, htmlBody) {
        // Cấu hình Timeout 15 giây
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            // Dùng POST để truyền nội dung HTML dài không bị giới hạn URL
            const response = await fetch(provider.url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Dùng text/plain để tránh dính CORS preflight của Google
                body: JSON.stringify({
                    to_email: to,
                    subject: subject,
                    html_body: htmlBody,
                    provider_name: provider.id
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP Status Error: ${response.status}`);

            const result = await response.json();
            
            if (result && result.status === "success") {
                incrementUsage(provider.id);
                return { success: true, provider: provider.name, sender: provider.sender };
            } else {
                throw new Error(result.message || "Script trả về trạng thái lỗi.");
            }
        } catch (err) {
            clearTimeout(timeoutId);
            console.warn(`[EmailService] Tuyến ${provider.name} thất bại:`, err.message);
            return { success: false, error: err.message };
        }
    }

    // 4. HÀM ĐIỀU PHỐI CHÍNH (PUBLIC API)
    async function sendEmail({ to, subject, htmlBody }) {
        if (!to || !subject || !htmlBody) {
            throw new Error("Lỗi lập trình: Thiếu tham số to, subject hoặc htmlBody.");
        }

        console.log(`[EmailService] Khởi tạo luồng gửi mail tới: ${to}`);

        // Quét danh sách các kênh gửi
        for (let i = 0; i < PROVIDERS.length; i++) {
            const provider = PROVIDERS[i];

            // BƯỚC THÔNG MINH 1: Kiểm tra xem Kênh này hôm nay đã hết Quota chưa
            if (!isProviderQuotaAvailable(provider)) {
                console.warn(`[EmailService] Kênh ${provider.name} đã đạt hạn ngạch tối đa trong ngày. Tự động nhảy sang kênh tiếp theo...`);
                continue; // Nhảy qua provider tiếp theo luôn, không tốn thời gian gọi Fetch
            }

            console.log(`[EmailService] Thử gửi qua Kênh: ${provider.name}...`);

            // BƯỚC THÔNG MINH 2: Đẩy lệnh gửi
            const res = await executeFetch(provider, to, subject, htmlBody);
            
            if (res.success) {
                console.log(`[EmailService] Gửi THÀNH CÔNG qua: ${res.provider} (${res.sender})`);
                return res; // Thoát và báo thành công
            }

            // Nếu thất bại (VD: Google báo hết quota đột xuất) -> Vòng lặp for sẽ tự nhảy sang Kênh tiếp theo
        }

        // Nếu tất cả các kênh đều thất bại hoặc hết Quota trong ngày
        throw new Error("Tất cả các hòm thư tự động hôm nay đã đạt giới hạn gửi (200 thư/ngày). Vui lòng thử lại vào ngày mai!");
    }

    return {
        sendEmail: sendEmail
    };
})();
