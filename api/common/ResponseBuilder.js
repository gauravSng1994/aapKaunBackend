/**
 * Builds Response
 * */
class ResponseBuilder {

    constructor(description, code, response, errorDescription, errorClass, statusCode) {
        this.description = description;
        this.code = code;
        this.response = response;
        this.errorDescription = errorDescription;
        this.errorClass = errorClass;
        this.statusCode = statusCode;
        this.obj = {description, code, response, errorDescription, errorClass, statusCode}
    }

    toObject() {
        console.log('[Response Builder]', this.obj);
        return this.obj;
    }
}

exports = module.exports = ResponseBuilder;
