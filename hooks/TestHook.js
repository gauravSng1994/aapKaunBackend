/**
 * Sample Hook for testing event hooks.
 *
 * Can invoke by _triggerAppEvent("Test", <data>...)
 * */

export default class TestHook {

    static onEvent(...message) {
        log.info('Event Triggered', this.name, ':', ...message);
    }

}
