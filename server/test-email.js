require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

async function test() {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    try {
        await transporter.verify();
        console.log('✅ SMTP connection successful!');
        
        const info = await transporter.sendMail({
            from: `"NexusDoc" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER, // send to themselves
            subject: 'Test Email',
            text: 'This is a test email.'
        });
        console.log('✅ Email sent: ', info.messageId);
    } catch (err) {
        console.error('❌ SMTP Error:', err);
    }
}

test();
