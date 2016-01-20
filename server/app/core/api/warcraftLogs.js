"use strict";

//Module dependencies
var request = require("request");
var applicationStorage = process.require("core/applicationStorage.js");

//For russian Ream wowprogress is bad ...
var russianRealms = {
    "Gordunni":"Гордунни",
    "Howling Fjord":"Ревущий фьорд",
    "Blackscar":"Черный Шрам",
    "Ashenvale":"Ясеневый лес",
    "Soulflayer":"Свежеватель Душ",
    "Razuvious":"Разувий",
    "Azuregos":"Азурегос",
    "Booty Bay":"Пиратская Бухта",
    "Eversong":"Вечная Песня",
    "Deathguard":"Страж смерти",
    "Lich King":"Король-лич",
    "Fordragon":"Дракономор",
    "Borean Tundra":"Борейская тундра",
    "Goldrinn":"Голдринн",
    "Grom":"Гром",
    "Galakrond":"Галакронд"
};

module.exports.getRankings = function(region, realm, name, callback) {

    var logger = applicationStorage.logger;
    var config = applicationStorage.config;

    var warcraftlogs = {};

    if (region.toLowerCase() == "eu" && russianRealms[realm]) {
        realm = russianRealms[realm];
    }

    realm = realm.split(" ").join("-");
    realm = realm.split("'").join("");

    var url = encodeURI("https://www.warcraftlogs.com/v1/rankings/character/"+name+"/"+realm+"/"+region+"?metric=dps&api_key="+config.warcraftLogs.api_key);

    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            warcraftlogs.dps = JSON.parse(body);

            url = encodeURI("https://www.warcraftlogs.com/v1/rankings/character/"+name+"/"+realm+"/"+region+"?metric=hps&api_key="+config.warcraftLogs.api_key);

            request(url, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    warcraftlogs.hps = JSON.parse(body);
                    callback(error, warcraftlogs);
                }
                else {
                    if (error) {
                        logger.error(error.message+" on fetching warcraftlogs api "+url);
                    }
                    else {
                        logger.warn("Error HTTP "+response.statusCode+" on fetching warcraftlogs api "+url);
                    }
                    callback(new Error("WARCRAFTLOGS_API_ERROR"));
                }
            });
        }
        else {
            if (error) {
                logger.error(error.message+" on fetching warcraftlogs api "+url);
            }
            else {
                logger.warn("Error HTTP "+response.statusCode+" on fetching warcraftlogs api "+url);
            }
            callback(new Error("WARCRAFTLOGS_API_ERROR"));
        }
    });
};