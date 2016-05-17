angular
    .module('app.character')
    .directive('wlfgItemAudit', wlfgItemAudit);

wlfgItemAudit.$inject = ['$translate', '$stateParams', '$location'];
function wlfgItemAudit($translate) {
    var directive = {
        link: link,
        restrict: 'A',
        scope: true,
        templateUrl: 'app/character/directive/item/character.item-audit.directive.html'
    };
    return directive;

    function link(scope, element, attrs) {
        scope.$watch(attrs.wlfgItemAudit, function(items){
            /*
            $neckEnchant = array(5317, 5318, 5319, 5320, 5321);
            $backEnchant = array(5310, 5311, 5312, 5313, 5314);
            $ringEnchant = array(5324, 5325, 5326, 5327, 5328);
            $weaponEnchant = array(5336, 5384, 5335, 5334, 5330, 5337, 5275, 5276, 3366, 3367, 3368, 3370, 3595, 3847);
            */

            var neckEnchant = [5317, 5318, 5319, 5320, 5321];
            var backEnchant = [5310, 5311, 5312, 5313, 5314];
            var ringEnchant = [5324, 5325, 5326, 5327, 5328];
            var weaponEnchant = [5336, 5384, 5335, 5334, 5330, 5337, 5275, 5276, 3366, 3367, 3368, 3370, 3595, 3847];
            var gemEnchant = [127760, 127761, 127762, 127763, 127764, 127765];

            var errorCount = 0;
            var errors = [];
            if (items) {
                if (items.neck && items.neck.tooltipParams.enchant) {
                    if (neckEnchant.indexOf(items.neck.tooltipParams.enchant) == -1) {
                        errorCount++;
                        errors.push($translate.instant("LOW_NECK_ENCHANT"));
                    }
                } else {
                    errorCount++;
                    errors.push($translate.instant("NO_NECK_ENCHANT"));
                }

                if (items.back && items.back.tooltipParams.enchant) {
                    if (backEnchant.indexOf(items.back.tooltipParams.enchant) == -1) {
                        errorCount++;
                        errors.push($translate.instant("LOW_BACK_ENCHANT"));
                    }
                } else {
                    errorCount++;
                    errors.push($translate.instant("NO_BACK_ENCHANT"));
                }

                if (items.finger1 && items.finger1.tooltipParams.enchant) {
                    if (ringEnchant.indexOf(items.finger1.tooltipParams.enchant) == -1) {
                        errorCount++;
                        errors.push($translate.instant("LOW_FINGER1_ENCHANT"));
                    }
                } else {
                    errorCount++;
                    errors.push($translate.instant("NO_FINGER1_ENCHANT"));
                }

                if (items.finger2 && items.finger2.tooltipParams.enchant) {
                    if (ringEnchant.indexOf(items.finger2.tooltipParams.enchant) == -1) {
                        errorCount++;
                        errors.push($translate.instant("LOW_FINGER2_ENCHANT"));
                    }
                } else {
                    errorCount++;
                    errors.push($translate.instant("NO_FINGER2_ENCHANT"));
                }

                if (items.mainHand && items.mainHand.tooltipParams.enchant) {
                    if (weaponEnchant.indexOf(items.mainHand.tooltipParams.enchant) == -1) {
                        errorCount++;
                        errors.push($translate.instant("LOW_MAINHAND_ENCHANT"));
                    }
                } else {
                    errorCount++;
                    errors.push($translate.instant("NO_MAINHAND_ENCHANT"));
                }

                if (items.offHand && items.offHand.weaponInfo) {
                    if (items.offHand.tooltipParams.enchant) {
                        if (weaponEnchant.indexOf(items.offHand.tooltipParams.enchant) == -1) {
                            errorCount++;
                            errors.push($translate.instant("LOW_OFFHAND_ENCHANT"));
                        }
                    } else {
                        errorCount++;
                        errors.push($translate.instant("NO_OFFHAND_ENCHANT"));
                    }
                }

                angular.forEach(items, function(item, key) {
                    if (item.tooltipParams && item.tooltipParams.gem0) {
                        if (gemEnchant.indexOf(item.tooltipParams.gem0) == -1) {
                            errorCount++;
                            errors.push($translate.instant("LOW_GEM")+$translate.instant(key.toUpperCase()));
                        }
                    }
                    if (item.tooltipParams && !item.tooltipParams.gem0 && item.bonusLists && item.bonusLists.indexOf(565) != -1 ){
                        errorCount++;
                        errors.push($translate.instant("NO_GEM")+$translate.instant(key.toUpperCase()));
                    }
                });
            }

            scope.errorCount = errorCount;
            scope.errors = errors;
        }, true);
    }
}