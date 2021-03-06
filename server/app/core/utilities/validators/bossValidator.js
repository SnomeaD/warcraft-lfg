"use strict";

/**
 * Validate raid param
 * @param boss
 * @param callback
 */
module.exports.validate = function (boss, callback) {
    if (boss == null) {
        return callback(new Error('MISSING_B0SS_VALIDATION_ERROR'));
    }
    callback();
};