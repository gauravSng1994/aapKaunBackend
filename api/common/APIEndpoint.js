const StatusCodes = require('./StatusCodes');
const ErrorClass = require('./ErrorClass');
const ResponseBuilder = require('./ResponseBuilder');
const Joi = require('@hapi/joi');
const extend = require('extend');

/**
 * Defines the master class for API Endpoint definition. Encapsulates all common functionality
 * */
class APIEndpoint {

    constructor(queryParams, body, headers, user, isAuthenticated, req, res) {
        // Define data
        this.data = extend(false, {}, req.params, queryParams, body);
        this.headers = headers;
        this.isAuthenticated = isAuthenticated;
        this.user = user;
        this.req = req;
        this.res = res;

        // add helper classes
        this.ResponseBuilder = ResponseBuilder;
        this.StatusCodes = StatusCodes;
        this.ErrorClass = ErrorClass;
        this.Joi = Joi;

        // get validations and security config
        this.securedEndpoint = !!this.isSecured;
        this.validationRules = this.validate;

        console.log('[API ENDPOINT] Is Validated:', this.securedEndpoint);
        console.log('[API ENDPOINT] Validation rules:', this.validationRules ? this.Joi.describe(this.validationRules) : 'No validation rules defined!');

        this.errors = [];

        // common props
        const {cryptKey, algorithm} = process.env;
        this.cryptKey = cryptKey;
        this.algorithm = algorithm;
    }

    async doValidate() {
        if (this.validationRules) {
            // run validations
            try {
                const res = await this.Joi.validate(this.data, this.validationRules, {
                    abortEarly: false,
                    allowUnknown: true
                });
                this.data = res;
            } catch (c) {
                this.errors.push(...(c.details.map(o => o.message)));
            }
            return !this.errors.length;
        } else {
            console.log('[API ENDPOINT] No validation rules applied. Ignoring!');
            return true;
        }
    }

    checkAuth() {
        if (this.headers && this.headers.referer && (this.headers.referer.search(/\/docs\/api/) > -1)) {
            console.log('Resolving expiry as default for env:', _appEnv);
            if (this.user && !this.user.expiry) this.user.expiry = +new Date() + 100000;
        }
        if (this.securedEndpoint) {
            this.session = null;
            if (this.user && this.isAuthenticated && this.user.expiry >= +new Date()) {
                this.session = this.user;
                return true;
            } else return false;
        } else {
            console.log('[API ENDPOINT] Not secured. Ignoring!');
            return true;
        }
    }

    async run() {
        // auth check
        if (!this.checkAuth()) {
            return new this.ResponseBuilder(
                'Unauthorised', 1, {}, 'Invalid or missing auth token', this.ErrorClass.AUTH_FAILURE, this.StatusCodes.AUTH_FAILURE
            ).toObject();
        }

        if (!(await this.doValidate())) {
            // validation failure
            return new this.ResponseBuilder(
                'Bad Request', 1, {}, this.errors.join(', '), this.ErrorClass.VALIDATION_FAILED, this.StatusCodes.BAD_REQUEST
            ).toObject();
        }

        // run handler
        try {
            const response = await this.controller();
            if (response instanceof this.ResponseBuilder) {
                return response.toObject();
            } else throw new Error('Response builder response is required from API controller.');
        } catch (error) {
            console.log(error);
            return new this.ResponseBuilder(
                'Server Error', 1, {}, error.message, this.ErrorClass.SERVER_ERROR, this.StatusCodes.SERVER_ERROR
            ).toObject();
        }
    }

    static get handler() {
        const self = this;
        return async (event, ctx) => {
            let body = event.body;
            try {
                body = JSON.parse(body);
            } catch (c) {
                // already parsed body, or no body.
                body = body || {};
            }
            const agent = new self(event.queryStringParameters, body, event.headers || {}, event.user, event.isAuthenticated, event.req, event.res);
            let {description, code, response, errorDescription, errorClass, statusCode} = await agent.run();
            response.description = description;
            response.code = code;
            response.errorDescription = errorDescription;
            response.errorClass = errorClass;
            // console.log('Final Response', response);
            return {
                statusCode: statusCode || code || 200,
                headers: {
                    "Content-Type": "application/json",
                    'Access-Control-Allow-Origin': '*'
                },
                body: response
            };
        }
    }

    static get runAsExpress() {
        const self = this;
        return (req, res) => {
            const event = {
                body: req.body,
                headers: req.headers,
                user: req.user,
                isAuthenticated: req.isAuthenticated,
                queryStringParameters: req.query,
                req,
                res
            };
            self.handler(event, {}).then(resp => {
                res.status(resp.statusCode);
                res.json(resp.body);
            });
        };
    }


}

exports = module.exports = APIEndpoint;
