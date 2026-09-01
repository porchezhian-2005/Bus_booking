import Joi from "joi";

export const busIdParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    "string.guid": "Invalid Bus ID format. Bus ID must be a valid UUID.",
    "any.required": "Bus ID is required.",
  }),
});

export const updateBusSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().optional().messages({
    "string.empty": "Bus name cannot be empty.",
    "string.min": "Bus name must be at least 2 characters long.",
    "string.max": "Bus name cannot exceed 100 characters.",
  }),
  busNumber: Joi.string().min(2).max(50).trim().optional().messages({
    "string.empty": "Bus registration number cannot be empty.",
    "string.min": "Bus registration number must be at least 2 characters long.",
    "string.max": "Bus registration number cannot exceed 50 characters.",
  }),
  busType: Joi.string().min(2).max(50).trim().optional().messages({
    "string.empty": "Bus type cannot be empty.",
    "string.min": "Bus type must be at least 2 characters long.",
    "string.max": "Bus type cannot exceed 50 characters.",
  }),
  totalSeats: Joi.number().integer().min(1).max(100).optional().messages({
    "number.base": "Total seats capacity must be a positive number.",
    "number.min": "Total seats capacity must be a positive number.",
    "number.max": "Total seats capacity cannot exceed 100.",
  }),
  operatorName: Joi.string().min(2).max(100).trim().optional().messages({
    "string.empty": "Operator name cannot be empty.",
    "string.min": "Operator name must be at least 2 characters long.",
    "string.max": "Operator name cannot exceed 100 characters.",
  }),
  amenities: Joi.alternatives()
    .try(
      Joi.string().allow(""),
      Joi.array().items(Joi.string().trim()),
      Joi.allow(null)
    )
    .optional(),
})
  .min(1)
  .unknown(false)
  .messages({
    "object.min": "At least one field must be provided for update.",
    "object.unknown": "Field '{#label}' is not allowed in bus update request.",
  });

/**
 * Middleware to validate Bus Update Request (params + body)
 */
export const validateUpdateBus = (req, res, next) => {
  const paramResult = busIdParamSchema.validate(req.params);
  if (paramResult.error) {
    return res.status(400).json({
      success: false,
      message: paramResult.error.details[0].message,
    });
  }

  const bodyResult = updateBusSchema.validate(req.body);
  if (bodyResult.error) {
    return res.status(400).json({
      success: false,
      message: bodyResult.error.details[0].message,
    });
  }

  req.body = bodyResult.value;
  next();
};

export const busDecommissionBodySchema = Joi.object({
  action: Joi.string()
    .valid("AUTO", "REASSIGN", "DELAY", "CANCEL")
    .optional()
    .default("AUTO")
    .messages({
      "any.only": "Action must be one of AUTO, REASSIGN, DELAY, or CANCEL.",
    }),
  backupBusId: Joi.string().uuid().optional().messages({
    "string.guid": "Backup Bus ID must be a valid UUID.",
  }),
  newDepartureDate: Joi.string().trim().optional().messages({
    "string.empty": "New departure date cannot be empty.",
  }),
  newDepartureTime: Joi.string().trim().optional().messages({
    "string.empty": "New departure time cannot be empty.",
  }),
  reason: Joi.string().trim().optional().messages({
    "string.empty": "Decommissioning reason cannot be empty.",
  }),
}).unknown(false);

export const validateDecommissionBus = (req, res, next) => {
  const paramResult = busIdParamSchema.validate(req.params);
  if (paramResult.error) {
    return res.status(400).json({
      success: false,
      message: paramResult.error.details[0].message,
    });
  }

  const bodyResult = busDecommissionBodySchema.validate(req.body || {});
  if (bodyResult.error) {
    return res.status(400).json({
      success: false,
      message: bodyResult.error.details[0].message,
    });
  }

  req.body = bodyResult.value;
  next();
};

export const addBusSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required().messages({
    "string.empty": "Bus name is required.",
    "any.required": "Bus name is required.",
  }),
  busNumber: Joi.string().min(2).max(50).trim().required().messages({
    "string.empty": "Bus registration number is required.",
    "any.required": "Bus registration number is required.",
  }),
  busType: Joi.string().min(2).max(50).trim().required().messages({
    "string.empty": "Bus type is required.",
    "any.required": "Bus type is required.",
  }),
  totalSeats: Joi.number().integer().min(1).max(100).optional().default(30),
  operatorName: Joi.string().min(2).max(100).trim().optional().allow(""),
  amenities: Joi.alternatives()
    .try(
      Joi.string().allow(""),
      Joi.array().items(Joi.string().trim()),
      Joi.allow(null)
    )
    .optional(),
});

export const validateAddBus = (req, res, next) => {
  const result = addBusSchema.validate(req.body);
  if (result.error) {
    return res.status(400).json({
      success: false,
      message: result.error.details[0].message,
    });
  }
  req.body = result.value;
  next();
};

export const addRouteSchema = Joi.object({
  source: Joi.string().min(2).max(100).trim().required().messages({
    "string.empty": "Source city is required.",
    "any.required": "Source city is required.",
  }),
  destination: Joi.string().min(2).max(100).trim().required().messages({
    "string.empty": "Destination city is required.",
    "any.required": "Destination city is required.",
  }),
  distanceKm: Joi.number().positive().required().messages({
    "number.positive": "Distance in km must be a positive number.",
    "any.required": "Distance in km is required.",
  }),
  durationHours: Joi.number().positive().required().messages({
    "number.positive": "Duration in hours must be a positive number.",
    "any.required": "Duration in hours is required.",
  }),
  stops: Joi.array().items(Joi.string().trim()).optional().default([]),
});

export const validateAddRoute = (req, res, next) => {
  const result = addRouteSchema.validate(req.body);
  if (result.error) {
    return res.status(400).json({
      success: false,
      message: result.error.details[0].message,
    });
  }
  req.body = result.value;
  next();
};

export const createRoutePointSchema = Joi.object({
  locationName: Joi.string().min(2).max(150).trim().required().messages({
    "string.empty": "Location name is required.",
    "any.required": "Location name is required.",
  }),
  landmark: Joi.string().max(255).trim().optional().allow(""),
  pointType: Joi.string().valid("BOARDING", "DROPPING", "BOTH").required().messages({
    "any.only": "Point type must be BOARDING, DROPPING, or BOTH.",
    "any.required": "Point type is required.",
  }),
  sequenceOrder: Joi.number().integer().min(1).required().messages({
    "number.min": "Sequence order must be a positive integer starting from 1.",
    "any.required": "Sequence order is required.",
  }),
  timeOffsetMinutes: Joi.number().integer().min(0).optional().allow(null).messages({
    "number.min": "Time offset minutes cannot be negative.",
  }),
});

export const validateCreateRoutePoint = (req, res, next) => {
  const result = createRoutePointSchema.validate(req.body);
  if (result.error) {
    return res.status(400).json({
      success: false,
      message: result.error.details[0].message,
    });
  }
  req.body = result.value;
  next();
};

export const updateRoutePointSchema = Joi.object({
  locationName: Joi.string().min(2).max(150).trim().optional().messages({
    "string.empty": "Location name cannot be empty.",
  }),
  landmark: Joi.string().max(255).trim().optional().allow(""),
  pointType: Joi.string().valid("BOARDING", "DROPPING", "BOTH").optional().messages({
    "any.only": "Point type must be BOARDING, DROPPING, or BOTH.",
  }),
  sequenceOrder: Joi.number().integer().min(1).optional().messages({
    "number.min": "Sequence order must be a positive integer.",
  }),
  timeOffsetMinutes: Joi.number().integer().min(0).optional().allow(null),
  isActive: Joi.boolean().optional(),
}).min(1).unknown(false);

export const validateUpdateRoutePoint = (req, res, next) => {
  const result = updateRoutePointSchema.validate(req.body);
  if (result.error) {
    return res.status(400).json({
      success: false,
      message: result.error.details[0].message,
    });
  }
  req.body = result.value;
  next();
};

export default validateUpdateBus;
