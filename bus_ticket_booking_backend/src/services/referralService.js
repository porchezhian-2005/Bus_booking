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
   * Note: Status is created as PENDING. Reward is NOT credited until referee's first successful booking.
   */
  async processReferralSignup(refereeId, referralCode) {
    if (!referralCode) return;

    const referrer = await this.userModel.findOne({ where: { referralCode } });
    if (!referrer) return;

    // Prevent user from referring themselves
    if (referrer.id === refereeId) return;

    // Check if referral record already exists for this referee
    const existingReferral = await this.referralModel.findOne({ where: { refereeId } });
    if (existingReferral) return;

    // Get configured referral reward amount (default ₹500)
    let rewardAmount = 500.00;
    if (this.configModel) {
      const configs = await this.configModel.find();
      if (configs && configs.length > 0) {
        rewardAmount = parseFloat(configs[0].referralAmount);
      }
    }

    // Create referral record in PENDING state (NO instant wallet credit)
    const referral = this.referralModel.create({
      referrerId: referrer.id,
      refereeId: refereeId,
      referralCode: referralCode,
      status: "PENDING",
      rewardAmount: rewardAmount,
      rewardCredited: false,
    });

    await this.referralModel.save(referral);
    console.log(`📌 Referral record created in PENDING state for referee ${refereeId} (Referrer: ${referrer.id})`);
  }

  /**
   * Credit referral reward to referrer and referee wallets after referee's first successful booking
   */
  async creditReferralRewardOnFirstBooking(refereeId, transactionalManager = null) {
    const refRepo = transactionalManager ? transactionalManager.getRepository(this.referralModel.target || "Referral") : this.referralModel;

    const referral = await refRepo.findOne({
      where: { refereeId, status: "PENDING", rewardCredited: false },
    });

    if (!referral) return;

    // Fetch configured reward amount
    let rewardAmount = parseFloat(referral.rewardAmount) || 500.00;
    if (this.configModel) {
      const configRepo = transactionalManager ? transactionalManager.getRepository(this.configModel.target || "SystemConfig") : this.configModel;
      const configs = await configRepo.find();
      if (configs && configs.length > 0) {
        rewardAmount = parseFloat(configs[0].referralAmount);
      }
    }

    // 1. Credit reward ONLY to referrer's wallet (per requirement: REFERRER only)
    if (this.walletService) {
      await this.walletService.addMoney(
        referral.referrerId,
        rewardAmount,
        `REF-REWARD-REFERRER-${referral.id}`,
        transactionalManager,
        "REFERRAL_REWARD",
        `Added ₹${rewardAmount.toFixed(0)} to wallet for Referral Reward`
      );
    }

    // 2. Mark referral as SUCCESSFUL and rewardCredited = true
    referral.status = "SUCCESSFUL";
    referral.rewardCredited = true;
    referral.rewardAmount = rewardAmount;
    await refRepo.save(referral);

    console.log(`🎁 Referral reward of ₹${rewardAmount} successfully credited ONLY to Referrer (${referral.referrerId}) on referee's 1st booking`);


    // 4. Send notification email to referrer
    const userRepo = transactionalManager ? transactionalManager.getRepository(this.userModel.target || "User") : this.userModel;
    const referrer = await userRepo.findOne({ where: { id: referral.referrerId } });
    if (referrer && this.emailService) {
      try {
        await this.emailService.sendTemplateEmail(
          referrer.email,
          "Referral Reward Credited! 🎉",
          "welcome",
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
