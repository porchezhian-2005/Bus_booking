/**
 * Welcome Email Cron Job Worker
 * 
 * Periodically checks for newly registered users who have not yet received their welcome email,
 * sends the welcome email using welcome.hbs template, and marks welcomeEmailSent = true.
 */
export class WelcomeEmailCron {
  constructor(userModel, emailService) {
    this.userModel = userModel;
    this.emailService = emailService;
    this.intervalId = null;
  }

  /**
   * Process pending welcome emails batch
   */
  async processPendingWelcomeEmails() {
    try {
      // Find users registered who haven't been sent the welcome email yet
      const pendingUsers = await this.userModel.find({
        where: {
          welcomeEmailSent: false,
        },
        limit: 20 // Process in batches of 20
      });

      if (!pendingUsers || pendingUsers.length === 0) {
        return;
      }

      for (const user of pendingUsers) {
        try {
          await this.emailService.sendTemplateEmail(
            user.email,
            'Welcome to Bus Ticket Booking System! 🚌',
            'welcome',
            {
              name: user.name,
              referralCode: user.referralCode || 'N/A'
            }
          );

          // Mark as sent so cron won't resend
          user.welcomeEmailSent = true;
          await user.save();
        } catch (err) {
          console.error(`Failed to send welcome email to user ID ${user.id} (${user.email}):`, err.message);
        }
      }
    } catch (error) {
      console.error('Error running Welcome Email Cron Job:', error.message);
    }
  }

  /**
   * Start the recurring cron interval (runs every 1 minute by default)
   */
  startCron(intervalMs = 60000) {
    if (this.intervalId) {
      console.log('Welcome Email Cron Job is already running.');
      return;
    }

    console.log('🚀 Welcome Email Cron Worker started (running every 1 minute)...');
    
    // Initial run
    this.processPendingWelcomeEmails();

    // Set recurring timer
    this.intervalId = setInterval(() => {
      this.processPendingWelcomeEmails();
    }, intervalMs);
  }

  /**
   * Stop cron worker
   */
  stopCron() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Stopped Welcome Email Cron Worker.');
    }
  }
}

export default WelcomeEmailCron;
