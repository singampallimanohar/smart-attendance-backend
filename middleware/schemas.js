const Joi = require("joi");

const schemas = {
    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required()
    }),
    
    registerStudent: Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        phone: Joi.string().required(),
        department: Joi.string().required()
    })
};

module.exports = schemas;
