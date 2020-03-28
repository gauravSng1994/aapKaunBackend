const APIEndpoint = require('./common/APIEndpoint');

/**
 *  This endpoint is responsible to grant the auth token
 * */
class SignUp extends APIEndpoint {

    get isSecured() {
        return false;
    }

    get validate() {
        return this.Joi.object().keys({
            email: this.Joi.string().email().required(),
            password: this.Joi.string().min(6).max(16).required(),
            firstName: this.Joi.string().min(3).max(20).required(),
            company: this.Joi.string().min(3).required(),
            lastName: this.Joi.string().min(3).max(20).required()
        });
    }

    async controller() {
        // pluck data
        let {email, password, firstName, lastName, company} = this.data;
        let user = await services.UserService.getUserByEmail(email);
        if (!user) {
            user = services.UserService.createUser();
        } else {
            return new this.ResponseBuilder(
                "User Already Exists", 1, {}, "User Already Exists", this.ErrorClass.VALIDATION_FAILED, this.StatusCodes.BAD_REQUEST
            );
        }
        user.name.first = firstName;
        user.name.last = lastName;
        user.emails.push({
            email: email,
            isVerified: false,
            isPrimary: true
        });
        // const companyObj = await services.CompanyService.createCompany(company);
        // user.companies.push({
        //     company: companyObj._id,
        //     role: 'Admin'
        // });
        await user.setPassword(password);
        await user.save();
        const expiry = +new Date(+new Date() + 36000000)
        const token = this.req.genToken({
            _id: user._id,
            name: user.name,
            // companyId: companyObj._id,
            expiry: expiry
        });
        return new this.ResponseBuilder(
            "Sign Up", 0, {
                token,
                expiry: expiry,
                token_type: 'bearer'
            }, undefined, undefined, this.StatusCodes.SUCCESS_READ
        );

    }

}

exports = module.exports = SignUp;
