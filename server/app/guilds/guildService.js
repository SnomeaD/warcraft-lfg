"use strict";

var async = require("async");
var guildModel = process.require("guilds/guildModel.js");
var bnetAPI = process.require("core/api/bnet.js");
var userService = process.require("users/userService.js");

/**
 * Sanitize and set the user's id to the guild
 * @param region
 * @param realm
 * @param name
 * @param id
 * @param callback
 */
module.exports.sanitizeAndSetId = function(region,realm,name,id,callback){
    async.waterfall([
        function(callback){
            bnetAPI.getGuild(region,realm,name,[],function(error,guild){
                callback(error,guild);
            });
        },
        function(guild,callback){
            guildModel.setId(region,guild.realm,guild.name,id,function(error){
                callback(error);
            });
        }
    ],function(error){
        callback(error);
    });
};

module.exports.checkPermsAndUpsertAd = function(region,realm,name,id,ad,callback){
    async.waterfall([
        function(callback){
            userService.hasGuildRankPermission(region,realm,name,id,['ad', 'edit'],function(error, hasPerm) {
                callback(error, hasPerm)
            });
        },
        function(hasPerm,callback){
            if(hasPerm){
                bnetAPI.getGuild(region,realm,name,[],function(error,guild) {
                    callback(error,guild);
                });
            }
            else {
                callback(new Error("GUILD_NOT_OFFICER_ERROR"));
            }
        },
        function(guild,callback) {
            async.parallel([
                function(callback){
                    guildModel.upsertAd(region,guild.realm,guild.name,ad,function(error){ //Upsert the ad
                        callback(error);
                    });
                },
                function(callback){
                    guildModel.setId(region,guild.realm,guild.name,id,function(error){ // Set the user Id
                        callback(error);
                    });
                }
            ],function(error){
                callback(error)
            });
        }
    ],function(error){
        callback(error);
    });
};

