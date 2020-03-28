import SignUp from '../api/SignUp';
// import Login from '../api/Login';
// import ForgotPassword from '../api/ForgotPassword';
// import ResetPassword from '../api/ResetPassword';
// import GetCurrentSession from '../api/GetCurrentSession';

export default class IndexController {

    constructor(router) {
        router.post('/api/v1/signup', SignUp.runAsExpress);
        // router.post('/api/v1/login', Login.runAsExpress);
        // router.get('/api/v1/currentSession', GetCurrentSession.runAsExpress);
        // router.post('/api/v1/forgotPassword', ForgotPassword.runAsExpress);
        // router.post('/api/v1/resetPassword', ResetPassword.runAsExpress);
    }
}
