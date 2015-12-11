"use strict";

//Module dependencies
var request = require("request");

//Configuration
var env = process.env.NODE_ENV || 'dev';
var config = process.require('config/config.'+env+'.json');
var logger = process.require("api/logger.js").get("logger");

module.exports.getUserCharacters = function(region,accessToken,callback){
    var url = encodeURI("https://"+region+".api.battle.net/wow/user/characters?access_token="+accessToken);
    request({method:"GET",uri:url, gzip: true}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(error,JSON.parse(body).characters);
        }
        else {
            if (error) {
                logger.error(error.message + " on fetching bnet api " + url);
                return callback(new Error("BNET_API_ERROR"));
            }
            if (response.statusCode == 403) {
                logger.verbose("Error HTTP " + response.statusCode + " on fetching bnet api " + url);
                return callback(new Error("BNET_API_ERROR_DENY"));
            }

            logger.verbose("Error HTTP " + response.statusCode + " on fetching bnet api " + url)
            return callback(new Error("BNET_API_ERROR"));
        }
    })
};
module.exports.getCharacter = function(region,realm,name,callback){
    var params = ["guild","items","progression","talents","achievements","statistics","challenge","pvp","reputation","stats"];
    this.getCharacterWithParams(region,realm,name,params,function(error,results){
        callback(error,results);
    });
};

module.exports.getCharacterWithParams= function(region,realm,name,params,callback){
    var url = encodeURI("https://"+region+".api.battle.net/wow/character/"+realm+"/"+name+"?fields="+params.join(',')+"&locale=en_GB&apikey="+config.oauth.bnet.client_id);
    getCharacter(url,function(error,results){
        callback(error,results);
    });
}

module.exports.getGuild = function(region,realm,name,callback){
    var url=encodeURI("https://"+region+".api.battle.net/wow/guild/"+realm+"/"+name+"?fields=members&locale=en_GB&apikey="+config.oauth.bnet.client_id);
    request({method:"GET",uri:url, gzip: true}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(error,JSON.parse(body));
        }
        else {
            if (error) {
                logger.error(error.message + " on fetching bnet api " + url);
                return callback(new Error("BNET_API_ERROR"));
            }
            if (response.statusCode == 403) {
                logger.verbose("Error HTTP " + response.statusCode + " on fetching bnet api " + url);
                return callback(new Error("BNET_API_ERROR_DENY"));
            }
            if (response.statusCode == 404) {
                logger.verbose("Error HTTP " + response.statusCode + " on fetching bnet api " + url);
                return callback(new Error("BNET_API_GUILD_NOT_FOUND"));
            }

            logger.verbose("Error HTTP " + response.statusCode + " on fetching bnet api " + url)
            return callback(new Error("BNET_API_ERROR"));
        }
    });
};

module.exports.getRealms = function(region,callback){
    var url=encodeURI("https://"+region+".api.battle.net/wow/realm/status?locale=en_GB&apikey="+config.oauth.bnet.client_id);
    request({method:"GET",uri:url, gzip: true},function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(error,JSON.parse(body));
        }
        else {
            if (error) {
                logger.error(error.message + " on fetching bnet api " + url);
                return callback(new Error("BNET_API_ERROR"));
            }
            if (response.statusCode == 403) {
                logger.verbose("Error HTTP " + response.statusCode + " on fetching bnet api " + url);
                return callback(new Error("BNET_API_ERROR_DENY"));
            }

            logger.verbose("Error HTTP " + response.statusCode + " on fetching bnet api " + url)
            return callback(new Error("BNET_API_ERROR"));
        }
    });
};

module.exports.getAuctions = function(region,realm,callback){
    var url=encodeURI("https://"+region+".api.battle.net/wow/auction/data/"+realm+"?locale=en_GB&apikey="+config.oauth.bnet.client_id);
    request({method:"GET",uri:url, gzip: true}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var auctionUrl = encodeURI(JSON.parse(body).files[0].url);
            request(auctionUrl, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    callback(error,JSON.parse(body));
                }
                else {
                    if (error) {
                        logger.error(error.message + " on fetching bnet api " + auctionUrl);
                        return callback(new Error("BNET_API_ERROR"));
                    }
                    if (response.statusCode == 403) {
                        logger.verbose("Error HTTP " + response.statusCode + " on fetching bnet api " + auctionUrl);
                        return callback(new Error("BNET_API_ERROR_DENY"));
                    }

                    logger.verbose("Error HTTP " + response.statusCode + " on fetching bnet api " + auctionUrl)
                    return callback(new Error("BNET_API_ERROR"));
                }
            });
        }
        else {
            if (error) {
                logger.error(error.message + " on fetching bnet api " + url);
                return callback(new Error("BNET_API_ERROR"));
            }
            if (response.statusCode == 403) {
                logger.verbose("Error HTTP " + response.statusCode + " on fetching bnet api " + url);
                return callback(new Error("BNET_API_ERROR_DENY"));
            }

            logger.verbose("Error HTTP " + response.statusCode + " on fetching bnet api " + url)
            return callback(new Error("BNET_API_ERROR"));
        }
    });
};

function getCharacter(url,callback){
    request({method:"GET",uri:url, gzip: true}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(error,JSON.parse(body));
        }
        else {
            if (error) {
                logger.verbose(error.message + " on fetching bnet api " + url);
                return callback(new Error("BNET_API_ERROR"));
            }
            if (response.statusCode == 403) {
                logger.verbose("Error HTTP " + response.statusCode + " on fetching bnet api " + url);
                return callback(new Error("BNET_API_ERROR_DENY"));
            }
            if (response.statusCode == 404) {
                logger.verbose("Error HTTP " + response.statusCode + " on fetching bnet api " + url);
                return callback(new Error("BNET_API_CHARACTER_NOT_FOUND"));
            }

            logger.warn("Error HTTP " + response.statusCode + " on fetching bnet api " + url)
            return callback(new Error("BNET_API_ERROR"));
        }
    });
}

