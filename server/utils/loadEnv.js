'use strict';

function shouldLoadDotenv() {
    if (process.env.NODE_ENV === 'production') return false;
    if (process.env.FLY_APP_NAME) return false;
    return true;
}

function loadEnv() {
    if (shouldLoadDotenv()) {
        require('dotenv').config();
    }
}

module.exports = { loadEnv, shouldLoadDotenv };
