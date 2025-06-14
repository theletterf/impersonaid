#!/usr/bin/env node

const CLI = require('./src/cli');

// Create and run the CLI
const cli = new CLI();
cli.parse(process.argv);
