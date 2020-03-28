//importing node_modules
import {series, mapSeries} from 'async';
import express from 'express';
import logger from 'morgan';
import bodyParser from 'body-parser';
import {join} from 'path';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import http from 'http';
import {EventEmitter} from 'events';


//importing custom modules
import ConfigManager from './bootloader/configManager/ConfigManager';
import Logger from './bootloader/logger/Logger';
import StatelessMiddleware from './bootloader/security/StatelessMiddleware';

class Main {

    constructor(callback) {
        this.appBaseDir = __dirname;
        this.appEnv = process.env.NODE_ENV || 'development';
        this.frameworkEvents = new EventEmitter();
        this.addSafeReadOnlyGlobal('_frameworkEvents', this.frameworkEvents);

        // Notify of env
        console.log('[FRAMEWORK]'.bold.yellow, `Initialising Class '${this.constructor.name.bold}' using environment '${this.appEnv.bold}'.`.green);

        // Run bootloader tasks
        series([
            this.initializeExpressApp.bind(this),
            this.initializeConfig.bind(this),
            this.initializeLogger.bind(this),
            this.initialiseExportedVars.bind(this),
            this.initializeModels.bind(this),
            this.loadServices.bind(this),
            this.initialiseSecurity.bind(this),
            // this.initPreRoutes.bind(this),
            this.initialiseRoutes.bind(this),
            // this.bootstrapApp.bind(this),
            this.initEventHooks.bind(this),
            // this.initJobSchedulers.bind(this),
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

    // Start server
    startServer(callback) {
        // catch 404 and forward to error handler
        this.app.use(function (req, res, next) {
            let err = new Error('Not Found');
            err.status = 404;
            next(err);
        });

        // error handler
        this.app.use(function (err, req, res, next) {
            // set locals, only providing error in development
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};
            // render the error page
            res.status(err.status || 500);
            res.render('error');
        });
        let server = http.createServer(this.app);
        server.listen(this.config.port);
        server.on('listening', () => {
            let addr = server.address();
            let bind = typeof addr === 'string'
                ? 'pipe ' + addr
                : 'port ' + addr.port;
            log.debug('Listening on ' + bind);
            this.frameworkEvents.emit('SERVER_STARTED');
        });
        callback();
    }

    // Initialize exports
    initialiseExportedVars(callback) {
        this.addSafeReadOnlyGlobal('_config', this.config);
        this.addSafeReadOnlyGlobal('_appEnv', this.appEnv);
        //Add noop function in global context
        this.addSafeReadOnlyGlobal('noop', function () {
            log.info('Noop Executed with params:', arguments);
        });
        //set the base dir of project in global, This is done to maintain the correct base in case of forked processes.
        this.addSafeReadOnlyGlobal('_appBaseDir', this.appBaseDir);
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

    //Initialize logger
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

    //Load Service
    loadServices(callback) {
        //Inject all Singleton Services
        let services = {};
        try {
            let list = fs.readdirSync(join(this.appBaseDir, 'services'));
            list.forEach(item => {
                if (item.search(/.js$/) !== -1) {
                    let name = item.toString().replace(/\.js$/, '');
                    console.log('[FRAMEWORK]'.bold.yellow, `Loading Service: '${name.bold}'`.magenta);
                    services[name] = new (require(join(this.appBaseDir, 'services', name)).default);
                }
            });
            this.addSafeReadOnlyGlobal('services', services);
            callback();
        } catch (err) {
            callback(err);
        }
    }

    initialiseSecurity(callback) {
        // For Admin and API
        new StatelessMiddleware(
            this.app,
            '_aapkaunadminssk',
            this.config.session.generatorAlgo,
            this.config.session.generatorSecret,
            ''
        );
        // For SSP
        new StatelessMiddleware(
            this.app,
            '_aapkaunsspssk',
            this.config.session.generatorAlgo,
            this.config.session.generatorSecret,
            'SSP'
        );
        callback();
    }

    // Init routes
    initialiseRoutes(callback) {
        let router = express.Router();
        try {
            let list = fs.readdirSync(join(this.appBaseDir, 'controllers'));
            list.forEach(item => {
                if (item.search(/.js$/) !== -1) {
                    let name = item.toString().replace(/\.js$/, '');
                    console.log('[FRAMEWORK]'.bold.yellow, `Loading Controller Module: '${name.bold}'`.magenta);
                    new (require(join(this.appBaseDir, 'controllers', item)).default)(router);
                }
            });
            this.app.use('/', router);
            callback();
        } catch (err) {
            callback(err);
        }
    }

    // initPreRoutes(callback) {
    //     this.app.use('/ssp', TenantParserMiddleware.handle);
    //     this.app.use('/vault-connector', elFinder([
    //         {
    //             driver: elFinder.LocalFileStorage,
    //             URL: "/vault-files/",       //Required
    //             path: join(__dirname, 'vault_root'),   //Required
    //             permissions: {read: 1, write: 1, lock: 0}
    //         }
    //     ]));
    //     callback();
    // }

    // Execute Bootstrap
    // bootstrapApp(callback) {
    //     new Bootstrap(callback, this);
    // }


    // TODO initialise schedulers when Jobs are required

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

    // Init Event Hooks
    initEventHooks(callback) {
        let list = fs.readdirSync(join(this.appBaseDir, 'hooks'));
        const emitter = new EventEmitter();
        const hooks = {};
        mapSeries(list, (item, callback) => {
            if (item.search(/Hook.js$/) !== -1) {
                let name = item.toString().replace(/Hook\.js$/, '');
                const hook = require(join(this.appBaseDir, 'hooks', item.toString())).default;
                console.log('[FRAMEWORK]'.bold.yellow, `Loading Hook: '${name.bold}'`.magenta);
                hooks[name] = hook;
                emitter.on(name, (...args) => hook.onEvent(...args));
            }
            callback();
        }, err => {
            if (err) return callback(err);
            this.addSafeReadOnlyGlobal('_appEvent', {
                emit: (name, ...args) => {
                    if (hooks[name]) emitter.emit(name, ...args);
                    else log.error('No Event hook with name:', name);
                }
            });
            callback();
        });
    }


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

    //TODO understand sendOnlineEvent

    sendOnlineEvent(callback) {
        if (process.send) {
            process.send({
                type: "server-running",
                pid: process.pid,
                env: this.appEnv,
                port: _config.port,
                url: _config.serverUrl,
                file: process.argv[1],
                node: process.argv[0],
                workerId: 'xxxxx-xxxxxx'.replace(/x/g, a => (~~(Math.random() * 16)).toString(16))
            });
        }
    }


}

// Time load process
console.log('[FRAMEWORK]'.bold.yellow, `Loaded main module! Took ${((+new Date() - __timers.main) / 1000).toString().bold} seconds.`.green);

// Export now
export default Main;
