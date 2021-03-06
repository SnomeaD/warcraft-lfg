"use strict";

//Load dependencies
var async = require("async");
var moment = require('moment-timezone');
var applicationStorage = process.require("core/applicationStorage.js");
var bnetAPI = process.require("core/api/bnet.js");
var warcraftLogsAPI = process.require("core/api/warcraftLogs.js");
var updateModel = process.require("updates/updateModel.js");
var updateService = process.require("updates/updateService.js");
var characterModel = process.require("characters/characterModel.js");
var characterService = process.require("characters/characterService.js");


/**
 * CharacterUpdateProcess constructor
 * @constructor
 */
function CharacterUpdateProcess() {
}

/**
 * Update one character
 */
CharacterUpdateProcess.prototype.updateCharacter = function () {

    var logger = applicationStorage.logger;
    var self = this;
    async.waterfall([
        function (callback) {
            //Get next guild to update
            updateService.getNextUpdate('cu', function (error, characterUpdate) {
                if (characterUpdate == null) {
                    //Character update is empty
                    logger.info("No character to update ... waiting 3 sec");
                    setTimeout(function () {
                        callback(true);
                    }, 3000);
                } else {
                    logger.info("Update character %s-%s-%s", characterUpdate.region, characterUpdate.realm, characterUpdate.name);
                    callback(error, characterUpdate);
                }
            });
        },
        function (characterUpdate, callback) {
            //Sanitize name
            bnetAPI.getCharacter(characterUpdate.region, characterUpdate.realm, characterUpdate.name, ["guild", "items", "progression", "talents", "achievements", "statistics", "challenge", "pvp", "reputation", "stats", "quests"], function (error, character) {
                if (character && character.realm && character.name) {
                    callback(error, characterUpdate.region, character);
                } else {
                    logger.warn("Bnet return empty character (account inactive...), skip it");
                    callback(true);
                }
            })
        },
        function (region, character, callback) {
            async.parallel({
                ad: function (callback) {
                    async.waterfall([
                        function (callback) {
                            characterModel.findOne({
                                region: region,
                                realm: character.realm,
                                name: character.name
                            }, {ad: 1}, function (error, character) {
                                callback(error, character);
                            });
                        },
                        function (character, callback) {
                            if (character && character.ad && character.ad.timezone && character.ad.lfg == true) {
                                var offset = Math.round(moment.tz.zone(character.ad.timezone).parse(Date.UTC()) / 60);
                                async.each(character.ad.play_time, function (day, callback) {
                                    day.start.hourUTC = day.start.hour + offset;
                                    day.end.hourUTC = day.end.hour + offset;
                                    callback();
                                }, function () {
                                    callback(null, character.ad);
                                });
                            } else {
                                callback();
                            }
                        }
                    ], function (error, ad) {
                        if (error) {
                            logger.error(error.message);
                        }
                        callback(null, ad);
                    });
                },
                warcraftLogsDps: function (callback) {
                    //Get WarcraftLogs
                    warcraftLogsAPI.getRankings(region, character.realm, character.name, 'dps', function (error, warcraftLogs) {
                        var tmpObj = {};
                        if (error && error !== true) {
                            logger.error(error.message);
                            tmpObj.logs = null;
                            tmpObj.updated = new Date().getTime();
                        } else {
                            tmpObj.logs = warcraftLogs;
                            tmpObj.updated = new Date().getTime();
                        }
                        callback(null, tmpObj);
                    });
                },
                warcraftLogsHps: function (callback) {
                    //Get WarcraftLogs
                    warcraftLogsAPI.getRankings(region, character.realm, character.name, 'hps', function (error, warcraftLogs) {
                        var tmpObj = {};
                        if (error && error !== true) {
                            logger.error(error.message);
                            tmpObj.logs = null;
                            tmpObj.updated = new Date().getTime();
                        } else {
                            tmpObj.logs = warcraftLogs;
                            tmpObj.updated = new Date().getTime();
                        }
                        callback(null, tmpObj);
                    });
                },
                progress: function (callback) {
                    var progress = {score:0}
                    if (character.progression && character.progression.raids) {
                        character.progression.raids[character.progression.raids.length - 3].bosses.forEach(function(boss){
                            if(boss.normalKills>0){
                                progress.score += 1000;
                            }
                            if(boss.heroicKills>0){
                                progress.score+=100000
                            }
                            if(boss.mythicKills>0){
                                progress.score+=10000000
                            }
                        });
                        callback(null,progress);
                    }
                    else {
                        callback();
                    }
                }
            }, function (error, results) {
                // Time taken start
                //var start = new Date().getTime();

                // Parser achievements & co
                results.parser = self.parseCharacter(character);

                // Set current specialization
                self.parseCharacterTalents(character);

                // Clean warcraftLogs
                results.warcraftLogs = {};
                results.warcraftLogs = self.parseWarcraftLogs(results.warcraftLogsDps, results.warcraftLogsHps, character.class);

                // Too many data, let's remove
                character.achievements = null;
                character.quests = null;

                // Set bnet info
                results.bnet = character;
                results.bnet.updated = new Date().getTime();

                // Time taken end
                /*var end = new Date().getTime();
                var time = end - start;
                console.log('Execution time: ' + time);*/

                characterModel.upsert(region, character.realm, character.name, results, function (error) {
                    callback(error);
                });
            });
        }
    ], function (error) {
        if (error && error !== true) {
            logger.error(error.message);
        }
        self.updateCharacter();
    });
};

/**
 * Parse one character
 */
CharacterUpdateProcess.prototype.parseCharacter = function (character) {
    var self = this;

    // Parser
    var parser = {};

    // Suramar WQ unlock
    parser.suramar = {};
    if (character.achievements) {
        var achievement = character.achievements.achievementsCompleted.indexOf(10617);
        if (achievement >= 0) {
            parser.suramar.worldQuest = 6;
            parser.suramar.worldQuestTimestamp = character.achievements.achievementsCompletedTimestamp[achievement];
        } else {
            parser.suramar.worldQuest = 0;
            if (character.quests.indexOf(40009) >= 0) {
                parser.suramar.worldQuest++;
            }
            if (character.quests.indexOf(40956) >= 0) {
                parser.suramar.worldQuest++;
            }
            if (character.quests.indexOf(42147) >= 0) {
                parser.suramar.worldQuest++;
            }
            if (character.quests.indexOf(41760) >= 0) {
                parser.suramar.worldQuest++;
            }
            if (character.quests.indexOf(41138) >= 0) {
                parser.suramar.worldQuest++;
            }
            if (character.quests.indexOf(42230) >= 0) {
                parser.suramar.worldQuest++;
            }
        }
    }

    // Suramar COS unlock
    if (character.quests && character.quests.indexOf(43314) >= 0) {
        parser.suramar.courtOfStar = true;
    }

    // Suramar Arcway unlock
    if (character.quests && character.quests.indexOf(44053) >= 0) {
        parser.suramar.arcway = true;
    }

    // Reputation Suramar
    for (var i = 0; i < character.reputation.length; i++) {
        if (character.reputation[i].name == "The Nightfallen") {
            parser.suramar.reputation = character.reputation[i];
        }
    }

    // Class Order Campaign
    if (character.achievements) {
        var achievement = character.achievements.achievementsCompleted.indexOf(10994);
        if (achievement >= 0) {
            parser.classOrderCampaign = true
            parser.classOrderCampaignTimestamp = character.achievements.achievementsCompletedTimestamp[achievement];
        }
    }

    // Obliterum forge
    if (character.achievements) {
        var achievement = character.achievements.achievementsCompleted.indexOf(10585);
        if (achievement >= 0) {
            parser.obliterumForge = true;
            parser.obliterumForgeTimestamp = character.achievements.achievementsCompletedTimestamp[achievement];
        }
    }

    // Legendary
    parser.legendary = 0;
    for (var i = 0; i < character.items.length; i++) {
        if (character.items[i].quality && character.items[i].quality == 5 && character.items[i].itemLevel > 850) {
            parser.legendary++;
        }
    }

    // Artifact trait
    parser.artifact = {trait: 0, knowledge: 0, relic: 0};
    if (character.items && character.items.mainHand) {
        parser.artifact.relic = character.items.mainHand.relics.length;

        var traitCount = 0;
        character.items.mainHand.artifactTraits.forEach(function(trait) {
            if (trait && trait.rank) {
                traitCount += trait.rank;
            }
        });

        parser.artifact.trait = traitCount;
    }

    // T19
    parser.t19 = 0;

    // WCL

    // Audit

    // Proving Grounds
    parser.provingGrounds = {};
    parser.provingGrounds.tank = self.parseCharacterProvingGrounds(character.achievements, 'tank');
    parser.provingGrounds.dps = self.parseCharacterProvingGrounds(character.achievements, 'dps');
    parser.provingGrounds.healer = self.parseCharacterProvingGrounds(character.achievements, 'tank');

    parser.challenge = {};
    parser.challenge.gold = self.parseCharacterChallengeMedal(character.achievements, 'gold');
    parser.challenge.silver = self.parseCharacterChallengeMedal(character.achievements, 'silver');
    parser.challenge.copper = self.parseCharacterChallengeMedal(character.achievements, 'copper');

    return parser;
};

/**
 * Parse ProvingGround (WOD)
 */
CharacterUpdateProcess.prototype.parseCharacterProvingGrounds = function (achievements, type) {
    var statId = {
        'tank': [9578, 9579, 9580, 26345],
        'dps': [9572, 9573, 9574, 26344],
        'healer': [9584, 9585, 9586, 26346]
    };

    var criteriaId;

    var data = {};

    data.best = 0;

    if (achievements && achievements.achievementsCompleted) {
        if (achievements.achievementsCompleted.indexOf(statId[type][2]) != -1) {
            data.gold = true;
            if ((criteriaId = achievements.criteria.indexOf(statId[type][3])) != -1) {
                data.best = achievements.criteria[criteriaId];
            }
        } else if (achievements.achievementsCompleted.indexOf(statId[type][1]) != -1) {
            data.silver = true;
        } else if (achievements.achievementsCompleted.indexOf(statId[type][0]) != -1) {
            data.copper = true;
        }
    }

    return data;

}

/**
 * Parse ProvingGround (WOD)
 */
CharacterUpdateProcess.prototype.parseCharacterChallengeMedal = function (achievements, type) {
    var statId = {
        'gold': [8878, 8882, 9004, 8886, 9000, 8874, 8890, 8894],
        'silver': [8877, 8881, 9003, 8885, 8999, 8873, 8889, 8893],
        'copper': [8876, 8880, 9002, 8884, 8998, 8872, 8888, 8892]
    };

    var data = 0;

    if (achievements && achievements.achievementsCompleted) {
        statId[type].forEach(function(id) {
            if (achievements.achievementsCompleted.indexOf(id) != -1) {
                data++;
            }
        });
    }

    return data;
}

/**
 * Parse WCL
 */
CharacterUpdateProcess.prototype.parseWarcraftLogs = function (wclDps, wclHps, characterClass) {
    var self = this;

    var classSpecStr ={
        1: {"Arms": 0, "Fury": 1, "Protection": 2},
        2: {"Holy": 0, "Protection": 1, "Retribution": 2},
        3: {"BeastMastery": 0, "Marksmanship": 1, "Survival": 2},
        4: {"Assassination": 0, "Outlaw": 1, "Combat": 1, "Subtlety": 2},
        5: {"Discipline": 0, "Holy": 1, "Shadow": 2},
        6: {"Blood": 0, "Frost": 1, "Unholy": 2},
        7: {"Elemental": 0, "Enhancement": 1, "Restoration": 2},
        8: {"Arcane": 0, "Fire": 1, "Frost": 2},
        9: {"Affliction": 0, "Demonology": 1, "Destruction": 2},
        10: {"Brewmaster": 0, "Mistweaver": 1, "Windwalker": 2},
        11: {"Balance": 0, "Feral": 1, "Guardian": 2, "Restoration": 3},
        12: {"Havoc": 0, "Vengeance": 2}
    }

    var classSpec = {
        1: {0: "dps", 1: "dps", 2: "dps", 3: null},
        2: {0: "heal", 1: "tank", 2: "dps", 3: null},
        3: {0: "dps", 1: "dps", 2: "dps", 3: null},
        4: {0: "dps", 1: "dps", 2: "dps", 3: null},
        5: {0: "heal", 1: "heal", 2: "dps", 3: null},
        6: {0: "tank", 1: "dps", 2: "dps", 3: null},
        7: {0: "dps", 1: "dps", 2: "heal", 3: null},
        8: {0: "dps", 1: "dps", 2: "dps", 3: null},
        9: {0: "dps", 1: "dps", 2: "dps", 3: null},
        10: {0: "tank", 1: "heal", 2: "dps", 3: null},
        11: {0: "dps", 1: "dps", 2: "tank", 3: "heal"},
        12: {0: "dps", 1: "dps", 2: null, 3: null}
    };

    if (wclDps || wclHps) {
        var warcraftLogs = {bosses: {}, difficulty: {3:{},4:{},5:{}}, 'bestHighSpec': {}, 'bestAllSpec': {}};
        
        // DPS
        if (wclDps.logs && wclDps.logs instanceof Array) {
            wclDps.logs.forEach(function (log) {
                if (log.name && !warcraftLogs.bosses[log.name]) {
                    warcraftLogs.bosses[log.name] = {difficulty: {3:{0: null,'1': null,'2': null,'3':null},4:{0: null,'1':null,'2': null,'3': null},5:{0: null,'1': null,'2': null,'3': null}}};
                }

                if (log.difficulty >= 3 && log.difficulty <= 5) {
                    log.specs.forEach(function (spec) {
                        if (!spec.combined) {
                            var specNumber = classSpecStr[characterClass][spec.spec]; 

                            if (spec.spec && !warcraftLogs.difficulty[log.difficulty][specNumber]) {
                                warcraftLogs.difficulty[log.difficulty][specNumber] = {kill: 0, average: 0, median: 0, best: 0, number: 0};
                            }

                            if (log.name && log.difficulty && characterClass && spec.spec) {
                                if (classSpec[characterClass][specNumber] == "dps" || classSpec[characterClass][specNumber] == "tank") {
                                    warcraftLogs.bosses[log.name].difficulty[log.difficulty][specNumber] = {kill: spec.historical_total, average: Math.round(spec.historical_avg), median: Math.round(spec.historical_median), best: Math.round(spec.best_historical_percent)};
                                    warcraftLogs.difficulty[log.difficulty][specNumber].kill += spec.historical_total;
                                    warcraftLogs.difficulty[log.difficulty][specNumber].average += Math.round(spec.historical_avg);
                                    warcraftLogs.difficulty[log.difficulty][specNumber].median += Math.round(spec.historical_median);
                                    warcraftLogs.difficulty[log.difficulty][specNumber].best += Math.round(spec.best_historical_percent);
                                    warcraftLogs.difficulty[log.difficulty][specNumber].number += 1;
                                }
                            }
                        }
                    });
                }
            });
        }

        // Healer
        if (wclHps.logs && wclHps.logs instanceof Array) {
            wclHps.logs.forEach(function (log) {
                if (log.name && !warcraftLogs.bosses[log.name]) {
                    warcraftLogs.bosses[log.name] = {difficulty: {3:{0: null,'1': null,'2': null,'3':null},4:{0: null,'1':null,'2': null,'3': null},5:{0: null,'1': null,'2': null,'3': null}}};
                }

                if (log.difficulty >= 3 && log.difficulty <= 5) {
                    log.specs.forEach(function (spec) {
                        if (!spec.combined) {
                            var specNumber = classSpecStr[characterClass][spec.spec];

                            if (spec.spec && !warcraftLogs.difficulty[log.difficulty][specNumber]) {
                                warcraftLogs.difficulty[log.difficulty][specNumber] = {kill: 0, average: 0, median: 0, best: 0, number: 0};
                            }

                            if (log.name && log.difficulty && characterClass && spec.spec) {
                                if (classSpec[characterClass][specNumber] == "heal") {
                                    warcraftLogs.bosses[log.name].difficulty[log.difficulty][specNumber] = {kill: spec.historical_total, average: Math.round(spec.historical_avg), median: Math.round(spec.historical_median), best: Math.round(spec.best_historical_percent)};
                                    warcraftLogs.difficulty[log.difficulty][specNumber].kill += spec.historical_total;
                                    warcraftLogs.difficulty[log.difficulty][specNumber].average += Math.round(spec.historical_avg);
                                    warcraftLogs.difficulty[log.difficulty][specNumber].median += Math.round(spec.historical_median);
                                    warcraftLogs.difficulty[log.difficulty][specNumber].best += Math.round(spec.best_historical_percent);
                                    warcraftLogs.difficulty[log.difficulty][specNumber].number += 1;
                                }
                            }
                        }
                    });
                }
            });
        }

        // Calc ratio for each difficulty & spec
        var i = 0;
        var bestHighSpecTotal =  {kill: 0, average: 0, median: 0, best: 0, number: 0};
        var bestAllSpecTotal = {kill: 0, average: 0, median: 0, best: 0, number: 0};

        // Calc best spec in highest difficulty & best spec overall
        Object.keys(warcraftLogs.bosses).forEach(function(key, value) {
            var averageSpec = {0: {kill: 0, average: 0, median: 0, best: 0, number: 0}, 1: {kill: 0, average: 0, median: 0,  best: 0, number: 0}, 2: {kill: 0, average: 0, median: 0,  best: 0, number: 0}, 3: {kill: 0, average: 0, median: 0,  best: 0, number: 0}};
            var bestHighSpec = {kill: 0, average: 0, median: 0, best: 0, difficulty: 0};
            for (var difficulty = 3; difficulty <= 5; difficulty++) {
                for (var spec = 0; spec <= 3; spec++) {
                    if (warcraftLogs.bosses[key].difficulty[difficulty] && warcraftLogs.bosses[key].difficulty[difficulty][spec]) {
                        averageSpec[spec].kill += warcraftLogs.bosses[key].difficulty[difficulty][spec].kill;
                        averageSpec[spec].average += warcraftLogs.bosses[key].difficulty[difficulty][spec].average;
                        averageSpec[spec].median += warcraftLogs.bosses[key].difficulty[difficulty][spec].median;
                        averageSpec[spec].best += warcraftLogs.bosses[key].difficulty[difficulty][spec].best;
                        averageSpec[spec].number += 1;

                        if (warcraftLogs.bosses[key].difficulty[difficulty][spec].kill > bestHighSpec.kill || difficulty > bestHighSpec.difficulty) {
                            bestHighSpec = warcraftLogs.bosses[key].difficulty[difficulty][spec];
                            bestHighSpec.difficulty = difficulty;
                        }
                    }
                }
            }

            var bestAllSpec = {kill: 0, average: 0, median: 0, number: 0};
            for (var spec = 0; spec <= 3; spec++) {
                if (averageSpec[spec].kill > bestAllSpec.kill) {
                    if (averageSpec[spec].number > 0) {
                        averageSpec[spec].average = Math.round(averageSpec[spec].average/averageSpec[spec].number);
                        averageSpec[spec].median = Math.round(averageSpec[spec].median/averageSpec[spec].number);
                        averageSpec[spec].best = Math.round(averageSpec[spec].best/averageSpec[spec].number);
                    }
                    bestAllSpec = averageSpec[spec];
                }
            }

            warcraftLogs.bosses[key]['bestAllSpec'] = bestAllSpec;
            warcraftLogs.bosses[key]['bestHighSpec'] = bestHighSpec;

            // Add to total
            bestHighSpecTotal.kill += bestHighSpec.kill;
            bestHighSpecTotal.average += bestHighSpec.average;
            bestHighSpecTotal.median += bestHighSpec.median;
            bestHighSpecTotal.best += bestHighSpec.best;
            bestHighSpecTotal.number += 1;

            bestAllSpecTotal.kill += bestAllSpec.kill;
            bestAllSpecTotal.average += bestAllSpec.average;
            bestAllSpecTotal.median += bestAllSpec.median;
            bestAllSpecTotal.best += bestAllSpec.best;
            bestAllSpecTotal.number += 1;
        });

        self.parseWarcraftLogsAverage(bestAllSpecTotal);
        self.parseWarcraftLogsAverage(bestHighSpecTotal);

        for (var difficulty = 3; difficulty <= 5; difficulty++) {
            for (var spec = 0; spec <= 3; spec++) {
                if (warcraftLogs.difficulty[difficulty] && warcraftLogs.difficulty[difficulty][spec]) {
                    self.parseWarcraftLogsAverage(warcraftLogs.difficulty[difficulty][spec]);
                }
            }
        }

        warcraftLogs['bestAllSpec'] = bestAllSpecTotal;
        warcraftLogs['bestHighSpec'] = bestHighSpecTotal;  
    } else {
        var warcraftLogs = {bosses: {}, difficulty: {3:{},4:{},5:{}}, 'bestHighSpec': {kill: 0, average: 0, median: 0, best: 0, number: 0}, 'bestAllSpec': {kill: 0, average: 0, median: 0, best: 0, number: 0}};
    }

    return warcraftLogs;
}

/**
 * Parse WCL average
 */
CharacterUpdateProcess.prototype.parseWarcraftLogsAverage = function (data) {
    if (data && data.number && data.number > 0) {
        data.average = Math.round(data.average/data.number);
        data.median = Math.round(data.median/data.number);
        data.best = Math.round(data.best/data.number);
    }
}

/**
 * Parse Character talents
 */
CharacterUpdateProcess.prototype.parseCharacterTalents = function (character) {
    var talentSelected;

    if (character && character.talents && character.talents.length > 0) {
        character.talents.forEach(function(talent) {
            if (talent.selected) {
                talentSelected = talent;
                talentSelected.slug = character.class+'-';
                if (talent.spec && talent.spec.name) {
                    talentSelected.slug =  talentSelected.slug + talent.spec.name.toLowerCase();
                }
            }
        });

        if (talentSelected) {
            character.talents = [];
            character.talents.push(talentSelected);
        }
    }
}

/**
 * Start characterUpdateProcess
 * @param callback
 */
CharacterUpdateProcess.prototype.start = function (callback) {
    applicationStorage.logger.info("Starting CharacterUpdateProcess");
    this.updateCharacter();
    callback();
};

module.exports = CharacterUpdateProcess;
