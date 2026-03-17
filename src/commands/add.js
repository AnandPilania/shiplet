'use strict';

const fs = require('fs');
const chalk = require('chalk');
const inquirer = require('inquirer');
const YAML = require('yaml');
const { findProjectRoot, resolveComposeFile, header, success, info } = require('../utils/helpers');
const templates = require('../templates');

const AVAILABLE = ['postgres', 'mysql', 'mongo', 'redis', 'mailpit', 'minio', 'elasticsearch', 'adminer'];

module.exports = async function addCommand(services) {
    const root = findProjectRoot();
    if (!root) { console.error(chalk.red('\n✖  No shiplet.yml found.\n')); process.exit(1); }

    header('Add Services');

    let toAdd = services;

    if (!toAdd || !toAdd.length) {
        const { chosen } = await inquirer.prompt([{
            type: 'checkbox',
            name: 'chosen',
            message: 'Which services do you want to add?',
            choices: AVAILABLE,
        }]);
        toAdd = chosen;
    }

    if (!toAdd.length) {
        info('No services selected.');
        return;
    }

    const composeFile = resolveComposeFile(root);
    if (!composeFile) {
        console.error(chalk.red('✖  No compose file found.'));
        process.exit(1);
    }

    const raw = fs.readFileSync(composeFile, 'utf8');
    const doc = YAML.parseDocument(raw);
    const svc = doc.get('services');

    toAdd.forEach((name) => {
        const snippet = templates.serviceSnippet(name);
        if (!snippet) {
            console.warn(chalk.yellow(`  ⚠  Unknown service: ${name}, skipping.`));
            return;
        }
        if (svc.has(name)) {
            info(`Service ${chalk.cyan(name)} already exists, skipping.`);
            return;
        }
        svc.set(name, YAML.parseDocument(snippet).contents);
        success(`Added ${chalk.cyan(name)}`);
    });

    fs.writeFileSync(composeFile, doc.toString());

    console.log(`\n  ${chalk.gray('Run')} ${chalk.cyan('shiplet up --build')} ${chalk.gray('to apply changes.')}\n`);
};
