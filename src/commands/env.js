'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { findProjectRoot, header, success, info, error } = require('../utils/helpers');

function parseEnv(content) {
    const map = {};
    content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const idx = trimmed.indexOf('=');
        if (idx === -1) return;
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        map[key] = val;
    });
    return map;
}

function serializeEnv(map) {
    return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
}

module.exports = function envCommand(action, args) {
    const root = findProjectRoot() || process.cwd();
    const envPath = path.join(root, '.env');

    header(`Env: ${action}`);

    switch (action) {
        case 'list': {
            if (!fs.existsSync(envPath)) { info('No .env file found.'); return; }
            const vars = parseEnv(fs.readFileSync(envPath, 'utf8'));
            Object.entries(vars).forEach(([k, v]) => {
                console.log(`  ${chalk.cyan(k)} = ${chalk.gray(v)}`);
            });
            break;
        }

        case 'get': {
            const key = args[0];
            if (!key) { error('Usage: shiplet env get KEY', 1); }
            if (!fs.existsSync(envPath)) { info('.env not found.'); return; }
            const vars = parseEnv(fs.readFileSync(envPath, 'utf8'));
            if (vars[key] !== undefined) {
                console.log(`  ${chalk.cyan(key)} = ${chalk.white(vars[key])}`);
            } else {
                info(`Key ${chalk.cyan(key)} not found.`);
            }
            break;
        }

        case 'set': {
            // shiplet env set KEY=VALUE  or  KEY VALUE
            let key, val;
            if (args[0]?.includes('=')) {
                const parts = args[0].split('=');
                key = parts[0];
                val = parts.slice(1).join('=');
            } else {
                [key, val] = args;
            }
            if (!key || val === undefined) { error('Usage: shiplet env set KEY VALUE', 1); }

            let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
            const vars = parseEnv(content);
            vars[key] = val;
            fs.writeFileSync(envPath, serializeEnv(vars));
            success(`${chalk.cyan(key)} set.`);
            break;
        }

        case 'unset': {
            const key = args[0];
            if (!key) { error('Usage: shiplet env unset KEY', 1); }
            if (!fs.existsSync(envPath)) { info('.env not found.'); return; }
            const vars = parseEnv(fs.readFileSync(envPath, 'utf8'));
            if (vars[key] === undefined) { info(`Key ${chalk.cyan(key)} not found.`); return; }
            delete vars[key];
            fs.writeFileSync(envPath, serializeEnv(vars));
            success(`${chalk.cyan(key)} removed.`);
            break;
        }

        case 'sync': {
            // Copy .env.example → .env for keys that are missing
            const examplePath = path.join(root, '.env.example');
            if (!fs.existsSync(examplePath)) { info('.env.example not found.'); return; }

            const exampleVars = parseEnv(fs.readFileSync(examplePath, 'utf8'));
            const currentVars = fs.existsSync(envPath)
                ? parseEnv(fs.readFileSync(envPath, 'utf8'))
                : {};

            let added = 0;
            Object.entries(exampleVars).forEach(([k, v]) => {
                if (currentVars[k] === undefined) {
                    currentVars[k] = v;
                    added++;
                    info(`Added ${chalk.cyan(k)}`);
                }
            });

            fs.writeFileSync(envPath, serializeEnv(currentVars));
            success(`Sync complete — ${added} key(s) added.`);
            break;
        }

        default:
            error(`Unknown env action: ${action}. Use get, set, unset, list, sync.`, 1);
    }
};
