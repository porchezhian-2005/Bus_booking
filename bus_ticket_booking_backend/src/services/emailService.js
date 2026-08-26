import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Simple HTML helper to replace {{key}} placeholders in template files
   */
  renderTemplate(templateName, variables) {
    const templatePath = path.join(__dirname, '../templates', `${templateName}.hbs`);
    let templateContent = fs.readFileSync(templatePath, 'utf8');

    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      templateContent = templateContent.replace(regex, variables[key] || '');
    });

    return templateContent;
  }

  /**
   * Send Email using HTML Templates with optional attachments
   */
  async sendTemplateEmail(toEmail, subject, templateName, variables = {}, attachments = []) {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`📧 [Development Email Simulated] To: ${toEmail} | Subject: ${subject}`);
        return { messageId: "simulated-email-id" };
      }

      const htmlContent = this.renderTemplate(templateName, variables);

      const mailOptions = {
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to: toEmail,
        subject: subject,
        html: htmlContent,
        attachments: attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${toEmail}: ${info.messageId}`);
      return info;
    } catch (err) {
      console.error(`⚠️ Email Delivery Notice (${toEmail}):`, err.message);
      return { messageId: "email-failed-handled" };
    }
  }
}

export default EmailService;
