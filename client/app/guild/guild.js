(function() {
    'use strict';

    angular
        .module('app.guild')
        .controller('GuildReadController', GuildRead)
        .controller('GuildUpdateController', GuildUpdate)
        .controller('GuildListController', GuildList)
    ;

    GuildRead.$inject = ["$scope","socket","$state","$stateParams","$location"];
    function GuildRead($scope,socket,$state,$stateParams,$location) {
        //Reset error message
        $scope.$parent.error=null;

        //Initialize $scope variables
        $scope.guild_ad = null;
        $scope.$parent.loading = true;
        $scope.current_url =  window.encodeURIComponent($location.absUrl());

        $scope.bosses = ["Hellfire Assault", "Iron Reaver", "Kormrok", "Hellfire High Council", "Kilrogg Deadeye", "Gorefiend", "Shadow-Lord Iskar", "Socrethar the Eternal", "Tyrant Velhari", "Fel Lord Zakuun", "Xhul'horac", "Mannoroth", "Archimonde"];

        socket.emit('get:guild',{"region":$stateParams.region,"realm":$stateParams.realm,"name":$stateParams.name});

        socket.forward('get:guild',$scope);
        $scope.$on('socket:get:guild',function(ev,guild){
            $scope.$parent.loading = false;
            $scope.guild = guild;

            $scope.recruit = { 'tank': 0, 'heal': 0, 'melee_dps': 0, 'ranged_dps': 0};
            angular.forEach(guild.ad.recruitment, function(value, key) {
                angular.forEach(value, function(status, test) {
                    if (status === true) {
                        $scope.recruit[key] += 1;
                    }
                });
            });
        });

        $scope.updateGuild = function(){
            $scope.$parent.loading = true;
            socket.emit('update:guild',{"region":$stateParams.region,"realm":$stateParams.realm,"name":$stateParams.name});
        };

        socket.forward('update:guild',$scope);
        $scope.$on('socket:update:guild',function(ev,queuePosition){
            $scope.queuePosition = queuePosition;
            $scope.$parent.loading = false;

        });


    }

    GuildUpdate.$inject = ["$scope","socket","$state","$stateParams","LANGUAGES","TIMEZONES"];
    function GuildUpdate($scope,socket,$state,$stateParams,LANGUAGES,TIMEZONES) {
        //Reset error message
        $scope.$parent.error=null;

        $scope.timezones = TIMEZONES;

        //Redirect not logged_in users to home
        $scope.$watch("$parent.user", function() {
            if($scope.$parent.user && $scope.$parent.user.logged_in===false)
                $state.go('dashboard');
        });


        //Initialize $scope variables
        $scope.languages= LANGUAGES;
        $scope.$parent.loading = true;


        socket.emit('get:guild',{"region":$stateParams.region,"realm":$stateParams.realm,"name":$stateParams.name});

        socket.forward('get:guild',$scope);
        $scope.$on('socket:get:guild',function(ev,guild){
            $scope.$parent.loading = false;
            //If not exit, redirect user to dashboard
            if(guild===null)
                $state.go("dashboard");
            $scope.guild = guild;
        });

        $scope.save = function(){
            socket.emit('put:guildAd',$scope.guild);
            $scope.$parent.loading = true;
        };

        socket.forward('put:guildAd',$scope);
        $scope.$on('socket:put:guildAd',function(){
            $scope.$parent.loading = false;
            $state.go("account");
        });
    }

    GuildList.$inject = ['$scope','$stateParams','$translate','$state','socket','LANGUAGES','TIMEZONES'];
    function GuildList($scope, $stateParams, $translate,$state, socket,LANGUAGES,TIMEZONES) {


        $scope.$parent.error=null;
        $scope.$parent.loading = true;
        $scope.guilds = [];


        $scope.filters = {};
        $scope.filters.faction = "";
        $scope.filters.languages = [];
        $scope.filters.classes = [];
        $scope.filters.realmZones = [];
        $scope.filters.realm = {};
        $scope.filters.raids_per_week = {};
        $scope.filters.raids_per_week.min = 1;
        $scope.filters.raids_per_week.max = 7;
        $scope.filters.days = [];


        $scope.languages = [];
        $scope.timezones = TIMEZONES;
        $scope.realms =[];

        $scope.classes = [
            {name: '<span class="icon-small tank">'+$translate.instant("TANKS")+'</span>', msGroup: true},
            {id:1, role:"tank", name: "<span class='class-1'>"+$translate.instant("CLASS_1")+"</span>", icon:"<img src='/assets/images/icon/16/class-1.png'>",iconrole:"<img src='/assets/images/icon/16/tank.png'>", selected:false},
            {id:11, role:"tank", name: "<span class='class-11'>"+$translate.instant("CLASS_11")+"</span>", icon:"<img src='/assets/images/icon/16/class-11.png'>",iconrole:"<img src='/assets/images/icon/16/tank.png'>", selected:false},
            {id:2, role:"tank", name: "<span class='class-2'>"+$translate.instant("CLASS_2")+"</span>", icon:"<img src='/assets/images/icon/16/class-2.png'>",iconrole:"<img src='/assets/images/icon/16/tank.png'>", selected:false},
            {id:10, role:"tank", name: "<span class='class-10'>"+$translate.instant("CLASS_10")+"</span>", icon:"<img src='/assets/images/icon/16/class-10.png'>",iconrole:"<img src='/assets/images/icon/16/tank.png'>", selected:false},
            {id:6, role:"tank", name: "<span class='class-6'>"+$translate.instant("CLASS_6")+"</span>", icon:"<img src='/assets/images/icon/16/class-6.png'>",iconrole:"<img src='/assets/images/icon/16/tank.png'>", selected:false},
            { msGroup: false},
            {name: '<span class="icon-small heal">'+$translate.instant("HEALS")+'</span>', msGroup: true},
            {id:11, role:"heal", name: "<span class='class-11'>"+$translate.instant("CLASS_11")+"</span>", icon:"<img src='/assets/images/icon/16/class-11.png'>",iconrole:"<img src='/assets/images/icon/16/healing.png'>", selected:false},
            {id:5, role:"heal", name: "<span class='class-5'>"+$translate.instant("CLASS_5")+"</span>", icon:"<img src='/assets/images/icon/16/class-5.png'>",iconrole:"<img src='/assets/images/icon/16/healing.png'>", selected:false},
            {id:2, role:"heal", name: "<span class='class-2'>"+$translate.instant("CLASS_2")+"</span>", icon:"<img src='/assets/images/icon/16/class-2.png'>",iconrole:"<img src='/assets/images/icon/16/healing.png'>", selected:false},
            {id:7, role:"heal", name: "<span class='class-7'>"+$translate.instant("CLASS_7")+"</span>", icon:"<img src='/assets/images/icon/16/class-7.png'>",iconrole:"<img src='/assets/images/icon/16/healing.png'>", selected:false},
            {id:10, role:"heal", name: "<span class='class-10'>"+$translate.instant("CLASS_10")+"</span>", icon:"<img src='/assets/images/icon/16/class-10.png'>",iconrole:"<img src='/assets/images/icon/16/healing.png'>", selected:false},
            { msGroup: false},
            {name: '<span class="icon-small dps">'+$translate.instant("MELEE_DPS")+'</span>', msGroup: true},
            {id:11, role:"melee_dps", name: "<span class='class-11'>"+$translate.instant("CLASS_11")+"</span>", icon:"<img src='/assets/images/icon/16/class-11.png'>",iconrole:"<img src='/assets/images/icon/16/dps.png'>", selected:false},
            {id:6, role:"melee_dps", name: "<span class='class-6'>"+$translate.instant("CLASS_6")+"</span>", icon:"<img src='/assets/images/icon/16/class-6.png'>",iconrole:"<img src='/assets/images/icon/16/dps.png'>", selected:false},
            {id:2, role:"melee_dps", name: "<span class='class-2'>"+$translate.instant("CLASS_2")+"</span>", icon:"<img src='/assets/images/icon/16/class-2.png'>",iconrole:"<img src='/assets/images/icon/16/dps.png'>", selected:false},
            {id:10, role:"melee_dps", name: "<span class='class-10'>"+$translate.instant("CLASS_10")+"</span>", icon:"<img src='/assets/images/icon/16/class-10.png'>",iconrole:"<img src='/assets/images/icon/16/dps.png'>", selected:false},
            {id:7, role:"melee_dps", name: "<span class='class-7'>"+$translate.instant("CLASS_7")+"</span>", icon:"<img src='/assets/images/icon/16/class-7.png'>",iconrole:"<img src='/assets/images/icon/16/dps.png'>", selected:false},
            {id:1, role:"melee_dps", name: "<span class='class-1'>"+$translate.instant("CLASS_1")+"</span>", icon:"<img src='/assets/images/icon/16/class-1.png'>",iconrole:"<img src='/assets/images/icon/16/dps.png'>", selected:false},
            {id:4, role:"melee_dps", name: "<span class='class-4'>"+$translate.instant("CLASS_4")+"</span>", icon:"<img src='/assets/images/icon/16/class-4.png'>",iconrole:"<img src='/assets/images/icon/16/dps.png'>", selected:false},
            { msGroup: false},
            {name: '<span class="icon-small ranged-dps">'+$translate.instant("RANGED_DPS")+'</span>', msGroup: true},
            {id:11, role:"ranged_dps", name: "<span class='class-11'>"+$translate.instant("CLASS_11")+"</span>", icon:"<img src='/assets/images/icon/16/class-11.png'>",iconrole:"<img src='/assets/images/icon/16/ranged-dps.png'>", selected:false},
            {id:5, role:"ranged_dps", name: "<span class='class-5'>"+$translate.instant("CLASS_5")+"</span>", icon:"<img src='/assets/images/icon/16/class-5.png'>",iconrole:"<img src='/assets/images/icon/16/ranged-dps.png'>", selected:false},
            {id:7, role:"ranged_dps", name: "<span class='class-7'>"+$translate.instant("CLASS_7")+"</span>", icon:"<img src='/assets/images/icon/16/class-7.png'>",iconrole:"<img src='/assets/images/icon/16/ranged-dps.png'>", selected:false},
            {id:3, role:"ranged_dps", name: "<span class='class-3'>"+$translate.instant("CLASS_3")+"</span>", icon:"<img src='/assets/images/icon/16/class-3.png'>",iconrole:"<img src='/assets/images/icon/16/ranged-dps.png'>", selected:false},
            {id:9, role:"ranged_dps", name: "<span class='class-9'>"+$translate.instant("CLASS_9")+"</span>", icon:"<img src='/assets/images/icon/16/class-9.png'>",iconrole:"<img src='/assets/images/icon/16/ranged-dps.png'>", selected:false},
            {id:8, role:"ranged_dps", name: "<span class='class-8'>"+$translate.instant("CLASS_8")+"</span>", icon:"<img src='/assets/images/icon/16/class-8.png'>",iconrole:"<img src='/assets/images/icon/16/ranged-dps.png'>", selected:false},
            { msGroup: false}
        ];

        $scope.days = [
            {id:'monday', name: $translate.instant("MONDAY"), selected:false},
            {id:'tuesday', name: $translate.instant("TUESDAY"), selected:false},
            {id:'wednesday', name: $translate.instant("WEDNESDAY"), selected:false},
            {id:'thursday', name: $translate.instant("THURSDAY"), selected:false},
            {id:'friday', name: $translate.instant("FRIDAY"), selected:false},
            {id:'saturday', name: $translate.instant("SATURDAY"), selected:false},
            {id:'sunday', name: $translate.instant("SUNDAY"), selected:false},
        ];

        $scope.realmZones = [
            {name: 'US', msGroup: true},
            {name:$translate.instant("US--EN_US--AMERICA--CHICAGO::LOS_ANGELES::NEW_YORK::DENVER") ,region:"us", locale:"en_US", zone:"America", cities:["Chicago","Los_Angeles","New_York","Denver"], selected:false},
            {name:$translate.instant("US--EN_US--AUSTRALIA--MELBOURNE"), region:"us", locale:"en_US", zone:"Australia", cities:["Melbourne"], selected:false},
            {name:$translate.instant("US--ES_MX--AMERICA--CHICAGO"), region:"us",  locale:"es_MX", zone:"America", cities:["Chicago"], selected:false},
            {name:$translate.instant("US--PT_BR--AMERICA--SAO_PAULO"), region:"us", locale:"pt_BR", zone:"America", cities:["Sao_Paulo"], selected:false},
            { msGroup: false},
            {name: 'EU', msGroup: true},
            {name:$translate.instant("EU--EN_GB--EUROPE--PARIS"), region:"eu", locale:"en_GB", zone:"Europe", cities:["Paris"], selected:false},
            {name:$translate.instant("EU--DE_DE--EUROPE--PARIS"), region:"eu", locale:"de_DE", zone:"Europe", cities:["Paris"],selected:false},
            {name:$translate.instant("EU--FR_FR--EUROPE--PARIS"), region:"eu", locale:"fr_FR", zone:"Europe", cities:["Paris"],selected:false},
            {name:$translate.instant("EU--ES_ES--EUROPE--PARIS"), region:"eu", locale:"es_ES", zone:"Europe", cities:["Paris"],selected:false},
            {name:$translate.instant("EU--RU_RU--EUROPE--PARIS"), region:"eu", locale:"ru_RU", zone:"Europe", cities:["Paris"],selected:false},
            {name:$translate.instant("EU--PT_BR--EUROPE--PARIS"), region:"eu", locale:"pt_BR", zone:"Europe", cities:["Paris"],selected:false},
            { msGroup: false},
            {name:$translate.instant("TW--ZH_TW--ASIA--TAIPEI"), region:"tw", locale:"zh_TW", zone:"Asia", cities:["Taipei"], selected:false},
            {name:$translate.instant("KR--KO_KR--ASIA--SEOUL"), region:"kr", locale:"ko_KR", zone:"Asia", cities:["Seoul"], selected:false}
        ];
        $scope.localLanguages = {
            selectAll       : $translate.instant("SELECT_ALL"),
            selectNone      : $translate.instant("SELECT_NONE"),
            reset           : $translate.instant("RESET"),
            search          : $translate.instant("SEARCH"),
            nothingSelected : $translate.instant("ALL_LANGUAGES")
        };

        $scope.localClasses = {
            selectAll       : $translate.instant("SELECT_ALL"),
            selectNone      : $translate.instant("SELECT_NONE"),
            reset           : $translate.instant("RESET"),
            search          : $translate.instant("SEARCH"),
            nothingSelected : $translate.instant("ALL_CLASSES")
        };
        $scope.localDays = {
            selectAll       : $translate.instant("SELECT_ALL"),
            selectNone      : $translate.instant("SELECT_NONE"),
            reset           : $translate.instant("RESET"),
            search          : $translate.instant("SEARCH"),
            nothingSelected : $translate.instant("ALL_DAYS")
        };
        $scope.localRealms = {
            selectAll       : $translate.instant("SELECT_ALL"),
            selectNone      : $translate.instant("SELECT_NONE"),
            reset           : $translate.instant("RESET"),
            search          : $translate.instant("SEARCH"),
            nothingSelected : $translate.instant("ALL_REALMS")
        };
        $scope.localRealmZones = {
            selectAll       : $translate.instant("SELECT_ALL"),
            selectNone      : $translate.instant("SELECT_NONE"),
            reset           : $translate.instant("RESET"),
            search          : $translate.instant("SEARCH"),
            nothingSelected : $translate.instant("ALL_REALMZONES")
        };


        /* if params load filters */
        if($stateParams.realm_zones){
            var realmZones = $stateParams.realm_zones.split('__');
            angular.forEach($scope.realmZones,function(realmZone){

                angular.forEach(realmZones,function(realmZoneStr){
                    var params = realmZoneStr.split('--');
                    if (params.length == 4) {
                        var realmZoneTmp = {};
                        realmZoneTmp.region = params[0];
                        realmZoneTmp.locale = params[1];
                        realmZoneTmp.zone = params[2];
                        realmZoneTmp.cities = params[3].split('::');
                        if(realmZone.region == realmZoneTmp.region && realmZone.locale == realmZoneTmp.locale && realmZone.zone == realmZoneTmp.zone && angular.equals(realmZone.cities,realmZoneTmp.cities)){
                            $scope.filters.realmZones.push(realmZoneTmp);
                            realmZone.selected = true;
                        }
                    }
                });
            });

        }

        if($stateParams.realm_name && $stateParams.realm_region){
            $scope.filters.realm.region = $stateParams.realm_region;
            $scope.filters.realm.name = $stateParams.realm_name;

            $scope.realms= [{label:$stateParams.realm_name + " (" + $stateParams.realm_region.toUpperCase() + ")",selected:true}];
        }

        angular.forEach(LANGUAGES,function(language){
            var tmplng = {id:language,name:$translate.instant("LANG_"+language.toUpperCase())};
            if($stateParams.languages &&  $stateParams.languages.split("__").indexOf(language)!=-1) {
                tmplng.selected = true;
                $scope.filters.languages.push({id:language,selected:true});
            }
            $scope.languages.push(tmplng);
        });

        if($stateParams.faction)
            $scope.filters.faction = $stateParams.faction;

        if($stateParams.classes){
            var classes = $stateParams.classes.split("__");

            angular.forEach($scope.classes,function(clas){
                console.log(clas);
                if(classes.indexOf(clas.id+'--'+clas.role)!=-1) {
                    clas.selected = true;
                    $scope.filters.classes.push({id:clas.id,role:clas.role,selected:true});
                }

            });

        }

        if($stateParams.days){
            var days = $stateParams.days.split("__");
            angular.forEach($scope.days,function(day){
                if(days.indexOf(day.id)!=-1) {
                    day.selected = true;
                    $scope.filters.days.push({id:day.id,selected:true});
                }
            });
        }
        if($stateParams.timezone) {
            $scope.filters.timezone = $stateParams.timezone;
        }

        if($stateParams.raids_per_week_active) {
            $scope.filters.raids_per_week.active = $stateParams.raids_per_week_active==="true";
        }

        if($stateParams.raids_per_week_min) {
            $scope.filters.raids_per_week.min = $stateParams.raids_per_week_min;
        }

        if($stateParams.raids_per_week_max) {
            $scope.filters.raids_per_week.max = $stateParams.raids_per_week_max;
        }


        $scope.$watch('filters.realmZones',function(){
            if($scope.$parent.loading || $scope.loading)
                return;

            var realmZones=[];
            angular.forEach($scope.filters.realmZones,function(realmZone){
                realmZones.push(realmZone.region +'--'+realmZone.locale+"--"+realmZone.zone+"--"+realmZone.cities.join('::'));
            });

            $stateParams.realm_zones = realmZones.join('__');
            $state.go($state.current,$stateParams,{reload:true});

        },true);

        $scope.$watch('filters.realm',function(){
            if($scope.$parent.loading || $scope.loading)
                return;

            $stateParams.realm_region = $scope.filters.realm.region;
            $stateParams.realm_name = $scope.filters.realm.name;

            $state.go($state.current,$stateParams,{reload:true});

        });

        $scope.$watch('filters.languages', function() {
            if($scope.$parent.loading || $scope.loading)
                return;

            var tmpLanguages = [];
            angular.forEach($scope.filters.languages,function(language){
                tmpLanguages.push(language.id);
            });
            $stateParams.languages = tmpLanguages.join('__');
            $state.go($state.current,$stateParams,{reload:true});

        });
        $scope.$watch('filters.faction', function() {
            if($scope.$parent.loading || $scope.loading)
                return;

            $stateParams.faction = $scope.filters.faction;
            $state.go($state.current,$stateParams,{reload:true});

        });

        $scope.$watch('filters.classes', function() {
            if($scope.$parent.loading || $scope.loading)
                return;

            var tmpClasses = [];
            angular.forEach($scope.filters.classes,function(clas){
                tmpClasses.push(clas.id+"--"+clas.role);
            });
            $stateParams.classes = tmpClasses.join('__');

            $state.go($state.current,$stateParams,{reload:true});

        });

        $scope.$watch('filters.days', function() {
            if($scope.$parent.loading || $scope.loading)
                return;
            var days = [];
            angular.forEach($scope.filters.days,function(day){
                days.push(day.id);
            });
            $stateParams.days = days.join('__');
            $state.go($state.current,$stateParams,{reload:true});

        });

        $scope.$watch('filters.timezone', function() {
            if($scope.$parent.loading || $scope.loading) {
                return;
            }
            $stateParams.timezone = $scope.filters.timezone;
            $state.go($state.current,$stateParams,{reload:true});
        });

        $scope.$watch('filters.raids_per_week.active', function() {
            if($scope.$parent.loading || $scope.loading) {
                return;
            }

            if($scope.filters.raids_per_week.active===false){
                $stateParams.raids_per_week_min = null;
                $stateParams.raids_per_week_max = null;
            }
            $stateParams.raids_per_week_active = $scope.filters.raids_per_week.active===true ? true : null;
            $state.go($state.current,$stateParams,{reload:true});
        });

        $scope.$watch('filters.raids_per_week.min', function() {
            if($scope.$parent.loading || $scope.loading) {
                return;
            }
            $stateParams.raids_per_week_min = $scope.filters.raids_per_week.min;
            $state.go($state.current,$stateParams,{reload:true});

        });

        $scope.$watch('filters.raids_per_week.max', function() {
            if($scope.$parent.loading || $scope.loading) {
                return;
            }
            $stateParams.raids_per_week_max = $scope.filters.raids_per_week.max;
            $state.go($state.current,$stateParams,{reload:true});

        });

        socket.emit('get:guildAds',$scope.filters);
        socket.emit('get:realms',"");


        $scope.setRealmZones = function(data){
            if(data.msGroup === true)
                angular.forEach($scope.realmZones,function(realmZone){
                    if(realmZone.region ===data.name.toLowerCase())
                        $scope.filters.realmZones.push(realmZone);

                });
            else
                $scope.filters.realmZones.push(data);
        };
        $scope.setRealm = function(data){
            $scope.filters.realm = data;
        };

        $scope.resetRealmZones = function(){
            $scope.filters.realmZones = [];
        };
        $scope.resetRealm = function(){
            $scope.filters.realm = {};
        };

        $scope.resetLanguages = function(){
            $scope.filters.languages = [];
        };

        $scope.resetClasses = function(){
            $scope.filters.classes = [];
        };
        $scope.resetDays = function(){
            $scope.filters.days = [];
        };
        $scope.resetFilters = function(){
            $state.go($state.current,null,{reload:true,inherit: false});
        };

        $scope.getMoreGuilds = function(){
            if($scope.$parent.loading || $scope.loading)
                return;

            $scope.loading = true;
            if($scope.guilds.length>0)
                $scope.filters.last = $scope.guilds[$scope.guilds.length-1].ad.updated;
            socket.emit('get:guildAds',$scope.filters);
        };

        socket.forward('get:guildAds',$scope);
        $scope.$on('socket:get:guildAds',function(ev,guilds){
            $scope.$parent.loading = false;
            $scope.loading = false;
            $scope.guilds = $scope.guilds.concat(guilds);
        });

        socket.forward('get:realms',$scope);
        $scope.$on('socket:get:realms',function(ev,realms){
            $scope.connected_realms = {};
            $scope.realms = realms;
            angular.forEach(realms,function (realm) {
                realm.label = realm.name + " (" + realm.region.toUpperCase() + ")";
                if($stateParams.realm_name && $stateParams.realm_name == realm.name &&  $stateParams.realm_region && $stateParams.realm_region==realm.region) {
                    realm.selected = true;
                }
            });

        });

    }
})();