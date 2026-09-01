import Joi from "joi";

export const tripIdParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    "string.guid": "Invalid Trip ID format. Trip ID must be a valid UUID.",
    "any.required": "Trip ID is required.",
  }),
});

export const updateTripSchema = Joi.object({
  busId: Joi.string().uuid().optional().messages({
    "string.guid": "Bus ID must be a valid UUID.",
  }),
  routeId: Joi.string().uuid().optional().messages({
    "string.guid": "Route ID must be a valid UUID.",
  }),
  departureDate: Joi.string().trim().optional().messages({
    "string.empty": "Departure date cannot be empty.",
  }),
  departureTime: Joi.string().trim().optional().messages({
    "string.empty": "Departure time cannot be empty.",
  }),
  arrivalTime: Joi.string().trim().optional().messages({
    "string.empty": "Arrival time cannot be empty.",
  }),
  basePrice: Joi.number().positive().optional().messages({
    "number.base": "Base ticket price must be a number.",
    "number.positive": "Base ticket price must be a positive number.",
  }),
  status: Joi.string()
    .valid("SCHEDULED", "COMPLETED", "CANCELLED")
    .optional()
    .messages({
      "any.only": "Trip status must be SCHEDULED, COMPLETED, or CANCELLED.",
    }),
})
  .min(1)
  .unknown(false)
  .messages({
    "object.min": "At least one field must be provided for trip update.",
    "object.unknown": "Field '{#label}' is not allowed in trip update request.",
  });

/**
 * Middleware to validate Trip Update Request (params + body)
 */
export const validateUpdateTrip = (req, res, next) => {
  const paramResult = tripIdParamSchema.validate(req.params);
  if (paramResult.error) {
    return res.status(400).json({
      success: false,
      message: paramResult.error.details[0].message,
    });
  }

  const bodyResult = updateTripSchema.validate(req.body);
  if (bodyResult.error) {
    return res.status(400).json({
      success: false,
      message: bodyResult.error.details[0].message,
    });
  }

  req.body = bodyResult.value;
  next();
};

export const createTripSchema = Joi.object({
  busId: Joi.string().uuid().required().messages({
    "string.guid": "Bus ID must be a valid UUID.",
    "any.required": "Bus ID is required.",
  }),
  routeId: Joi.string().uuid().required().messages({
    "string.guid": "Route ID must be a valid UUID.",
    "any.required": "Route ID is required.",
  }),
  departureDate: Joi.string().trim().required().messages({
    "string.empty": "Departure date is required.",
    "any.required": "Departure date is required.",
  }),
  departureTime: Joi.string().trim().required().messages({
    "string.empty": "Departure time is required.",
    "any.required": "Departure time is required.",
  }),
  arrivalTime: Joi.string().trim().required().messages({
    "string.empty": "Arrival time is required.",
    "any.required": "Arrival time is required.",
  }),
  basePrice: Joi.number().positive().required().messages({
    "number.positive": "Base price must be a positive number.",
    "any.required": "Base price is required.",
  }),
});

export const validateCreateTrip = (req, res, next) => {
  const bodyResult = createTripSchema.validate(req.body);
  if (bodyResult.error) {
    return res.status(400).json({
      success: false,
      message: bodyResult.error.details[0].message,
    });
  }

  req.body = bodyResult.value;
  next();
};

export default validateUpdateTrip;
