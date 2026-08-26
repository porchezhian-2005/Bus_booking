import { generateReferralCode } from "../utils/generatorUtils.js";

/**
 * Referral Service
 * Business logic for user referral codes, signup tracking, and crediting ₹500 reward
 */
export class ReferralService {
  constructor(userModel, referralModel, walletService, configModel, emailService) {
    this.userModel = userModel;
    this.referralModel = referralModel;
    this.walletService = walletService;
    this.configModel = configModel;
    this.emailService = emailService;
  }

  /**
   * Generate a unique referral code for a user using utility
   */
  async generateUniqueReferralCode(name) {
    const cleanName = (name || "USER").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4);
    let isUnique = false;
    let code = "";

    while (!isUnique) {
      code = generateReferralCode(cleanName);
      const existingUser = await this.userModel.findOne({ where: { referralCode: code } });
      if (!existingUser) {
        isUnique = true;
      }
    }
    return code;
  }

  /**
   * Process Referral code during new user signup
   */
  async processReferralSignup(refereeId, referralCode) {
    if (!referralCode) return;

    const referrer = await this.userModel.findOne({ where: { referralCode } });
    if (!referrer) return;

    // Get configured referral reward amount (default ₹500)
    let rewardAmount = 500.00;
    if (this.configModel) {
      const configs = await this.configModel.find();
      if (configs && configs.length > 0) {
        rewardAmount = parseFloat(configs[0].referralAmount);
      }
    }

    // Create referral record
    const referral = this.referralModel.create({
      referrerId: referrer.id,
      refereeId: refereeId,
      referralCode: referralCode,
      status: "SUCCESSFUL",
      rewardAmount: rewardAmount,
      rewardCredited: true,
    });

    await this.referralModel.save(referral);

    // Instant 2-Way Reward: Credit ₹500 to BOTH Referrer AND Referee wallets!
    if (this.walletService) {
      try {
        // 1. Credit ₹500 to the New User (Referee)
        await this.walletService.addMoney(
          refereeId,
          rewardAmount,
          `WELCOME-REFERRAL-BONUS-${referralCode}`
        );

        // 2. Credit ₹500 to the Person who Referrer
        await this.walletService.addMoney(
          referrer.id,
          rewardAmount,
          `REFERRER-REWARD-BONUS-${referralCode}`
        );

        console.log(`🎁 Instant 2-Way ₹${rewardAmount} Bonus credited to BOTH Referrer (${referrer.id}) and Referee (${refereeId})`);
      } catch (err) {
        console.error("Failed to credit 2-way referral wallet bonus:", err.message);
      }
    }
  }

  /**
   * Credit ₹500 referral reward to referrer's wallet after referee's first successful booking
   */
  async creditReferralRewardOnFirstBooking(refereeId) {
    const referral = await this.referralModel.findOne({
      where: { refereeId, status: "PENDING", rewardCredited: false },
    });

    if (!referral) return;

    const rewardAmount = parseFloat(referral.rewardAmount);

    // 1. Credit reward to referrer's wallet
    if (this.walletService) {
      await this.walletService.addMoney(
        referral.referrerId,
        rewardAmount,
        `REF-REWARD-REFERRER-${referral.id}`
      );

      // 2. Credit reward to referee's wallet as well (2-way bonus)
      await this.walletService.addMoney(
        referral.refereeId,
        rewardAmount,
        `REF-REWARD-REFEREE-${referral.id}`
      );
    }

    // 3. Mark referral as SUCCESSFUL and rewardCredited = true
    referral.status = "SUCCESSFUL";
    referral.rewardCredited = true;
    await this.referralModel.save(referral);

    // 3. Send notification email to referrer
    const referrer = await this.userModel.findOne({ where: { id: referral.referrerId } });
    if (referrer && this.emailService) {
      try {
        await this.emailService.sendTemplateEmail(
          referrer.email,
          "Referral Reward Credited! 🎉",
          "welcome", // Or dedicated template
          {
            name: referrer.name,
            referralCode: referrer.referralCode,
          }
        );
      } catch (err) {
        console.error("Failed to send referral reward email notification:", err.message);
      }
    }
  }

  /**
   * Get Referral stats and referred users list for authenticated user
   */
  async getUserReferralStats(userId) {
    const user = await this.userModel.findOne({ where: { id: userId } });
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const referrals = await this.referralModel.find({
      where: { referrerId: userId },
      relations: { referee: true },
      order: { createdAt: "DESC" },
    });

    const totalReferrals = referrals.length;
    const successfulReferrals = referrals.filter((r) => r.status === "SUCCESSFUL");
    const totalEarnings = successfulReferrals.reduce((sum, r) => sum + parseFloat(r.rewardAmount), 0);

    const referredUsers = referrals.map((r) => ({
      referralId: r.id,
      refereeName: r.referee ? r.referee.name : "User",
      refereeEmail: r.referee ? r.referee.email : "",
      status: r.status,
      rewardAmount: parseFloat(r.rewardAmount),
      createdAt: r.createdAt,
    }));

    return {
      referralCode: user.referralCode,
      totalReferrals,
      successfulCount: successfulReferrals.length,
      pendingCount: totalReferrals - successfulReferrals.length,
      totalEarnings,
      referredUsers,
    };
  }

  /**
   * Admin API: View all referral records
   */
  async getAllReferrals() {
    const referrals = await this.referralModel.find({
      relations: { referrer: true, referee: true },
      order: { createdAt: "DESC" },
    });

    return referrals.map((r) => ({
      id: r.id,
      referrerName: r.referrer ? r.referrer.name : "N/A",
      referrerEmail: r.referrer ? r.referrer.email : "N/A",
      refereeName: r.referee ? r.referee.name : "N/A",
      refereeEmail: r.referee ? r.referee.email : "N/A",
      referralCode: r.referralCode,
      status: r.status,
      rewardAmount: parseFloat(r.rewardAmount),
      createdAt: r.createdAt,
    }));
  }
}

export default ReferralService;
