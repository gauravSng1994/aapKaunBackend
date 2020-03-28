/**
 * Defines The Status Codes
 * Non mutable getters
 * */
class StatusCodes {

    static get SUCCESS_READ() {
        return 200;
    }

    static get SUCCESS_WRITE() {
        return 201;
    }

    static get BAD_REQUEST() {
        return 400;
    }

    static get AUTH_FAILURE() {
        return 403;
    }

    static get NOT_FOUND() {
        return 404;
    }

    static get SERVER_ERROR() {
        return 500;
    }
}

exports = module.exports = StatusCodes;
