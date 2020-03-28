//importing node_modules
import {series, mapSeries} from 'async';
import express from 'express';
import logger from 'morgan';
import bodyParser from 'body-parser';
import {join} from 'path';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import http from 'http';


//importing custom modules
import ConfigManager from './bootloader/ConfigManager/ConfigManager';

class Main {

    constructor(callback) {
        this.appBaseDir = __dirname;
        this.appEnv = process.env.NODE_ENV || 'development';
        series([
            this.initializeExpressApp.bind(this),
            this.initializeConfig.bind(this),
            this.initializeLogger.bind(this),
            this.initialiseExportedVars.bind(this),
            this.initializeModels.bind(this),
            this.loadServices.bind(this),
            this.initialiseSecurity.bind(this),
            this.initPreRoutes.bind(this),
            this.initialiseRoutes.bind(this),
            this.bootstrapApp.bind(this),
            this.initEventHooks.bind(this),
            this.initJobSchedulers.bind(this),
            this.startServer.bind(this),
            this.sendOnlineEvent.bind(this)
        ], callback);

    }

    // Pre initialize the express app
    initializeExpressApp(callback) {
        this.app = express();
        // view engine setup
        this.app.set('views', join(this.appBaseDir, 'views'));
        this.app.set('view engine', 'ejs');
        // uncomment after placing your favicon in /public
        // this.app.use(favicon(path.join(__dirname, 'prestine-public', 'favicon.ico')));
        this.app.use(logger('dev'));
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: false}));
        this.app.use(cookieParser());
        this.app.use(express.static(join(this.appBaseDir, 'prestine-public'))); // for fixed assets

        // TODO implement parseMultiTenantBasic
        // redirect or keep for tenent pages
        // this.app.use('/', this.parseMultiTenantBasic.bind(this));

        this.app.use(express.static(join(this.appBaseDir, 'public'))); // for dynamic built assets
        // FOR NUXT APP - Proper Way to serve. Fixes dynamic urls.
        this.app.use('/', (req, res, next) => {
            let filePath = join(__dirname, 'public', req.url);
            console.log('----req url ==', req.url);
            let tokens = req.url.split('/');
            let indexPath = null;
            if (tokens.length > 2) {
                tokens.pop();
                tokens.push(tokens[tokens.length - 1]);
                indexPath = join(__dirname, 'public', tokens.join('/'), 'index.html');
            }
            fs.access(filePath, fs.constants.F_OK, (err) => {
                if (err) {
                    if (indexPath) {
                        fs.access(indexPath, fs.constants.F_OK, (err) => {
                            if (err) next();
                            else fs.createReadStream(indexPath).pipe(res);
                        });
                    } else next();
                } else fs.createReadStream(filePath).pipe(res);
            });
        });
        this.app.use(function (req, res, next) {
            const url = req.headers.origin || req.headers.referer;
            res.header("Access-Control-Allow-Origin", url);
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-xsrf-token");
            res.header("Access-Control-Request-Method", "GET, POST, PATCH, PUT, DELETE, OPTION");
            res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTION");
            res.header("Access-Control-Allow-Credentials", "true");
            next();
        });

        callback();
    }



    // Initialize config
    initializeConfig(callback) {
        let self = this;
        new ConfigManager({appBaseDir: this.appBaseDir, env: this.appEnv}, function (_config) {
            self.config = _config;
            callback();
        });
    }

    //Initialize Logger
    initializeLogger(callback) {
        let logOnStdOut = this.config.logger.stdout.enabled,
            self = this;
        this.addSafeReadOnlyGlobal('log', new Logger(function (message) {
            if (logOnStdOut) {
                //Print on console the fully formatted message
                console.log(message.fullyFormattedMessage);
            }
        }, self.config.logger, self.appBaseDir));
        callback();
    }


    initializeModels(callback) {
        let list = fs.readdirSync(join(this.appBaseDir, 'models', 'mongo')),
            db = {};
        mapSeries(list, (item, callback) => {
            if (item.search(/.js$/) !== -1) {
                let name = item.toString().replace(/\.js$/, '');
                console.log('[FRAMEWORK]'.bold.yellow, `Loading Model: '${name.bold}'`.magenta);
                (require(join(this.appBaseDir, 'models', 'mongo', item)).default).initialize(this.config.mongoUrl, (err, model) => {
                    if (err) return callback(err);
                    db[name] = model;
                    callback();
                });
            } else {
                callback();
            }
        }, err => {
            if (err) return callback(err);
            this.addSafeReadOnlyGlobal('_db', db);
            callback();
        });
    }

    //setting read only global variables
    addSafeReadOnlyGlobal(prop,val){
        Object.defineProperty(global, prop, {
            get: function(){
                return val;
            },
            set: function(){
                log.warn('You are trying to set the READONLY GLOBAL variable `', prop, '`. This is not permitted. Ignored!')
            }
        });
    }

    // Init Schedulers
    // initJobSchedulers(callback) {
    //     let list = fs.readdirSync(join(this.appBaseDir, 'jobs'));
    //     const agenda = new Agenda({
    //         db: {address: this.config.mongoUrl},
    //         defaultConcurrency: 1,
    //         defaultLockLifetime: 10000
    //     });
    //     agenda.on('ready', () => {
    //         mapSeries(list, (item, callback) => {
    //             if (item.search(/.js$/) !== -1) {
    //                 let name = item.toString().replace(/\.js$/, '');
    //                 const job = require(join(this.appBaseDir, 'jobs', item.toString())).default;
    //                 console.log('[FRAMEWORK]'.bold.yellow, `Loading Job: '${name.bold}'`.magenta, `=> Every: ${job.trigger.bold}`.blue);
    //                 agenda.define(name, job.task.bind(job));
    //                 agenda.every(job.trigger, name);
    //             }
    //             callback();
    //         }, err => {
    //             if (err) return callback(err);
    //             agenda.start();
    //             this.addSafeReadOnlyGlobal('_agenda', agenda);
    //             callback();
    //         });
    //     });
    //     agenda.on('error', err => callback(new Error(err)));
    // }


    // Handle MultiTenancy beforehand
    // parseMultiTenantBasic(req, res, next) {
    //     console.log('Multi..............', req.headers);
    //     let origin = req.get('origin');
    //     let host = req.get('host');
    //     let uri = req.uri;
    //     let url = req.url;
    //     let isTenantRequest = false;
    //     let sld, tld;
    //     let domainOfInterest = origin || host;
    //     let urlOfInterest = url || uri;
    //     console.log({domainOfInterest, urlOfInterest, isTenantRequest});
    //     if (!domainOfInterest || !urlOfInterest) {
    //         isTenantRequest = false;
    //     } else {
    //         domainOfInterest = domainOfInterest.trim().replace(/^https?:\/\//i, '');
    //         domainOfInterest = domainOfInterest.split('/').shift();
    //         if (domainOfInterest.search(/(localhost:\d\d\d\d)|(aapkaun\.com)/) > -1) {
    //             // sld or admin call
    //             if (domainOfInterest.split('.').length > 2) {
    //                 sld = domainOfInterest.split('.');
    //                 sld.pop();
    //                 sld.pop(); // twice to remove <domain>.com
    //                 sld = sld.join('.'); // keep all trailing dots in subdomain
    //                 if (sld === 'www') isTenantRequest = false;
    //                 else if (sld) {
    //                     isTenantRequest = true;
    //                     tld = null;
    //                 } else isTenantRequest = false;
    //             } else isTenantRequest = false;
    //         } else {
    //             // tld call
    //             isTenantRequest = true;
    //             sld = null;
    //             tld = domainOfInterest;
    //         }
    //     }
    //     // redirect home for client SSP
    //     if (isTenantRequest && urlOfInterest === '/') return res.redirect('/ssp');
    //     // build tenant data
    //     req.isTenantRequest = isTenantRequest;
    //     if (req.isTenantRequest) {
    //         req.tenant = {
    //             domain: domainOfInterest,
    //             url: urlOfInterest,
    //             sld: sld,
    //             tld: tld,
    //             isSldMatch: !!sld,
    //             isTldMatch: !!tld
    //         };
    //         console.log('Tenant:', req.tenant);
    //     }
    //     if (this.appEnv === 'development' && urlOfInterest.startsWith('/ssp')) {
    //         // special
    //         console.log('TODO -- REMOVE ON PROD, FOR TESTING PURPOSES ONLY!');
    //         req.isTenantRequest = true;
    //         req.tenant = {
    //             domain: 'codalien.fininga.com',
    //             url: urlOfInterest,
    //             sld: 'codalien',
    //             tld: null,
    //             isSldMatch: true,
    //             isTldMatch: false
    //         };
    //     }
    //     next();
    // }

}

// Time load process
console.log('[FRAMEWORK]'.bold.yellow, `Loaded main module! Took ${((+new Date() - __timers.main) / 1000).toString().bold} seconds.`.green);

// Export now
export default Main;
