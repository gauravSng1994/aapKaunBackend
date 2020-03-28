export default class TestJob {
    static get trigger() {
        return "3 hours";
    }

    static task(err, done) {
        let reminders;
        log.trace("triggering......", this.name);
        done();
    }
}
