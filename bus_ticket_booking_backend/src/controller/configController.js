import AppDataSource from "../config/database.js";
import SystemConfigEntity from "../models/SystemConfig.js";
import ConfigService from "../services/configService.js";

const configRepository = AppDataSource.getRepository(SystemConfigEntity);
const configService = new ConfigService(configRepository);

export const getSystemConfig = async (req, res) => {
  try {
    const config = await configService.getConfig();
    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch system configuration",
    });
  }
};

export const updateSystemConfig = async (req, res) => {
  try {
    const updatedConfig = await configService.updateConfig(req.body);
    return res.status(200).json({
      success: true,
      message: "System configuration updated successfully",
      data: updatedConfig,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update system configuration",
    });
  }
};
