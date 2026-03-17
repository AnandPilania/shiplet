'use strict';

const chalk = require('chalk');
const { createServer } = require('../ui/server');
const { header, info, success, warn, detectRuntime, findProjectRoot } = require('../utils/helpers');

module.exports = async function dashboardCommand(options) {
    const port = parseInt(options.port || process.env.SHIPLET_UI_PORT || '6171', 10);
    const root = findProjectRoot() || process.cwd();
    const rt = detectRuntime(root) || 'none detected';

    header('Shiplet Dashboard');
    info(`Runtime  : ${chalk.cyan(rt)}`);
    info(`Port     : ${chalk.cyan(port)}`);
    console.log('');

    const { server } = createServer(port, { root });

    server.listen(port, '127.0.0.1', () => {
        success(`Dashboard running at ${chalk.bold.underline(`http://localhost:${port}`)}`);
        console.log('');
        console.log(chalk.gray('  Press Ctrl+C to stop.\n'));

        // Auto-open browser unless --no-open
        if (!options.noOpen) {
            const open = (() => {
                const p = process.platform;
                if (p === 'darwin') return 'open';
                if (p === 'win32') return 'start';
                return 'xdg-open';
            })();
            try {
                require('child_process').spawn(open, [`http://localhost:${port}`], { detached: true, stdio: 'ignore', shell: true });
            } catch { /* ignore */ }
        }
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            warn(`Port ${port} is already in use. Try: shiplet dashboard --port ${port + 1}`);
        } else {
            console.error(chalk.red('✖  Server error: ' + err.message));
        }
        process.exit(1);
    });

    process.on('SIGINT', () => {
        console.log(chalk.gray('\n\n  Dashboard stopped.\n'));
        process.exit(0);
    });
};
