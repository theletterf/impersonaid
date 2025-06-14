#!/usr/bin/env node

// This script starts the Impersonaid web interface

const server = require('./web/server');

// The server is already listening on the specified port in server.js
console.log('Impersonaid web interface is running. Press Ctrl+C to stop.');
