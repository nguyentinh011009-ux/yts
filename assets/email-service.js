/**
 * EMAIL SERVICE MODULE - HE THONG Y TE TRUONG THPT VO THI SAU
 * Quản lý gửi mail OTP đa kênh (GAS, Brevo, Resend) với cơ chế tự động chuyển luồng dự phòng (Failover)
 */

const EmailService = (function () {
    // Cấu hình các Endpoint API gửi email
    // Gợi ý: Mỗi URL GAS đóng vai trò xử lý gửi qua Google Native hoặc đóng vai trò Proxy gửi qua Brevo/Resend
    const PROVIDERS = [
        {
            name: "GAS_Primary_Noreply1",
            sender: "noreply1.yte.thptvothisaubrvt@gmail.com",
            url: "https://script.google.com/macros/s/YOUR_GAS_NOREPLY1_ID/exec"
        },
        {
            name: "Brevo_Primary_Noreply1",
            sender: "noreply1.yte.thptvothisaubrvt@gmail.com",
            url: "https://script.google.com/macros/s/YOUR_GAS_BREVO_NOREPLY1_PROXY_ID/exec"
        },
        {
            name: "Resend_Primary_Noreply1",
            sender: "noreply1.yte.thptvothisaubrvt@gmail.com",
            url: "https://script.google.com/macros/s/YOUR_GAS_RESEND_NOREPLY1_PROXY_ID/exec"
        },
        {
            name: "GAS_Backup_YTeGoc",
            sender: "yte.thptvothisaubrvt@gmail.com",
            url: "https://script.google.com/macros/s/AKfycbwNMYm2NrbF-EYJ_eTOmDurysm9n9n1QS-i4x8eMMJ4Exr1V95DIvMJ3PjjiaYS9CFz/exec" // URL cũ của bạn
        },
        {
            name: "Resend_Backup_YTeGoc",
            sender: "yte.thptvothisaubrvt@gmail.com",
            url: "https://script.google.com/macros/s/YOUR_GAS_RESEND_YTE_PROXY_ID/exec"
        }
    ];

    /**
     * Hàm gọi gửi mail đến 1 Provider cụ thể
     */
    async function sendViaProvider(provider, toEmail, otpCode, studentName) {
        const params = new URLSearchParams({
            to_email: toEmail,
            otp_code: otpCode,
            student_name: studentName,
            provider_name: provider.name
        });

        const requestUrl = `${provider.url}?${params.toString()}`;

        // Thiết lập Timeout 8 giây cho mỗi lượt thử
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            const response = await fetch(requestUrl, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP Error status: ${response.status}`);
            }

            const data = await response.json();
            if (data && data.status === "success") {
                return { success: true, provider: provider.name, sender: provider.sender };
            } else {
                throw new Error(data.message || "Provider trả về trạng thái thất bại.");
            }
        } catch (err) {
            clearTimeout(timeoutId);
            console.warn(`[EmailService] Kênh ${provider.name} thất bại:`, err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Hàm điều phối chính: Thử gửi từ trên xuống dưới cho đến khi thành công
     */
    async function sendOTP({ toEmail, otpCode, studentName }) {
        console.log(`[EmailService] Đang khởi tạo quá trình gửi OTP đến: ${toEmail}...`);

        for (let i = 0; i < PROVIDERS.length; i++) {
            const provider = PROVIDERS[i];
            console.log(`[EmailService] Thử gửi qua Kênh ${i + 1}/${PROVIDERS.length}: ${provider.name}...`);

            const result = await sendViaProvider(provider, toEmail, otpCode, studentName);
            if (result.success) {
                console.log(`[EmailService] Gửi email thành công qua: ${result.provider} (${result.sender})`);
                return {
                    success: true,
                    provider: result.provider,
                    sender: result.sender
                };
            }
        }

        // Tất cả các kênh đều thất bại
        throw new Error("Tất cả các hệ thống gửi mail hiện đang bận hoặc vượt quá hạn ngạch. Vui lòng thử lại sau.");
    }

    return {
        sendOTP: sendOTP
    };
})();
