'use strict';

/**
 * Shiplet — programmatic API
 * Allows other tools to use Shiplet's functionality without the CLI layer.
 */

const helpers = require('./utils/helpers');
const templates = require('./templates');

const commands = {
    init: require('./commands/init'),
    up: require('./commands/up'),
    down: require('./commands/down'),
    build: require('./commands/build'),
    exec: require('./commands/exec'),
    shell: require('./commands/shell'),
    logs: require('./commands/logs'),
    status: require('./commands/status'),
    health: require('./commands/health'),
    test: require('./commands/test'),
    lint: require('./commands/lint'),
    share: require('./commands/share'),
    db: require('./commands/db'),
    add: require('./commands/add'),
    publish: require('./commands/publish'),
    env: require('./commands/env'),
    scale: require('./commands/scale'),
    snapshot: require('./commands/snapshot'),
    release: require('./commands/release'),
    runtime: require('./commands/runtime'),
    completions: require('./commands/completions'),
    upgrade: require('./commands/upgrade'),
    dashboard: require('./commands/dashboard'),
};

module.exports = { commands, helpers, templates };
