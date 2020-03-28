/**
 * Defines The Status Codes
 * Non mutable getters
 * */
class ErrorClass {

    static get VALIDATION_FAILED() {
        return 'validation_failed';
    }

    static get SERVER_ERROR() {
        return 'server_error';
    }

    static get AUTH_FAILURE() {
        return 'auth_failed';
    }

    static get NOT_FOUND() {
        return 'not_found';
    }

    static get BAD_REQUEST() {
        return 'bad_request';
    }
}

exports = module.exports = ErrorClass;
