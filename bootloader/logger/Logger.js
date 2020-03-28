class Logger {
    constructor(consumer, config, appBaseDir) {
        var util = require('util');
        var logLevel = (function getLevel(level) {
            switch (level.toUpperCase()) {
                case 'ERROR':
                    return 0;
                case 'WARN':
                    return 1;
                case 'INFO':
                    return 2;
                case 'DEBUG':
                    return 3;
                case 'TRACE':
                    return 4;
                default:
                    return 0;
            }
        })(config.level);
        var fullFormat = config.fullFormat;
        var minimalFormat = config.minimalFormat;
        var showHidden = config.showHidden;
        this.error = function (message) {
            if (logLevel < 0) return;
            var func = __function;
            var line = __line;
            if (arguments.length > 1) message = combineMessageArgs(arguments);
            else if (message instanceof Error) message = message.message + '\n' + message.stack;
            consumer(getFormattedString(__fileName, 'ERROR', timestampString(), message, 'red', func, line), 'error');
        };
        this.warn = function (message) {
            if (logLevel < 1) return;
            var func = __function;
            var line = __line;
            if (arguments.length > 1) message = combineMessageArgs(arguments);
            else if (message instanceof Error) message = message.message + '\n' + message.stack;
            consumer(getFormattedString(__fileName, 'WARN', timestampString(), message, 'red', func, line), 'warn');
        };
        this.info = function (message) {
            if (logLevel < 2) return;
            var func = __function;
            var line = __line;
            if (arguments.length > 1) message = combineMessageArgs(arguments);
            consumer(getFormattedString(__fileName, 'INFO', timestampString(), message, 'blue', func, line), 'info');
        };
        this.debug = function (message) {
            if (logLevel < 3) return;
            var func = __function;
            var line = __line;
            if (arguments.length > 1) message = combineMessageArgs(arguments);
            consumer(getFormattedString(__fileName, 'DEBUG', timestampString(), message, 'green', func, line), 'debug');
        };
        this.trace = function (message) {
            if (logLevel < 4) return;
            var func = __function;
            var line = __line;
            if (arguments.length > 1) message = combineMessageArgs(arguments);
            consumer(getFormattedString(__fileName, 'TRACE', timestampString(), message, 'yellow', func, line), 'trace');
        };
        function getFormattedString(file, level, time, message, color, func, line) {
            message = message || 'undefined';
            if (typeof(message) !== 'string') {
                message = util.inspect(message, {showHidden: showHidden, depth: null});
            }
            file = file.magenta.italic.bold;
            line = line.toString().magenta.italic.bold;
            level = level.bold[color];
            time = time.italic.green.bold;
            message = message[color].bold;
            var name = config.appNameToDisplayInLog.bold.yellow;
            var pid = process.pid.toString().bold.yellow;
            return {
                fullyFormattedMessage: fullFormat.replace(/%level/g, level).replace(/%file/g, file).replace(/%time/g, time).replace(/%message/g, message).replace(/%func/g, func).replace(/%line/g, line).replace(/%pid/g, pid).replace(/%name/g, name),
                minimallyFormattedMessage: minimalFormat.replace(/%level/g, level).replace(/%file/g, file).replace(/%time/g, time).replace(/%message/g, message).replace(/%func/g, func).replace(/%line/g, line).replace(/%pid/g, pid).replace(/%name/g, name)
            };
        }

        function timestampString() {
            var date = new Date();
            return date.toGMTString() + ' ' + (+date);
        }

        function combineMessageArgs(args) {
            var message = ' ';
            for (var idx in args) {
                if (args.hasOwnProperty(idx)) {
                    if (args[idx] instanceof Error) {
                        message += (args[idx].message + '\n' + args[idx].stack);
                    } else if (typeof(args[idx]) !== 'string') {
                        message += (util.inspect(args[idx], {showHidden: showHidden, depth: null}) + ' ');
                    } else {
                        message += (args[idx] + ' ');
                    }
                }
            }
            return message;
        }

        Object.defineProperty(global, '__stack', {
            get: function callee() {
                var orig = Error.prepareStackTrace;
                Error.prepareStackTrace = function (_, stack) {
                    return stack;
                };
                var err = new Error();
                Error.captureStackTrace(err, callee);
                var stack = err.stack;
                Error.prepareStackTrace = orig;
                return stack;
            }
        });

        Object.defineProperty(global, '__line', {
            get: function () {
                return __stack[2].getLineNumber();
            }
        });

        Object.defineProperty(global, '__function', {
            get: function () {
                return __stack[1].getFunctionName();
            }
        });

        Object.defineProperty(global, '__fileName', {
            get: function () {
                return __stack[2].getFileName().replace(appBaseDir, '');
            }
        });
    }
}

export default Logger;
