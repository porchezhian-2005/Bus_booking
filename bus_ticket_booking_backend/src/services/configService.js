export class ConfigService {
  constructor(configModel) {
    this.configModel = configModel;
  }

  async getConfig() {
    let configs = await this.configModel.find();
    let config;

    if (!configs || configs.length === 0) {
      const defaultWalletPercent = parseFloat(process.env.DEFAULT_MAX_WALLET_USAGE_PERCENT || "20");
      const defaultReferralAmount = parseFloat(process.env.DEFAULT_REFERRAL_REWARD_AMOUNT || "500");

      const newConfig = this.configModel.create({
        walletMaxUsagePercent: defaultWalletPercent,
        referralAmount: defaultReferralAmount,
      });
      config = await this.configModel.save(newConfig);
    } else {
      config = configs[0];
    }

    return {
      id: config.id,
      walletMaxUsagePercent: parseFloat(config.walletMaxUsagePercent),
      referralAmount: parseFloat(config.referralAmount),
      updatedAt: config.updatedAt,
    };
  }

  async updateConfig(updateData) {
    let config = await this.getConfig();
    const allowedKeys = ["walletMaxUsagePercent", "referralAmount"];
    let updated = false;

    Object.keys(updateData).forEach((key) => {
      if (allowedKeys.includes(key) && updateData[key] !== undefined) {
        config[key] = parseFloat(updateData[key]);
        updated = true;
      }
    });

    if (updated) {
      const dbConfig = await this.configModel.findOne({ where: { id: config.id } });
      if (dbConfig) {
        dbConfig.walletMaxUsagePercent = config.walletMaxUsagePercent;
        dbConfig.referralAmount = config.referralAmount;
        await this.configModel.save(dbConfig);
      }
    }

    return await this.getConfig();
  }
}

export default ConfigService;
