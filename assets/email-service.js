/**
 * EMAIL SERVICE - MODULE ĐIỀU PHỐI VÀ DỰ PHÒNG GỬI MAIL
 */
const EmailService = (function () {
    // Danh sách các Tuyến đường gửi (Provider)
    const PROVIDERS = [
        {
            name: "GAS_Primary_Noreply1",
            sender: "noreply1.yte.thptvothisaubrvt@gmail.com",
            url: "https://script.google.com/macros/s/YOUR_GAS_NOREPLY1_ID/exec"
        },
        {
            name: "Brevo_Primary_Noreply1",
            sender: "noreply1.yte.thptvothisaubrvt@gmail.com",
            url: "https://script.google.com/macros/s/YOUR_GAS_NOREPLY1_ID/exec"
        },
        {
            name: "Resend_Primary_Noreply1",
            sender: "noreply1.yte.thptvothisaubrvt@gmail.com",
            url: "https://script.google.com/macros/s/YOUR_GAS_NOREPLY1_ID/exec"
        },
        {
            name: "GAS_Backup_YTeGoc",
            sender: "yte.thptvothisaubrvt@gmail.com",
            url: "https://script.google.com/macros/s/AKfycbwNMYm2NrbF-EYJ_eTOmDurysm9n9n1QS-i4x8eMMJ4Exr1V95DIvMJ3PjjiaYS9CFz/exec"
        },
        {
            name: "Resend_Backup_YTeGoc",
            sender: "yte.thptvothisaubrvt@gmail.com",
            url: "https://script.google.com/macros/s/YOUR_GAS_YTE_ID/exec"
        }
    ];

    /**
     * Thực hiện đẩy lệnh sang Google Apps Script Backend
     */
    async function executeSend(provider, to, subject, htmlBody) {
        // Đóng gói tham số gửi đi
        const params = new URLSearchParams({
            to_email: to,
            subject: subject,
            html_body: htmlBody,
            provider_name: provider.name
        });

        const requestUrl = `${provider.url}?${params.toString()}`;
        
        // Cấu hình Timeout 8s cho mỗi tuyến
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            const response = await fetch(requestUrl, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP Status: ${response.status}`);

            const result = await response.json();
            if (result && result.status === "success") {
                return { success: true, provider: provider.name, sender: provider.sender };
            } else {
                throw new Error(result.message || "Tuyến gửi trả về lỗi.");
            }
        } catch (err) {
            clearTimeout(timeoutId);
            console.warn(`[EmailService] Lỗi tuyến ${provider.name}:`, err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * HÀM CHÍNH: Nhận lệnh gửi mail tổng quát và tự động phân chia / chuyển luồng
     */
    async function sendEmail({ to, subject, htmlBody }) {
        if (!to || !subject || !htmlBody) {
            throw new Error("Lỗi tham số: Thiếu người nhận (to), tiêu đề (subject) hoặc nội dung (htmlBody).");
        }

        console.log(`[EmailService] Bắt đầu điều phối gửi email tới: ${to}`);

        // Chạy lần lượt từ kênh Ưu tiên -> Kênh Dự phòng
        for (let i = 0; i < PROVIDERS.length; i++) {
            const provider = PROVIDERS[i];
            console.log(`[EmailService] Thử tuyến ${i + 1}/${PROVIDERS.length}: ${provider.name}`);

            const res = await executeSend(provider, to, subject, htmlBody);
            if (res.success) {
                console.log(`[EmailService] Gửi THÀNH CÔNG qua tuyến: ${res.provider}`);
                return res; // Trả kết quả thành công về cho nơi gọi
            }
        }

        // Nếu tất cả các tuyến đều thất bại
        throw new Error("Tất cả các hệ thống gửi mail hiện đang bận hoặc quá hạn ngạch. Vui lòng thử lại sau!");
    }

    return {
        sendEmail: sendEmail
    };
})();
