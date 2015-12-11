"use strict";

//Module dependencies
var bnetAPI = process.require("api/bnet.js");
var warcraftLogsAPI = process.require("api/warcraftLogs.js");
var logger = process.require("api/logger.js").get("logger");
var characterUpdateModel = process.require("models/characterUpdateModel.js");
var characterModel = process.require("models/characterModel.js");
var applicationStorage = process.require("api/applicationStorage.js");
var userService = process.require("services/userService.js");
var guildKillModel = process.require("models/guildKillModel.js");
var guildProgressUpdateModel = process.require("models/guildProgressUpdateModel.js");

var async = require("async");

//Configuration
var env = process.env.NODE_ENV || 'dev';
var config = process.require('config/config.'+env+'.json');

module.exports.updateNext = function(callback){
    var self=this;
    characterUpdateModel.getNextToUpdate(function(error,characterUpdate) {
        if (error) {
            logger.error(error.message);
            return callback(error);
        }
        if (characterUpdate) {
            //Get Character Update Result (json or key)
            if(characterUpdate.region && characterUpdate.realm && characterUpdate.name ) {
                logger.info("Update Character "+characterUpdate.region+"-"+characterUpdate.realm+"-"+characterUpdate.name);
                self.update(characterUpdate.region, characterUpdate.realm, characterUpdate.name, function (error) {
                    if(error && error.message == "BNET_API_ERROR_DENY") {
                        //Bnet API DENY reset the characterUpdateModel for after
                        characterUpdateModel.insertOrUpdate(characterUpdate.region,characterUpdate.realm,characterUpdate.name,characterUpdate.priority,function(error){
                            if(error) {
                                logger.error(error.message);
                                return callback();
                            }
                            logger.warn("Bnet Api Deny ... waiting 1 min");
                            return setTimeout(function () {
                                callback();
                            }, 60000);
                        });
                    }
                    else
                        callback();
                });

            }
            else{
                //Character Update is already parse before
                callback();
            }
        }
        else{
            //Character Update is empty
            logger.info("No CharacterUpdate ... waiting 3 sec");
            setTimeout(function() {
                callback();
            }, 3000);

        }
    });
};

module.exports.update = function(region,realm,name,callback) {
    var self = this;
    bnetAPI.getCharacter(region, realm, name, function (error, character) {
        if (error)
            return callback(error);

        // Check if character have the level
        /*if(character.level<100)
         return callback();*/

        characterModel.insertOrUpdateBnet(region,character.realm,character.name,character,function (error) {
            if (error)
                return callback(error);

            logger.info('insert/update character: ' + region + "-" + character.realm + "-" + character.name);
            self.emitCount();

            //Get Wlogs only if character exist
            warcraftLogsAPI.getRankings(region,character.realm,character.name,function (error,warcraftLogs) {
                if (error)
                    return callback(error);

                characterModel.insertOrUpdateWarcraftLogs(region,character.realm,character.name,warcraftLogs,function (error) {
                    if (error)
                        return callback(error);
                    logger.info('insert/update wlogs for character: ' + region + "-" + character.realm + "-" + character.name);

                    if (character.guild && character.guild.name && character.guild.realm){

                        async.forEachSeries(character.talents,function(talent,callback){

                            if(!talent.selected || !talent.spec || talent.spec.name ==null ||talent.spec.role ==null )
                                return callback();

                            async.forEachSeries(character.progression.raids,function(raid,callback){
                                //Parse only raid in config
                                if(config.progress.indexOf(raid.name) == -1)
                                    return callback();

                                var bossWeight = 0;
                                async.forEachSeries(raid.bosses,function(boss,callback){

                                    var progress = {name:character.name, realm:character.realm, region:region,spec:talent.spec.name,role:talent.spec.role,level:character.level,faction:character.faction,class:character.class,averageItemLevelEquipped:character.items.averageItemLevelEquipped};

                                    var difficulties = ["normal","heroic","mythic"];
                                    async.forEachSeries(difficulties,function(difficulty,callback){
                                        if(boss[difficulty+'Timestamp']==0)
                                            return callback();
                                        guildKillModel.insertOrUpdate(region,character.guild.realm,character.guild.name,raid.name,boss.name,bossWeight,difficulty,boss[difficulty+'Timestamp'],progress,function(error) {
                                            if (error)
                                                return callback(error);
                                            guildProgressUpdateModel.insertOrUpdate(region, character.guild.realm, character.guild.name, 0, function (error) {
                                                callback(error);
                                            });
                                        });
                                    },function(){
                                        bossWeight++;
                                        callback();
                                    });

                                },function(){
                                    callback();
                                });

                            },function(){
                                callback();
                            });

                        },function(){
                            callback();
                        });
                    }
                    else
                        callback();
                });
            });
        });
    });
};


module.exports.insertOrUpdateUpdate =  function(region,realm,name,callback) {
    characterUpdateModel.insertOrUpdate(region, realm, name, 5, function (error) {
        if (error){
            logger.error(error.message);
            callback(error);
            return;
        }
        characterUpdateModel.getPosition(5,function(error,position){
            if (error){
                logger.error(error.message);
            }
            callback(error,position);
        });
    });
};



module.exports.emitCount = function(){
    //Dispatch count to all users if new
    characterModel.getCount(function(error,count){
        if (error){
            logger.error(error.message);
            return;
        }
        var io = applicationStorage.getSocketIo();
        if(!io)
            var io = require('socket.io-emitter')();
        io.emit('get:charactersCount', count);
    });
};

module.exports.emitAdsCount = function(){
    //Dispatch count to all users if new
    characterModel.getAdsCount(function(error,count){
        if (error){
            logger.error(error.message);
            return;
        }
        var io = applicationStorage.getSocketIo();
        if(!io)
            var io = require('socket.io-emitter')();
        io.emit('get:characterAdsCount', count);
    });
};

module.exports.emitLastAds = function(){
    characterModel.getLastAds(function (error, characterAds) {
        if (error) {
            return;
        }
        var io = applicationStorage.getSocketIo();
        if(!io)
            var io = require('socket.io-emitter')();
        io.emit('get:lastCharacterAds', characterAds);
    });

};



module.exports.insertOrUpdateAd = function(region,realm,name,id,ad,callback){
    var self = this;
    userService.isOwner(id,region,realm,name,function(error,isMyCharacter){
        if(error){
            logger.error(error.message);
            callback(error);
            return;
        }
        if(isMyCharacter){
            bnetAPI.getCharacterWithParams(region,realm,name,[],function(error,character){
                if (error)
                    return callback(error);
                characterModel.insertOrUpdateAd(region,character.realm,character.name,id,ad,function(error){
                    if(error)
                        logger.error(error.message);

                    self.emitAdsCount();
                    self.emitCount();
                    self.emitLastAds();

                    characterUpdateModel.insertOrUpdate(region,realm,name,10,function(error){
                        if(error)
                            logger.error(error.message);
                    });
                    callback(error);
                });
            });

        }
        else {
            error = new Error("CHARACTER_NOT_MEMBER_ERROR");
            logger.error(error.message);
            callback(error);
        }
    });
};


module.exports.setId = function(region,realm,name,id,callback){
    characterModel.setId(region,realm,name,id,function(error){
        if(error)
            logger.error(error.message);
        callback(error);
    });
};



module.exports.getLastAds = function(callback) {
    characterModel.getLastAds(function (error, characters) {
        if (error)
            logger.error(error.message);
        callback(error,characters);

    });
};

module.exports.getAds = function(number,filters,callback) {
    characterModel.getAds(number,filters,function (error, characters) {
        if (error)
            logger.error(error.message);
        callback(error,characters);

    });
};

module.exports.get = function(region,realm,name,callback){
    characterModel.get(region,realm,name,function(error,character){
        if (error)
            logger.error(error.message);
        callback(error,character);
    });
};

module.exports.getCount = function(callback){
    characterModel.getCount(function (error, count) {
        if (error)
            logger.error(error.message);
        callback(error,count);
    });
};

module.exports.getAdsCount = function(callback){
    characterModel.getAdsCount(function (error, count) {
        if (error)
            logger.error(error.message);
        callback(error,count);
    });
};

module.exports.deleteAd = function(region,realm,name,id,callback){
    var self=this;
    characterModel.deleteAd(region,realm,name,id,function(error){
        if (error)
            logger.error(error.message);

        self.emitAdsCount();
        self.emitCount();
        self.emitLastAds();

        callback(error);

    });
};

module.exports.getUserAds = function(id,callback){
    characterModel.getUserAds(id,function(error,ads){
        if (error)
            logger.error(error.message);

        callback(error,ads);
    });
};

module.exports.deleteOldAds = function(callback){
    var timestamp = new Date().getTime();
    var oldTimestamp = timestamp - (30 * 24 * 3600 * 1000);
    characterModel.deleteOldAds(oldTimestamp,function(error){
        if (error){
            logger.error(error.message);
        }
        callback(error);
    });
};

module.exports.setAdsToUpdate = function(callback){

    characterModel.getAds(0,null,function(error,guilds){
        if(error){
            logger.error(error.message);
            return callback(error);
        }
        async.eachSeries(guilds,function(guild,callback){
            characterUpdateModel.insertOrUpdate(guild.region,guild.realm,guild.name,3,function(error){
                if(error)
                    logger.error(error.message);
                logger.info("Insert character to update " + guild.region + "-" + guild.realm + "-" + guild.name + ' priority 3');
                callback(error);
            });
        });
    });

};