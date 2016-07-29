"use strict";

//Load dependencies
var router = require("express").Router();
var passport = require("passport");
var userController = process.require("users/userController.js");
var auth = process.require("users/utilities/middleware/auth.js");
var messagePermission = process.require("messages/utilities/middleware/messagePermission.js");
var applicationStorage = process.require("core/applicationStorage.js");

var config = applicationStorage.config;

//Load express passport bnetAuth middleware
process.require("users/utilities/middleware/bnetAuth.js");

//Define routes
router.get("/auth/bnet", passport.authenticate("bnet"));
router.get("/auth/bnet/callback", passport.authenticate("bnet", {successRedirect: "/", failureRedirect: "/"}));
router.get("/auth/bnet/lfg", passport.authenticate("bnet-lfg"));
router.get("/auth/bnet/lfg/callback", passport.authenticate("bnet-lfg", {successRedirect: "/", failureRedirect: "/"}));
router.get("/auth/bnet/progress", passport.authenticate("bnet-progress"));
router.get("/auth/bnet/progress/callback", passport.authenticate("bnet-progress", {successRedirect: "/", failureRedirect: "/"}));
router.get("/auth/bnet/parser", passport.authenticate("bnet-parser"));
router.get("/auth/bnet/parser/callback", passport.authenticate("bnet-parser", {successRedirect: "/", failureRedirect: "/"}));
router.get('/user/logout', auth.isAuthenticated, userController.logout);
router.get("/user/profile", auth.isAuthenticated, userController.getProfile);
router.get("/user/characterAds", auth.isAuthenticated, userController.getCharacterAds);
router.get("/user/guildAds", auth.isAuthenticated, userController.getGuildAds);
router.get("/user/characters/:region", auth.isAuthenticated, userController.getCharacters);
router.get("/user/guilds/:region", auth.isAuthenticated, userController.getGuilds);
router.get("/user/guildRank/:region/:realm/:name", auth.isAuthenticated, userController.getGuildRank);
router.put("/user/profile",auth.isAuthenticated, userController.putProfile)
router.get("/user/unreadMessageCount", auth.isAuthenticated, userController.getUnreadMessageCount);

module.exports = router;

